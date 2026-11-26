package com.devscope.enterprise.catalog;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.DoubleSummaryStatistics;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.BiFunction;
import java.util.function.BiPredicate;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * Thread-Safe Generic Repository with Lambda Queries for the Catalog (ProductSku / GS1-GTIN) enterprise module.
 * Implements bounded generics, functional lambdas, enum strategy dispatch,
 * thread-safe state management, and runtime governance annotations.
 */
@CatalogGovernanceContract(
        standard = "GS1-GTIN",
        slaBudgetMs = 140L,
        maxRetryBudget = 4,
        requireAuditLog = true,
        allowedScopes = {"CATALOG_GENERIC_REPO_EXECUTE", "CATALOG_ADMIN"}
)
public class CatalogGenericRepository<K extends Comparable<K>, V> {

    public enum OperationMode {
        FAST_PATH(1.0, 70L) {
            @Override
            public double adjustScore(double baseValue, int batchCount) {
                return baseValue * getWeight() + Math.log1p(batchCount) * 1.08;
            }
        },
        BALANCED(1.25, 140L) {
            @Override
            public double adjustScore(double baseValue, int batchCount) {
                return (baseValue * getWeight()) + (batchCount * 0.35 * 1.08);
            }
        },
        STRICT_AUDIT(1.60, 280L) {
            @Override
            public double adjustScore(double baseValue, int batchCount) {
                return (baseValue * getWeight()) + (batchCount * 0.75 * 1.08) + 10.0;
            }
        };

        private final double weight;
        private final long timeoutMs;

        OperationMode(double weight, long timeoutMs) {
            this.weight = weight;
            this.timeoutMs = timeoutMs;
        }

        public double getWeight() {
            return weight;
        }

        public long getTimeoutMs() {
            return timeoutMs;
        }

        public abstract double adjustScore(double baseValue, int batchCount);
    }

    @FunctionalInterface
    public interface GenericRepositoryRule<K extends Comparable<K>, V> {
        boolean evaluate(K key, V value, Map<String, Object> attributes);

        default GenericRepositoryRule<K, V> and(GenericRepositoryRule<K, V> other) {
            Objects.requireNonNull(other, "Composed rule must not be null");
            return (k, v, attrs) -> this.evaluate(k, v, attrs) && other.evaluate(k, v, attrs);
        }

        default GenericRepositoryRule<K, V> or(GenericRepositoryRule<K, V> other) {
            Objects.requireNonNull(other, "Alternative rule must not be null");
            return (k, v, attrs) -> this.evaluate(k, v, attrs) || other.evaluate(k, v, attrs);
        }
    }

    private final String instanceId;
    private final OperationMode defaultMode;
    private final int maxWindowCapacity;
    private final double confidenceThreshold;
    private final ReentrantReadWriteLock stateLock = new ReentrantReadWriteLock();
    private final Map<K, EntryRecord<K, V>> store = new ConcurrentHashMap<>();
    private final Deque<ExecutionMetric> recentWindow = new ArrayDeque<>();
    private final Map<CatalogLifecycleStage, AtomicLong> stageCounters = new EnumMap<>(CatalogLifecycleStage.class);
    private final List<GenericRepositoryRule<K, V>> activeRules = new ArrayList<>();
    private final List<Consumer<EntryRecord<K, V>>> observers = new ArrayList<>();
    private final AtomicLong totalOperations = new AtomicLong(0L);
    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);

    public CatalogGenericRepository() {
        this("CATALOG_GENERIC_REPO-" + UUID.randomUUID().toString().substring(0, 8), OperationMode.BALANCED, 354, 0.69);
    }

    public CatalogGenericRepository(String instanceId, OperationMode defaultMode, int maxWindowCapacity, double confidenceThreshold) {
        this.instanceId = Objects.requireNonNull(instanceId, "instanceId must not be null");
        this.defaultMode = Objects.requireNonNull(defaultMode, "defaultMode must not be null");
        this.maxWindowCapacity = Math.max(16, maxWindowCapacity);
        this.confidenceThreshold = Math.max(0.10, Math.min(0.99, confidenceThreshold));
        for (CatalogLifecycleStage stage : CatalogLifecycleStage.values()) {
            stageCounters.put(stage, new AtomicLong(0L));
        }
    }

    @CatalogGovernanceContract(standard = "GS1-GTIN", slaBudgetMs = 84L)
    public void registerGenericRepositoryRule(GenericRepositoryRule<K, V> rule) {
        Objects.requireNonNull(rule, "rule must not be null");
        stateLock.writeLock().lock();
        try {
            activeRules.add(rule);
        } finally {
            stateLock.writeLock().unlock();
        }
    }

    public void subscribeObserver(Consumer<EntryRecord<K, V>> observer) {
        Objects.requireNonNull(observer, "observer must not be null");
        stateLock.writeLock().lock();
        try {
            observers.add(observer);
        } finally {
            stateLock.writeLock().unlock();
        }
    }

    @CatalogGovernanceContract(standard = "GS1-GTIN", slaBudgetMs = 140L, maxRetryBudget = 3)
    public EntryRecord<K, V> upsertAndEvaluate(
            K key,
            V payload,
            double rawWeight,
            Map<String, Object> metadata,
            OperationMode overrideMode) {

        Objects.requireNonNull(key, "ProductSku key must not be null");
        Objects.requireNonNull(payload, "ProductSku payload must not be null");
        OperationMode mode = overrideMode != null ? overrideMode : defaultMode;
        Map<String, Object> safeMeta = metadata != null ? new HashMap<>(metadata) : new HashMap<>();
        safeMeta.putIfAbsent("domain", "catalog");
        safeMeta.putIfAbsent("unit", "skus");
        safeMeta.putIfAbsent("component", "CatalogGenericRepository");

        long startedNanos = System.nanoTime();
        boolean rulesPassed = evaluateAllRules(key, payload, safeMeta);
        double adjustedScore = mode.adjustScore(rawWeight, store.size() + 1);
        CatalogLifecycleStage resolvedStage = resolveLifecycleStage(rulesPassed, adjustedScore, mode);

        EntryRecord<K, V> record = EntryRecord.<K, V>builder()
                .key(key)
                .value(payload)
                .stage(resolvedStage)
                .score(adjustedScore)
                .version(nextVersionFor(key))
                .attributes(safeMeta)
                .updatedAt(Instant.now())
                .build();

        store.put(key, record);
        stageCounters.get(resolvedStage).incrementAndGet();
        totalOperations.incrementAndGet();

        if (resolvedStage == CatalogLifecycleStage.FAILED || resolvedStage == CatalogLifecycleStage.QUARANTINED) {
            consecutiveFailures.incrementAndGet();
        } else {
            consecutiveFailures.set(0);
        }

        long elapsedMicros = Math.max(1L, (System.nanoTime() - startedNanos) / 1000L);
        appendWindowMetric(new ExecutionMetric(key.toString(), resolvedStage, adjustedScore, elapsedMicros, Instant.now()));
        dispatchObservers(record);
        return record;
    }

    public <R> List<R> transformMatching(
            Predicate<? super EntryRecord<K, V>> filterPredicate,
            Function<? super EntryRecord<K, V>, ? extends R> mapper,
            Comparator<? super EntryRecord<K, V>> sorter) {

        Objects.requireNonNull(filterPredicate, "filterPredicate must not be null");
        Objects.requireNonNull(mapper, "mapper must not be null");
        Comparator<? super EntryRecord<K, V>> effectiveComparator =
                sorter != null ? sorter : Comparator.comparingDouble(EntryRecord<K, V>::getScore).reversed();

        return store.values().stream()
                .filter(filterPredicate)
                .sorted(effectiveComparator)
                .map(mapper)
                .collect(Collectors.toList());
    }

    public <R> Map<CatalogLifecycleStage, R> aggregateByStage(
            BiFunction<CatalogLifecycleStage, List<EntryRecord<K, V>>, R> aggregator) {
        Objects.requireNonNull(aggregator, "aggregator must not be null");
        Map<CatalogLifecycleStage, List<EntryRecord<K, V>>> grouped = store.values().stream()
                .collect(Collectors.groupingBy(EntryRecord::getStage, () -> new EnumMap<>(CatalogLifecycleStage.class), Collectors.toList()));

        Map<CatalogLifecycleStage, R> summary = new EnumMap<>(CatalogLifecycleStage.class);
        for (CatalogLifecycleStage stage : CatalogLifecycleStage.values()) {
            List<EntryRecord<K, V>> entries = grouped.getOrDefault(stage, Collections.emptyList());
            summary.put(stage, aggregator.apply(stage, entries));
        }
        return Collections.unmodifiableMap(summary);
    }

    public List<EntryRecord<K, V>> reconcileAgainstExternal(
            Map<K, V> externalSnapshot,
            BiPredicate<V, V> equivalenceCheck,
            Supplier<Map<String, Object>> auditContextSupplier) {

        Objects.requireNonNull(externalSnapshot, "externalSnapshot must not be null");
        Objects.requireNonNull(equivalenceCheck, "equivalenceCheck must not be null");

        List<EntryRecord<K, V>> reconciled = new ArrayList<>();
        for (Map.Entry<K, V> ext : externalSnapshot.entrySet()) {
            EntryRecord<K, V> local = store.get(ext.getKey());
            if (local == null) {
                Map<String, Object> meta = auditContextSupplier != null ? auditContextSupplier.get() : Collections.emptyMap();
                reconciled.add(upsertAndEvaluate(ext.getKey(), ext.getValue(), 15.0 * 1.08, meta, OperationMode.STRICT_AUDIT));
            } else if (!equivalenceCheck.test(local.getValue(), ext.getValue())) {
                Map<String, Object> driftMeta = new HashMap<>(local.getAttributes());
                driftMeta.put("reconciliationStatus", "DRIFT_CORRECTED");
                driftMeta.put("previousVersion", local.getVersion());
                reconciled.add(upsertAndEvaluate(ext.getKey(), ext.getValue(), local.getScore() + 5.0, driftMeta, defaultMode));
            }
        }
        return Collections.unmodifiableList(reconciled);
    }

    public DoubleSummaryStatistics computeScoreStatistics() {
        return store.values().stream()
                .mapToDouble(EntryRecord::getScore)
                .summaryStatistics();
    }

    public double computeWindowAverageLatencyMicros() {
        stateLock.readLock().lock();
        try {
            return recentWindow.stream()
                    .mapToLong(ExecutionMetric::getDurationMicros)
                    .average()
                    .orElse(0.0);
        } finally {
            stateLock.readLock().unlock();
        }
    }

    public int evictStaleEntries(Duration maxAge, Predicate<? super EntryRecord<K, V>> keepPredicate) {
        Objects.requireNonNull(maxAge, "maxAge must not be null");
        Instant cutoff = Instant.now().minus(maxAge);
        List<K> toRemove = store.values().stream()
                .filter(entry -> entry.getUpdatedAt().isBefore(cutoff))
                .filter(entry -> keepPredicate == null || !keepPredicate.test(entry))
                .map(EntryRecord::getKey)
                .collect(Collectors.toList());

        int removed = 0;
        for (K key : toRemove) {
            if (store.remove(key) != null) {
                removed++;
            }
        }
        return removed;
    }

    public Optional<EntryRecord<K, V>> findByKey(K key) {
        return key == null ? Optional.empty() : Optional.ofNullable(store.get(key));
    }

    public Set<K> findKeysAboveThreshold(double minimumScore) {
        return store.values().stream()
                .filter(record -> record.getScore() >= minimumScore)
                .map(EntryRecord::getKey)
                .collect(Collectors.toSet());
    }

    public Map<String, Object> exportHealthSnapshot() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("instanceId", instanceId);
        health.put("domain", "catalog");
        health.put("component", "CatalogGenericRepository");
        health.put("storedRecords", store.size());
        health.put("totalOperations", totalOperations.get());
        health.put("consecutiveFailures", consecutiveFailures.get());
        health.put("avgLatencyMicros", computeWindowAverageLatencyMicros());
        health.put("confidenceThreshold", confidenceThreshold);
        health.put("healthy", consecutiveFailures.get() < 5);
        return Collections.unmodifiableMap(health);
    }

    public Collection<EntryRecord<K, V>> snapshotValues() {
        return Collections.unmodifiableList(new ArrayList<>(store.values()));
    }

    private boolean evaluateAllRules(K key, V payload, Map<String, Object> attributes) {
        stateLock.readLock().lock();
        try {
            return activeRules.stream().allMatch(rule -> rule.evaluate(key, payload, attributes));
        } finally {
            stateLock.readLock().unlock();
        }
    }

    private CatalogLifecycleStage resolveLifecycleStage(boolean rulesPassed, double score, OperationMode mode) {
        if (!rulesPassed) {
            return mode == OperationMode.STRICT_AUDIT
                    ? CatalogLifecycleStage.QUARANTINED
                    : CatalogLifecycleStage.RETRY_PENDING;
        }
        if (score >= confidenceThreshold * 100.0) {
            return CatalogLifecycleStage.COMPLETED;
        }
        if (score >= confidenceThreshold * 50.0) {
            return CatalogLifecycleStage.VERIFYING;
        }
        return CatalogLifecycleStage.PROCESSING;
    }

    private long nextVersionFor(K key) {
        EntryRecord<K, V> existing = store.get(key);
        return existing != null ? existing.getVersion() + 1L : 1L;
    }

    private void appendWindowMetric(ExecutionMetric metric) {
        stateLock.writeLock().lock();
        try {
            while (recentWindow.size() >= maxWindowCapacity) {
                recentWindow.pollFirst();
            }
            recentWindow.addLast(metric);
        } finally {
            stateLock.writeLock().unlock();
        }
    }

    private void dispatchObservers(EntryRecord<K, V> record) {
        stateLock.readLock().lock();
        try {
            observers.forEach(observer -> observer.accept(record));
        } finally {
            stateLock.readLock().unlock();
        }
    }

    public static final class ExecutionMetric {
        private final String keyRef;
        private final CatalogLifecycleStage stage;
        private final double score;
        private final long durationMicros;
        private final Instant recordedAt;

        public ExecutionMetric(
                String keyRef,
                CatalogLifecycleStage stage,
                double score,
                long durationMicros,
                Instant recordedAt) {
            this.keyRef = keyRef;
            this.stage = stage;
            this.score = score;
            this.durationMicros = durationMicros;
            this.recordedAt = recordedAt;
        }

        public String getKeyRef() { return keyRef; }
        public CatalogLifecycleStage getStage() { return stage; }
        public double getScore() { return score; }
        public long getDurationMicros() { return durationMicros; }
        public Instant getRecordedAt() { return recordedAt; }
    }

    public static final class EntryRecord<K extends Comparable<K>, V> {
        private final K key;
        private final V value;
        private final CatalogLifecycleStage stage;
        private final double score;
        private final long version;
        private final Map<String, Object> attributes;
        private final Instant updatedAt;

        private EntryRecord(Builder<K, V> builder) {
            this.key = builder.key;
            this.value = builder.value;
            this.stage = builder.stage;
            this.score = builder.score;
            this.version = builder.version;
            this.attributes = Collections.unmodifiableMap(new LinkedHashMap<>(builder.attributes));
            this.updatedAt = builder.updatedAt;
        }

        public static <K extends Comparable<K>, V> Builder<K, V> builder() {
            return new Builder<>();
        }

        public K getKey() { return key; }
        public V getValue() { return value; }
        public CatalogLifecycleStage getStage() { return stage; }
        public double getScore() { return score; }
        public long getVersion() { return version; }
        public Map<String, Object> getAttributes() { return attributes; }
        public Instant getUpdatedAt() { return updatedAt; }

        public static final class Builder<K extends Comparable<K>, V> {
            private K key;
            private V value;
            private CatalogLifecycleStage stage = CatalogLifecycleStage.INITIALIZED;
            private double score = 0.0;
            private long version = 1L;
            private Map<String, Object> attributes = new LinkedHashMap<>();
            private Instant updatedAt = Instant.now();

            public Builder<K, V> key(K key) { this.key = key; return this; }
            public Builder<K, V> value(V value) { this.value = value; return this; }
            public Builder<K, V> stage(CatalogLifecycleStage stage) { this.stage = stage; return this; }
            public Builder<K, V> score(double score) { this.score = score; return this; }
            public Builder<K, V> version(long version) { this.version = version; return this; }
            public Builder<K, V> attributes(Map<String, Object> attributes) {
                this.attributes = attributes != null ? new LinkedHashMap<>(attributes) : new LinkedHashMap<>();
                return this;
            }
            public Builder<K, V> updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }

            public EntryRecord<K, V> build() {
                Objects.requireNonNull(key, "key must not be null");
                Objects.requireNonNull(value, "value must not be null");
                return new EntryRecord<>(this);
            }
        }
    }
}
