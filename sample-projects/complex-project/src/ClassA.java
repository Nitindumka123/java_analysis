package com.complex;

import com.complex.GodClass;

public class ClassA {
    private final GodClass processor = new GodClass();

    public void executeBatch() {
        processor.massiveMethodWithHighComplexity(1, 2, 3);
    }

    public int calculatePenaltySecondary(int factor, int limit) {
        int total = 0;
        for (int idx = 0; idx < limit; idx++) {
            if (idx % 2 == 0) {
                total += factor * idx;
            } else {
                total += factor + idx;
            }
        }
        return total;
    }
}
