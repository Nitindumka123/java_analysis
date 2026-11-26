package com.complex;

public class GodClass {
    public void massiveMethodWithHighComplexity(int x, int y, int z) {
        if (x > 0) {
            if (y > 0) {
                if (z > 0) {
                    for (int i = 0; i < 100; i++) {
                        if (i % 2 == 0) {
                            System.out.println("Even: " + i);
                        } else {
                            if (i % 3 == 0) {
                                System.out.println("Div by 3: " + i);
                            } else {
                                switch (i % 5) {
                                    case 1:
                                        System.out.println("Case 1");
                                        break;
                                    case 2:
                                        System.out.println("Case 2");
                                        break;
                                    default:
                                        System.out.println("Default");
                                        break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    public int calculatePenaltyPrimary(int factor, int limit) {
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

    private void unusedHelper() {
        int orphanedFlag = 99;
        System.out.println("Unused helper value: " + orphanedFlag);
    }
}
