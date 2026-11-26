package com.devscope.advanced;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
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
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * Custom runtime annotation documenting SLA budgets, audit compliance,
 * and retry contracts across enterprise workflow components.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.FIELD})
@interface WorkflowContract {
    String domain() default "CORE_ORCHESTRATION";
    int maxRetries() default 3;
    long slaBudgetMs() default 250L;
    boolean auditRequired() default true;
    String[] requiredRoles() default {"OPERATOR"};
}

/**
 * Rich domain enum combining fields, constructors, abstract strategy methods,
 * and stream-based reverse lookup.
 */
enum ExecutionPriority {
    CRITICAL(100, 1.85, Duration.ofMillis(50)) {
        @Override
        public double computeWeightedScore(double rawImpact, int retryAttempt) {
            double escalationFactor = 1.0 + (retryAttempt * 0.25);
            return rawImpact * getWeightMultiplier() * escalationFactor;
        }

        @Override
        public boolean allowsDeferral() {
            return false;
        }
    },
    HIGH(75, 1.40, Duration.ofMillis(150)) {
        @Override
        public double computeWeightedScore(double rawImpact, int retryAttempt) {
            return (rawImpact * getWeightMultiplier()) + (retryAttempt * 12.5);
        }

        @Override
        public boolean allowsDeferral() {
            return false;
        }
    },
    STANDARD(50, 1.00, Duration.ofMillis(500)) {
        @Override
        public double computeWeightedScore(double rawImpact, int retryAttempt) {
            return Math.max(10.0, rawImpact * getWeightMultiplier() - (retryAttempt * 2.0));
        }

        @Override
        public boolean allowsDeferral() {
            return true;
        }
    },
    BACKGROUND(20, 0.65, Duration.ofSeconds(3)) {
        @Override
        public double computeWeightedScore(double rawImpact, int retryAttempt) {
            return rawImpact * getWeightMultiplier() / (1.0 + retryAttempt * 0.1);
        }

        @Override
        public boolean allowsDeferral() {
            return true;
        }
    };

    private final int rank;
    private final double weightMultiplier;
    private final Duration slaWindow;

    ExecutionPriority(int rank, double weightMultiplier, Duration slaWindow) {
        this.rank = rank;
        this.weightMultiplier = weightMultiplier;
        this.slaWindow = slaWindow;
    }

    public int getRank() {
        return rank;
    }

    public double getWeightMultiplier() {
        return weightMultiplier;
    }

    public Duration getSlaWindow() {
        return slaWindow;
    }

    public abstract double computeWeightedScore(double rawImpact, int retryAttempt);

    public abstract boolean allowsDeferral();

    public static Optional<ExecutionPriority> fromRank(int targetRank) {
        return List.of(values()).stream()
                .filter(tier -> tier.rank == targetRank)
                .findFirst();
    }
}

/**
 * Functional transformation contract supporting fluent lambda composition.
 */
@FunctionalInterface
interface StageTransformer<I, O> {
    O applyStage(I input, Map<String, Object> executionContext) throws WorkflowExecutionException;

    default <V> StageTransformer<I, V> andThen(StageTransformer<? super O, ? extends V> after) {
        Objects.requireNonNull(after, "Downstream stage transformer must not be null");
        return (input, ctx) -> after.applyStage(this.applyStage(input, ctx), ctx);
    }
}

/**
 * Checked domain exception carrying structured execution diagnostics.
 */
class WorkflowExecutionException extends Exception {
    private final String correlationId;
    private final String failedStage;
    private final boolean retryable;

    public WorkflowExecutionException(String correlationId, String failedStage, String message, boolean retryable) {
        super(message);
        this.correlationId = correlationId;
        this.failedStage = failedStage;
        this.retryable = retryable;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public String getFailedStage() {
        return failedStage;
    }

    public boolean isRetryable() {
        return retryable;
    }
}

/**
 * Enterprise generic workflow engine exercising Lambdas, Method References,
 * Bounded Generics, Wildcards, Rich Enums, Custom Annotations, Streams,
 * Thread-Safe Locking, and Immutable Builder Snapshots.
 */
@WorkflowContract(
        domain = "ENTERPRISE_WORKFLOW_CORE",
        maxRetries = 4,
        slaBudgetMs = 300L,
        auditRequired = true,
        requiredRoles = {"ARCHITECT", "PLATFORM_ADMIN"}
)
public class EnterpriseWorkflowEngine<T extends Comparable<T>, R> {

    @WorkflowContract(domain = "TELEMETRY_COUNTER", auditRequired = false)
    private final AtomicLong processedCount = new AtomicLong(0L);
    private final AtomicLong failedCount = new AtomicLong(0L);
    private final ReentrantReadWriteLock registryLock = new ReentrantReadWriteLock();
    private final Map<String, WorkflowTask<T>> activeTasks = new ConcurrentHashMap<>();
    private final Map<ExecutionPriority, List<ExecutionReceipt<R>>> receiptsByPriority = new EnumMap<>(ExecutionPriority.class);
    private final List<Predicate<? super WorkflowTask<T>>> admissionGuards = new ArrayList<>();
    private final List<Consumer<? super ExecutionReceipt<R>>> completionListeners = new ArrayList<>();
    private final String engineId;

    public EnterpriseWorkflowEngine(String engineId) {
        this.engineId = Objects.requireNonNull(engineId, "engineId must not be null");
        for (ExecutionPriority priority : ExecutionPriority.values()) {
            receiptsByPriority.put(priority, Collections.synchronizedList(new ArrayList<>()));
        }
    }

    @WorkflowContract(domain = "ADMISSION_CONTROL", slaBudgetMs = 25L)
    public void registerGuard(Predicate<? super WorkflowTask<T>> guard) {
        Objects.requireNonNull(guard, "guard predicate must not be null");
        registryLock.writeLock().lock();
        try {
            admissionGuards.add(guard);
        } finally {
            registryLock.writeLock().unlock();
        }
    }

    public void registerCompletionListener(Consumer<? super ExecutionReceipt<R>> listener) {
        Objects.requireNonNull(listener, "completion listener must not be null");
        registryLock.writeLock().lock();
        try {
            completionListeners.add(listener);
        } finally {
            registryLock.writeLock().unlock();
        }
    }

    public void enqueueBatch(List<? extends WorkflowTask<T>> incomingTasks) {
        Objects.requireNonNull(incomingTasks, "incomingTasks must not be null");
        incomingTasks.stream()
                .filter(Objects::nonNull)
                .filter(task -> task.getPayload() != null)
                .forEach(task -> activeTasks.put(task.getTaskId(), task));
    }

    @WorkflowContract(domain = "PIPELINE_EXECUTION", maxRetries = 3, slaBudgetMs = 200L)
    public List<ExecutionReceipt<R>> executePrioritizedQueue(
            StageTransformer<T, R> pipeline,
            Supplier<Map<String, Object>> contextFactory,
            BiFunction<WorkflowTask<T>, Throwable, R> fallbackResolver) {

        Objects.requireNonNull(pipeline, "pipeline transformer must not be null");
        Objects.requireNonNull(contextFactory, "contextFactory must not be null");

        List<WorkflowTask<T>> sortedQueue = activeTasks.values().stream()
                .sorted(Comparator
                        .comparingInt((WorkflowTask<T> task) -> task.getPriority().getRank())
                        .reversed()
                        .thenComparing(WorkflowTask::getPayload))
                .collect(Collectors.toList());

        List<ExecutionReceipt<R>> batchReceipts = new ArrayList<>(sortedQueue.size());
        for (WorkflowTask<T> task : sortedQueue) {
            if (!passesAllGuards(task)) {
                ExecutionReceipt<R> rejected = ExecutionReceipt.<R>builder()
                        .taskId(task.getTaskId())
                        .priority(task.getPriority())
                        .succeeded(false)
                        .weightedScore(0.0)
                        .diagnostic("Rejected by admission control predicate")
                        .completedAt(Instant.now())
                        .build();
                batchReceipts.add(rejected);
                continue;
            }

            ExecutionReceipt<R> receipt = executeSingleWithRetry(task, pipeline, contextFactory, fallbackResolver);
            batchReceipts.add(receipt);
            receiptsByPriority.get(task.getPriority()).add(receipt);
            notifyListeners(receipt);
            activeTasks.remove(task.getTaskId());
        }
        return Collections.unmodifiableList(batchReceipts);
    }

    private boolean passesAllGuards(WorkflowTask<T> task) {
        registryLock.readLock().lock();
        try {
            return admissionGuards.stream().allMatch(guard -> guard.test(task));
        } finally {
            registryLock.readLock().unlock();
        }
    }

    private ExecutionReceipt<R> executeSingleWithRetry(
            WorkflowTask<T> task,
            StageTransformer<T, R> pipeline,
            Supplier<Map<String, Object>> contextFactory,
            BiFunction<WorkflowTask<T>, Throwable, R> fallbackResolver) {

        int maxAttempts = task.getPriority().allowsDeferral() ? 2 : 4;
        Throwable lastFailure = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            Map<String, Object> ctx = new HashMap<>(contextFactory.get());
            ctx.put("engineId", engineId);
            ctx.put("attempt", attempt);
            ctx.put("priority", task.getPriority().name());
            try {
                R output = pipeline.applyStage(task.getPayload(), ctx);
                double score = task.getPriority().computeWeightedScore(task.getImpactFactor(), attempt - 1);
                processedCount.incrementAndGet();
                return ExecutionReceipt.<R>builder()
                        .taskId(task.getTaskId())
                        .priority(task.getPriority())
                        .output(output)
                        .succeeded(true)
                        .weightedScore(score)
                        .attempts(attempt)
                        .diagnostic("Completed within SLA window " + task.getPriority().getSlaWindow().toMillis() + "ms")
                        .completedAt(Instant.now())
                        .build();
            } catch (WorkflowExecutionException ex) {
                lastFailure = ex;
                if (!ex.isRetryable()) {
                    break;
                }
            } catch (RuntimeException ex) {
                lastFailure = ex;
            }
        }

        failedCount.incrementAndGet();
        R fallbackValue = fallbackResolver != null ? fallbackResolver.apply(task, lastFailure) : null;
        return ExecutionReceipt.<R>builder()
                .taskId(task.getTaskId())
                .priority(task.getPriority())
                .output(fallbackValue)
                .succeeded(false)
                .weightedScore(0.0)
                .attempts(maxAttempts)
                .diagnostic(lastFailure != null ? lastFailure.getMessage() : "Unknown pipeline error")
                .completedAt(Instant.now())
                .build();
    }

    private void notifyListeners(ExecutionReceipt<R> receipt) {
        registryLock.readLock().lock();
        try {
            completionListeners.forEach(listener -> listener.accept(receipt));
        } finally {
            registryLock.readLock().unlock();
        }
    }

    public <K> Map<K, DoubleSummaryStatistics> summarizeScoresByClassifier(
            Function<? super ExecutionReceipt<R>, K> classifier) {
        Objects.requireNonNull(classifier, "classifier function must not be null");
        return receiptsByPriority.values().stream()
                .flatMap(List::stream)
                .filter(ExecutionReceipt::isSucceeded)
                .collect(Collectors.groupingBy(
                        classifier,
                        LinkedHashMap::new,
                        Collectors.summarizingDouble(ExecutionReceipt::getWeightedScore)));
    }

    public Map<ExecutionPriority, Long> countFailuresByPriority() {
        return receiptsByPriority.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream().filter(r -> !r.isSucceeded()).count()));
    }

    public Set<String> findHighImpactTaskIds(double minScoreThreshold) {
        return receiptsByPriority.values().stream()
                .flatMap(List::stream)
                .filter(receipt -> receipt.isSucceeded() && receipt.getWeightedScore() >= minScoreThreshold)
                .map(ExecutionReceipt::getTaskId)
                .collect(Collectors.toSet());
    }

    public long getProcessedCount() {
        return processedCount.get();
    }

    public long getFailedCount() {
        return failedCount.get();
    }

    public static final class WorkflowTask<T extends Comparable<T>> {
        private final String taskId;
        private final T payload;
        private final ExecutionPriority priority;
        private final double impactFactor;
        private final Instant createdAt;

        public WorkflowTask(String taskId, T payload, ExecutionPriority priority, double impactFactor) {
            this.taskId = taskId == null || taskId.isBlank() ? UUID.randomUUID().toString() : taskId;
            this.payload = Objects.requireNonNull(payload, "payload must not be null");
            this.priority = Objects.requireNonNull(priority, "priority must not be null");
            this.impactFactor = Math.max(0.1, impactFactor);
            this.createdAt = Instant.now();
        }

        public String getTaskId() {
            return taskId;
        }

        public T getPayload() {
            return payload;
        }

        public ExecutionPriority getPriority() {
            return priority;
        }

        public double getImpactFactor() {
            return impactFactor;
        }

        public Instant getCreatedAt() {
            return createdAt;
        }
    }

    public static final class ExecutionReceipt<R> {
        private final String taskId;
        private final ExecutionPriority priority;
        private final R output;
        private final boolean succeeded;
        private final double weightedScore;
        private final int attempts;
        private final String diagnostic;
        private final Instant completedAt;

        private ExecutionReceipt(Builder<R> builder) {
            this.taskId = builder.taskId;
            this.priority = builder.priority;
            this.output = builder.output;
            this.succeeded = builder.succeeded;
            this.weightedScore = builder.weightedScore;
            this.attempts = builder.attempts;
            this.diagnostic = builder.diagnostic;
            this.completedAt = builder.completedAt;
        }

        public static <R> Builder<R> builder() {
            return new Builder<>();
        }

        public String getTaskId() {
            return taskId;
        }

        public ExecutionPriority getPriority() {
            return priority;
        }

        public Optional<R> getOutput() {
            return Optional.ofNullable(output);
        }

        public boolean isSucceeded() {
            return succeeded;
        }

        public double getWeightedScore() {
            return weightedScore;
        }

        public int getAttempts() {
            return attempts;
        }

        public String getDiagnostic() {
            return diagnostic;
        }

        public Instant getCompletedAt() {
            return completedAt;
        }

        public static final class Builder<R> {
            private String taskId;
            private ExecutionPriority priority = ExecutionPriority.STANDARD;
            private R output;
            private boolean succeeded;
            private double weightedScore;
            private int attempts = 1;
            private String diagnostic = "";
            private Instant completedAt = Instant.now();

            public Builder<R> taskId(String taskId) {
                this.taskId = taskId;
                return this;
            }

            public Builder<R> priority(ExecutionPriority priority) {
                this.priority = priority;
                return this;
            }

            public Builder<R> output(R output) {
                this.output = output;
                return this;
            }

            public Builder<R> succeeded(boolean succeeded) {
                this.succeeded = succeeded;
                return this;
            }

            public Builder<R> weightedScore(double weightedScore) {
                this.weightedScore = weightedScore;
                return this;
            }

            public Builder<R> attempts(int attempts) {
                this.attempts = attempts;
                return this;
            }

            public Builder<R> diagnostic(String diagnostic) {
                this.diagnostic = diagnostic;
                return this;
            }

            public Builder<R> completedAt(Instant completedAt) {
                this.completedAt = completedAt;
                return this;
            }

            public ExecutionReceipt<R> build() {
                return new ExecutionReceipt<>(this);
            }
        }
    }
}
