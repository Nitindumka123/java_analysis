package com.clean;

public class Main {
    private final String greeting;

    public Main(String greeting) {
        this.greeting = greeting;
    }

    public void printGreeting() {
        System.out.println(greeting);
    }

    public static void main(String[] args) {
        Main app = new Main("Hello, Clean Code!");
        app.printGreeting();
    }
}
