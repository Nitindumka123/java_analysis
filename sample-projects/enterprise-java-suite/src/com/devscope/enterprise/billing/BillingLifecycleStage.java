package com.devscope.enterprise.billing;

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
 * and cost multipliers for InvoiceLedger workflows in Billing.
 */
public enum BillingLifecycleStage {
    INITIALIZED("INIT", 10, Duration.ofMillis(220), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(VALIDATED, QUARANTINED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.25 + 5.0) * urgencyMultiplier * 1.25;
        }
    },
    VALIDATED("VAL", 25, Duration.ofMillis(440), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(ENRICHED, PROCESSING, QUARANTINED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.45 + 12.0) * urgencyMultiplier * 1.25;
        }
    },
    ENRICHED("ENR", 40, Duration.ofMillis(660), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, DEFERRED, CANCELLED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.65 + 18.0) * urgencyMultiplier * 1.25;
        }
    },
    PROCESSING("PROC", 65, Duration.ofMillis(1100), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(VERIFYING, RETRY_PENDING, FAILED, COMPLETED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 1.15 + 30.0) * urgencyMultiplier * 1.25;
        }
    },
    VERIFYING("VER", 85, Duration.ofMillis(440), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(COMPLETED, RETRY_PENDING, QUARANTINED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.55 + 14.0) * urgencyMultiplier * 1.25;
        }
    },
    DEFERRED("DEF", 45, Duration.ofSeconds(30), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, CANCELLED, EXPIRED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return Math.max(4.0, payloadSize * 0.20 * urgencyMultiplier);
        }
    },
    RETRY_PENDING("RET", 55, Duration.ofSeconds(10), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(PROCESSING, QUARANTINED, FAILED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.90 + 25.0) * urgencyMultiplier * 1.25;
        }
    },
    QUARANTINED("QUAR", 70, Duration.ofMinutes(5), false) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(VALIDATED, CANCELLED, FAILED);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return (payloadSize * 0.80 + 40.0) * urgencyMultiplier;
        }
    },
    COMPLETED("DONE", 100, Duration.ZERO, true) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(BillingLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    },
    FAILED("FAIL", 100, Duration.ZERO, true) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.of(RETRY_PENDING);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 5.0 * 1.25;
        }
    },
    CANCELLED("CANC", 100, Duration.ZERO, true) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(BillingLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    },
    EXPIRED("EXP", 100, Duration.ZERO, true) {
        @Override
        public Set<BillingLifecycleStage> allowedNextStages() {
            return EnumSet.noneOf(BillingLifecycleStage.class);
        }

        @Override
        public double estimateProcessingWeight(int payloadSize, double urgencyMultiplier) {
            return 0.0;
        }
    };

    private static final Map<String, BillingLifecycleStage> BY_CODE = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(BillingLifecycleStage::getShortCode, Function.identity()));

    private final String shortCode;
    private final int progressPercent;
    private final Duration maxDwellDuration;
    private final boolean terminal;

    BillingLifecycleStage(String shortCode, int progressPercent, Duration maxDwellDuration, boolean terminal) {
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

    public boolean canTransitionTo(BillingLifecycleStage candidate) {
        return candidate != null && allowedNextStages().contains(candidate);
    }

    public abstract Set<BillingLifecycleStage> allowedNextStages();

    public abstract double estimateProcessingWeight(int payloadSize, double urgencyMultiplier);

    public static Optional<BillingLifecycleStage> fromShortCode(String code) {
        if (code == null || code.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(BY_CODE.get(code.trim().toUpperCase()));
    }

    public static List<BillingLifecycleStage> filterStages(Predicate<BillingLifecycleStage> predicate) {
        return Arrays.stream(values())
                .filter(predicate)
                .sorted(Comparator.comparingInt(BillingLifecycleStage::getProgressPercent))
                .collect(Collectors.toList());
    }

    public static Map<BillingLifecycleStage, Set<BillingLifecycleStage>> exportTransitionMatrix() {
        Map<BillingLifecycleStage, Set<BillingLifecycleStage>> matrix = new EnumMap<>(BillingLifecycleStage.class);
        for (BillingLifecycleStage stage : values()) {
            matrix.put(stage, Collections.unmodifiableSet(stage.allowedNextStages()));
        }
        return Collections.unmodifiableMap(matrix);
    }
}
