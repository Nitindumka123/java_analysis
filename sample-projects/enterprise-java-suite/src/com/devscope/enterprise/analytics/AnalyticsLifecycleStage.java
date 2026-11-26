package com.devscope.enterprise.analytics;

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
 * and cost multipliers for MetricEvent workflows in Analytics.
 */
public enum AnalyticsLifecycleStage {
    INITIALIZED("INIT", 10, Duration.ofMillis(180), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(VALIDATED, QUARANTINED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.25 + 5.0) * urgencyMultiplier * 1.15;
        }
    },
    VALIDATED("VAL", 25, Duration.ofMillis(360), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(ENRICHED, PROCESSING, QUARANTINED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.45 + 12.0) * urgencyMultiplier * 1.15;
        }
    },
    ENRICHED("ENR", 40, Duration.ofMillis(540), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, DEFERRED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.65 + 18.0) * urgencyMultiplier * 1.15;
        }
    },
    PROCESSING("PROC", 65, Duration.ofMillis(900), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(VERIFYING, RETRY_PENDING, FAILED, COMPLETED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 1.15 + 30.0) * urgencyMultiplier * 1.15;
        }
    },
    VERIFYING("VER", 85, Duration.ofMillis(360), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(COMPLETED, RETRY_PENDING, QUARANTINED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.55 + 14.0) * urgencyMultiplier * 1.15;
        }
    },
    DEFERRED("DEF", 45, Duration.ofSeconds(30), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, CANCELLED, EXPIRED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return Math.max(4.0, payloadSize * 0.20 * urgencyMultiplier);
        }
    },
    RETRY_PENDING("RET", 55, Duration.ofSeconds(10), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, QUARANTINED, FAILED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.90 + 25.0) * urgencyMultiplier * 1.15;
        }
    },
    QUARANTINED("QUAR", 70, Duration.ofMinutes(5), false) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(VALIDATED, CANCELLED, FAILED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.80 + 40.0) * urgencyMultiplier;
        }
    },
    COMPLETED("DONE", 100, Duration.ZERO, true) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(AnalyticsLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    },
    FAILED("FAIL", 100, Duration.ZERO, true) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.of(RETRY_PENDING);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 5.0 * 1.15;
        }
    },
    CANCELLED("CANC", 100, Duration.ZERO, true) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(AnalyticsLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    },
    EXPIRED("EXP", 100, Duration.ZERO, true) {
        @Override
        public Set<AnalyticsLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(AnalyticsLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    };

    private static final Map<String, AnalyticsLifecycleStage> BY_CODE = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(AnalyticsLifecycleStage::getShortCode, Function.identity()));

    private final String shortCode;
    private final int progressPercent;
    private final Duration maxDwellDuration;
    private final boolean terminal;

    AnalyticsLifecycleStage(String shortCode, int progressPercent, Duration maxDwellDuration, boolean terminal) {
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

    public boolean canTransitionTo(AnalyticsLifecycleStage candidate) {
        return candidate != null && allowedNextStages().contains(candidate);
    }

    public abstract Set<AnalyticsLifecycleStage> allowedNextStages();

    public abstract double estimateProcessingWeight(int payloadSize, double urgencyMultiplier);

    public static Optional<AnalyticsLifecycleStage> fromShortCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(BY_CODE.get(code.trim().toUpperCase()));
    }

    public static List<AnalyticsLifecycleStage> filterStages(Predicate<AnalyticsLifecycleStage> predicate) {
        return Arrays.stream(values())
                .filter(predicate)
                .sorted(Comparator.comparingInt(AnalyticsLifecycleStage::getProgressPercent))
                .collect(Collectors.toList());
    }

    public static Map<AnalyticsLifecycleStage, Set<AnalyticsLifecycleStage>> exportTransitionMatrix() {
        Map<AnalyticsLifecycleStage, Set<AnalyticsLifecycleStage>> matrix = new EnumMap<>(AnalyticsLifecycleStage.class);
        for (AnalyticsLifecycleStage stage : values()) {
            matrix.put(stage, Collections.unmodifiableSet(stage.allowedNextStages()));
        }
        return Collections.unmodifiableMap(matrix);
    }
}
