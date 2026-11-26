package com.complex;

import com.complex.ClassA;

public class ClassB {
    private final ClassA service = new ClassA();

    public int runWorkflow(int factor, int limit) {
        service.executeBatch();
        return service.calculatePenaltySecondary(factor, limit);
    }
}
