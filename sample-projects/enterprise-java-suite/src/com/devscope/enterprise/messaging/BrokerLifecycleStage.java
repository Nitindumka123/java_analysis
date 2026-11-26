package com.devscope.enterprise.messaging;

import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Rich lifecycle enum modeling valid transitions, timeout windows,
 * and cost multipliers for QueueMessage workflows in Broker.
 */
public enum BrokerLifecycleStage {
    INITIALIZED("INIT", 10, Duration.ofMillis(35), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(VALIDATED, QUARANTINED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.25 + 5.0) * urgencyMultiplier * 1.38;
        }
    },
    VALIDATED("VAL", 25, Duration.ofMillis(70), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(ENRICHED, PROCESSING, QUARANTINED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.45 + 12.0) * urgencyMultiplier * 1.38;
        }
    },
    ENRICHED("ENR", 40, Duration.ofMillis(105), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, DEFERRED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.65 + 18.0) * urgencyMultiplier * 1.38;
        }
    },
    PROCESSING("PROC", 65, Duration.ofMillis(175), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(VERIFYING, RETRY_PENDING, FAILED, COMPLETED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 1.15 + 30.0) * urgencyMultiplier * 1.38;
        }
    },
    VERIFYING("VER", 85, Duration.ofMillis(70), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(COMPLETED, RETRY_PENDING, QUARANTINED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.55 + 14.0) * urgencyMultiplier * 1.38;
        }
    },
    DEFERRED("DEF", 45, Duration.ofSeconds(30), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, CANCELLED, EXPIRED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return Math.max(4.0, payloadSize * 0.20 * urgencyMultiplier);
        }
    },
    RETRY_PENDING("RET", 55, Duration.ofSeconds(10), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, QUARANTINED, FAILED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.90 + 25.0) * urgencyMultiplier * 1.38;
        }
    },
    QUARANTINED("QUAR", 70, Duration.ofMinutes(5), false) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(VALIDATED, CANCELLED, FAILED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.80 + 40.0) * urgencyMultiplier;
        }
    },
    COMPLETED("DONE", 100, Duration.ZERO, true) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(BrokerLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    },
    FAILED("FAIL", 100, Duration.ZERO, true) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.of(RETRY_PENDING);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 5.0 * 1.38;
        }
    },
    CANCELLED("CANC", 100, Duration.ZERO, true) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(BrokerLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    },
    EXPIRED("EXP", 100, Duration.ZERO, true) {
        @Override
        public Set<BrokerLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(BrokerLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    };

    private static final Map<String, BrokerLifecycleStage> BY_CODE = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(BrokerLifecycleStage::getShortCode, Function.identity()));

    private final String shortCode;
    private final int progressPercent;
    private final Duration maxDwellDuration;
    private final boolean terminal;

    BrokerLifecycleStage(String shortCode, int progressPercent, Duration maxDwellDuration, boolean terminal) {
        this.shortCode = shortCode;
        this.progressPercent = progressPercent;
        this.maxDwellDuration = maxDwellDuration;
        this.terminal = terminal;
    }

    public String getShortCode() {
        return shortCode;
    }

    public int getProgressPercent() {
        return progressPercent;
    }

    public Duration getMaxDwellDuration() {
        return maxDwellDuration;
    }

    public boolean isTerminal() {
        return terminal;
    }

    public boolean canTransitionTo(BrokerLifecycleStage candidate) {
        return candidate != null && allowedNextStages().contains(candidate);
    }

    public abstract Set<BrokerLifecycleStage> allowedNextStages();

    public abstract double estimateProcessingWeight(int payloadSize, double urgencyMultiplier);

    public static Optional<BrokerLifecycleStage> fromShortCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(BY_CODE.get(code.trim().toUpperCase()));
    }

    public static List<BrokerLifecycleStage> filterStages(Predicate<BrokerLifecycleStage> predicate) {
        return Arrays.stream(values())
                .filter(predicate)
                .sorted(Comparator.comparingInt(BrokerLifecycleStage::getProgressPercent))
                .collect(Collectors.toList());
    }

    public static Map<BrokerLifecycleStage, Set<BrokerLifecycleStage>> exportTransitionMatrix() {
        Map<BrokerLifecycleStage, Set<BrokerLifecycleStage>> matrix = new EnumMap<>(BrokerLifecycleStage.class);
        for (BrokerLifecycleStage stage : values()) {
            matrix.put(stage, Collections.unmodifiableSet(stage.allowedNextStages()));
        }
        return Collections.unmodifiableMap(matrix);
    }
}
