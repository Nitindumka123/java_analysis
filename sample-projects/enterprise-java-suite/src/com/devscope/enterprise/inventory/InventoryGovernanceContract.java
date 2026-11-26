package com.devscope.enterprise.inventory;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Runtime contract annotation and reflective compliance evaluator for the Inventory (WMS-PRO) domain.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD, ElementType.FIELD})
public @interface InventoryGovernanceContract {
    String standard() default "WMS-PRO";
    long slaBudgetMs() default 105L;
    int maxRetryBudget() default 2;
    boolean requireAuditLog() default true;
    String[] allowedScopes() default {"INVENTORY_READ", "INVENTORY_WRITE"};
    ComplianceTier tier() default ComplianceTier.ENFORCED;

    enum ComplianceTier {
        ADVISORY(1, 0.50) {
            @Override
            public boolean blocksDeployment(double violationRatio) {
                return violationRatio > 0.75;
            }
        },
        ENFORCED(2, 1.00) {
            @Override
            public boolean blocksDeployment(double violationRatio) {
                return violationRatio > 0.15;
            }
        },
        STRICT_REGULATED(3, 1.85) {
            @Override
            public boolean blocksDeployment(double violationRatio) {
                return violationRatio > 0.0;
            }
        };

        private final int severityRank;
        private final double penaltyWeight;

        ComplianceTier(int severityRank, double penaltyWeight) {
            this.severityRank = severityRank;
            this.penaltyWeight = penaltyWeight;
        }

        public int getSeverityRank() {
            return severityRank;
        }

        public double getPenaltyWeight() {
            return penaltyWeight;
        }

        public abstract boolean blocksDeployment(double violationRatio);
    }

    final class ContractEvaluator<T> {
        private final Class<T> inspectedType;
        private final List<Predicate<Method>> structuralChecks = new ArrayList<>();
        private final Map<String, Double> slaBudgets = new LinkedHashMap<>();

        public ContractEvaluator(Class<T> inspectedType) {
            this.inspectedType = Objects.requireNonNull(inspectedType, "inspectedType must not be null");
            this.structuralChecks.add(m -> !m.isSynthetic() && !m.isBridge());
        }

        public ContractEvaluator<T> addStructuralCheck(Predicate<Method> check) {
            structuralChecks.add(Objects.requireNonNull(check, "check must not be null"));
            return this;
        }

        public List<PolicyFinding> inspectAllMethods() {
            List<PolicyFinding> findings = new ArrayList<>();
            InventoryGovernanceContract typeContract = inspectedType.getAnnotation(InventoryGovernanceContract.class);
            long inheritedSla = typeContract != null ? typeContract.slaBudgetMs() : 105L;

            List<Method> declaredMethods = Arrays.stream(inspectedType.getDeclaredMethods())
                    .filter(method -> structuralChecks.stream().allMatch(pred -> pred.test(method)))
                    .sorted(Comparator.comparing(Method::getName))
                    .collect(Collectors.toList());

            for (Method method : declaredMethods) {
                InventoryGovernanceContract contract = method.getAnnotation(InventoryGovernanceContract.class);
                long budget = contract != null ? contract.slaBudgetMs() : inheritedSla;
                slaBudgets.put(method.getName(), (double) budget);

                boolean missingAudit = contract != null && !contract.requireAuditLog()
                        && contract.tier() == ComplianceTier.STRICT_REGULATED;
                boolean invalidRetries = contract != null && (contract.maxRetryBudget() < 0 || contract.maxRetryBudget() > 10);
                boolean emptyScopes = contract != null && contract.allowedScopes().length == 0;

                if (missingAudit || invalidRetries || emptyScopes) {
                    String reason = missingAudit
                            ? "STRICT_REGULATED method disables audit logging"
                            : invalidRetries
                            ? "Retry budget out of permitted [0..10] bounds"
                            : "At least one RBAC scope must be declared";
                    findings.add(new PolicyFinding(
                            inspectedType.getSimpleName(),
                            method.getName(),
                            contract != null ? contract.tier() : ComplianceTier.ADVISORY,
                            budget,
                            false,
                            reason,
                            Instant.now()));
                } else {
                    findings.add(new PolicyFinding(
                            inspectedType.getSimpleName(),
                            method.getName(),
                            contract != null ? contract.tier() : ComplianceTier.ENFORCED,
                            budget,
                            true,
                            "Compliant with WMS-PRO (units)",
                            Instant.now()));
                }
            }
            return Collections.unmodifiableList(findings);
        }

        public <K> Map<K, List<PolicyFinding>> groupFindings(
                List<PolicyFinding> findings,
                Function<? super PolicyFinding, K> classifier) {
            return findings.stream().collect(Collectors.groupingBy(classifier, LinkedHashMap::new, Collectors.toList()));
        }

        public double computeWeightedRiskScore(List<PolicyFinding> findings) {
            if (findings.isEmpty()) {
                return 0.0;
            }
            double totalPenalty = findings.stream()
                    .filter(f -> !f.isCompliant())
                    .mapToDouble(f -> f.getTier().getPenaltyWeight() * 1.19)
                    .sum();
            return Math.min(100.0, (totalPenalty / findings.size()) * 100.0);
        }

        public Optional<PolicyFinding> findStrictestViolation(List<PolicyFinding> findings) {
            return findings.stream()
                    .filter(f -> !f.isCompliant())
                    .max(Comparator.comparingInt(f -> f.getTier().getSeverityRank()));
        }

        public Set<String> getInspectedMethodNames() {
            return Collections.unmodifiableSet(slaBudgets.keySet());
        }
    }

    final class PolicyFinding {
        private final String className;
        private final String methodName;
        private final ComplianceTier tier;
        private final long slaBudgetMs;
        private final boolean compliant;
        private final String summary;
        private final Instant evaluatedAt;

        public PolicyFinding(
                String className,
                String methodName,
                ComplianceTier tier,
                long slaBudgetMs,
                boolean compliant,
                String summary,
                Instant evaluatedAt) {
            this.className = className;
            this.methodName = methodName;
            this.tier = tier;
            this.slaBudgetMs = slaBudgetMs;
            this.compliant = compliant;
            this.summary = summary;
            this.evaluatedAt = evaluatedAt;
        }

        public String getClassName() { return className; }
        public String getMethodName() { return methodName; }
        public ComplianceTier getTier() { return tier; }
        public long getSlaBudgetMs() { return slaBudgetMs; }
        public boolean isCompliant() { return compliant; }
        public String getSummary() { return summary; }
        public Instant getEvaluatedAt() { return evaluatedAt; }
    }
}
