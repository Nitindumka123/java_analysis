# DevScope — Final Viva Preparation Guide

## 1. Project Summary

**DevScope** is a full-stack static code analysis and engineering intelligence platform built specifically for Java codebases. Powered by a **React + TypeScript + Material UI** frontend and a **Node.js + Express** backend, DevScope parses physical `.java` source files directly into Concrete Syntax Trees (CST/AST) using `java-parser`. Instead of relying on fragile regular expressions or mocked metrics, it extracts real structural telemetry—files, packages, classes, methods, lines of code, Cyclomatic Complexity, nesting depth, code smells, token-sequence duplicate clones, unreferenced private dead code, class/package dependency graphs, and reverse-graph BFS change impact blast radii.

To support production-grade engineering workflows, DevScope combines interactive visualizations (**Recharts** and **Cytoscape.js**) with physical binary **PDF** (`pdfkit`) and **CSV** (`fast-csv`) report generation streamed directly from the Express backend. The platform is hardened with strict path-traversal and symlink-escape protection (`SecurityError` returning HTTP `403 Forbidden`), ZIP Slip validation on uploaded archives, and IP-based rate limiting (`express-rate-limit`, 10 requests/minute) on compute-intensive endpoints.

---

## 2. How to Run

DevScope runs as a unified full-stack Node.js server (Express API + Vite middleware on **port 3000**).

### Prerequisites
- **Node.js** `>= 20.x` (tested on Node.js 22)
- **npm** `>= 10.x`

### Install Dependencies
```bash
npm install
```

### Start Development Server (Backend API + Frontend SPA)
```bash
npm run dev
```
- Express API & React Frontend are served together at: **`http://localhost:3000`**

### Production Build & Start
```bash
npm run build
NODE_ENV=production npm run start
```

### Run Type-Check & Automated Test Suite
```bash
npm run lint
npx vitest run
```

---

## 3. How to Demo

Follow this step-by-step sequence during the Viva demonstration:

1. **Open the Application**: Navigate to **`http://localhost:3000`** (or the deployed preview URL). Point out the clean idle state with the minimal sidebar (`Analyze Project`, `Settings`).
2. **Analyze the Complex Sample Project**: Click the **Complex Project** card (`sample-projects/complex-project`). Observe the modal loading spinner while Express physically reads and parses `GodClass.java`, `ClassA.java`, and `ClassB.java`.
3. **Showcase the Main Dashboard**: Once redirected to `/dashboard`, highlight the expanded workspace sidebar and real parsed metrics: `3 Files`, `3 Classes`, `6 Methods`, `75 LOC`, `Complexity Score 72`, `4 Code Smells`, and `HIGH` risk classification.
4. **Inspect Code Smells & Complexity**: Navigate to **Complexity** and **Code Smells** to show `GodClass.java#massiveMethodWithHighComplexity()` flagged with **Cyclomatic Complexity = 10**, deep nesting, and long method smells.
5. **Inspect Deep-Dive Modules (Dead Code & Duplicate Code)**:
   - Open **Dead Code** to show `unusedHelper()` in `GodClass.java` detected as an unreferenced private method.
   - Open **Duplicate Code** to show the `100%` similar clone pair (`calculatePenaltyPrimary()` vs `calculatePenaltySecondary()`).
6. **Demonstrate Change Impact Analysis (Reverse-Graph BFS)**:
   - Navigate to **Change Impact** (`/impact`).
   - Search or select **`GodClass`** in the Target Class selector.
   - Show the computed blast radius: **Direct Dependent (Hop 1): `ClassA`**, **Indirect Dependent (Hop 2): `ClassB`**, plus the interactive Cytoscape propagation graph.
7. **Export Physical Reports**: Navigate to **Reports** (`/reports`), select a report template (e.g., *Complete Assessment*), and click **Export PDF** and **Export CSV** to demonstrate real binary file downloads with loading spinners and toast confirmation.
8. **Clear Workspace & Test Syntax Error Handling**:
   - Click **Clear Workspace** in the top-right header (verifies state reset, `localStorage` wipe, and redirect to `/`).
   - Click **Broken Project** (`sample-projects/broken-project`). Show the graceful HTTP `400` parser error modal reporting the exact syntax failure in **`BadSyntax.java` at line 6, column 5** without crashing the app.
9. **Demonstrate Security Hardening (Optional Live Curl)**:
   - Submit `../../etc/passwd` in **Local Project Path** (or via `curl -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"projectPath":"../../etc/passwd"}'`).
   - Show that the server immediately blocks the traversal attack with **HTTP `403 Forbidden`**.

---

## 4. Expected Test Results

All values below are physically computed by `server/javaAnalyzer.ts` from the repository's `sample-projects/` directory:

| Metric / Outcome | `clean-project` | `complex-project` | `broken-project` |
| :--- | :---: | :---: | :---: |
| **HTTP Status** | `200 OK` | `200 OK` | `400 Bad Request` (`JAVA_SYNTAX_ERROR`) |
| **Java Files Parsed** | `1` (`Main.java`) | `3` (`GodClass.java`, `ClassA.java`, `ClassB.java`) | Fails on `BadSyntax.java` (Line `6`, Col `5`) |
| **Packages** | `1` | `1` | N/A |
| **Classes** | `1` | `3` | N/A |
| **Methods** | `3` | `6` | N/A |
| **Lines of Code (LOC)** | `14` | `75` | N/A |
| **Complexity Score (0–100)** | `8` | `72` | N/A |
| **Avg / Max Cyclomatic Complexity** | `1.00` / `1` | `3.17` / `10` | N/A |
| **Maintainability Index** | `95 / 100` (`EXCELLENT`) | `75 / 100` (`GOOD`) | N/A |
| **Code Smells Detected** | `0` | `4` | N/A |
| **Duplicate Clone Pairs** | `0` | `1` (`100%` similarity) | N/A |
| **Dead Code Items** | `0` | `1` (`unusedHelper()`) | N/A |
| **Technical Debt (Hours)** | `0 hrs` | `9 hrs` | N/A |
| **Risk Level** | `LOW` | `HIGH` | Error Intercepted |
| **Change Impact (`target` → Direct / Indirect)** | `Main` → `0` / `0` | `GodClass` → `ClassA` / `ClassB` | N/A |

---

## 5. Anticipated Viva Questions & Answers

### Q1: Why did you use `java-parser` (Node.js) instead of JavaParser (Java)?
**Answer:** Using the Chevrotain-based `java-parser` package directly inside the Node.js/Express runtime keeps the entire platform lightweight, self-contained, and single-runtime. There is no need to provision a separate JVM microservice, maintain IPC/HTTP bridges between Java and Node, or incur JVM cold-start latency and memory overhead. Because `java-parser` generates a complete, standards-compliant Java Concrete Syntax Tree (CST) in pure JavaScript/TypeScript, our backend parses multi-file Java projects in milliseconds and streams JSON metrics, PDFs, and CSVs directly to the React frontend.

### Q2: How do you calculate Cyclomatic Complexity?
**Answer:** For every parsed `methodDeclaration` and `constructorDeclaration` node in the CST (`analyzeMethodCst` in `server/javaAnalyzer.ts`), we initialize the base complexity at **1** (representing the single default execution path) and recursively traverse the method's syntax subtree. Every branching construct increments the count by 1: `ifStatement`, `forStatement`, `whileStatement`, `doStatement`, `switchBlockStatementGroup` / `switchRule` (`case` branches), `catchClause`, `ternaryExpression`, and logical short-circuit operators (`&&` and `||`). At the same time, we track control-flow nesting depth (`maxNesting`) to detect Deep Nesting smells.

### Q3: How do you handle syntax errors in uploaded or sample Java code?
**Answer:** When `java-parser`'s `parse(source)` encounters invalid Java grammar (such as the missing parenthesis in `sample-projects/broken-project/src/BadSyntax.java`), it throws a lexer/parser exception containing the offending token position. Our analyzer catches this exception, extracts the exact `line` and `column` numbers via `extractParseErrorLocation()`, and throws a typed `JavaSyntaxError`. The Express backend catches `JavaSyntaxError` in `handleAnalysisError()` and responds with **HTTP `400 Bad Request`** including `{ error: "JAVA_SYNTAX_ERROR", message, file, line, column }`. The frontend immediately stops the loading spinner, keeps the user safely on the landing page, and displays the exact file/line/column diagnostic in an error alert and modal.

### Q4: How is Dead Code detected?
**Answer:** During CST traversal, we record every `private` method and `private` field along with its declaration token offset (`declOffset`). In the same pass, we collect all `methodInvocation` / `methodReference` targets and all identifier tokens across the parsed file. A `private` method is flagged as dead code if its bare name never appears in any invocation node and never appears in the identifier token stream at an offset other than its own declaration (`startOffset !== declOffset`). Similarly, a `private` field is flagged as dead code if it is never referenced outside its declaration token. Because `private` members cannot be accessed from external classes, this file-scoped token/AST check avoids false positives on public API methods.

### Q5: How do you prevent Path Traversal and Denial-of-Service (DoS) attacks on the analysis API?
**Answer:** Every filesystem path passed to `/api/analyze` or `/api/parser/analyze/*` goes through `resolveProjectRoot()` in `server/javaAnalyzer.ts`. It rejects null bytes, normalizes the path with `path.resolve()`, enforces a trailing `path.sep` boundary check against the workspace root, blocks restricted directories (`.git`, `node_modules`, `.env`), and re-verifies `fs.realpathSync()` to prevent symlink escapes—throwing a `SecurityError` that Express maps to **HTTP `403 Forbidden`**. Uploaded ZIP archives are additionally checked entry-by-entry against **Zip Slip** before extraction. Finally, `express-rate-limit` caps `POST /api/analyze` and `POST /api/projects/upload` to **10 requests per minute per IP** (returning **HTTP `429 Too Many Requests`**) to protect server CPU from abuse.

---

## 6. UI/UX Demonstration Checklist

Use this live checklist during the Viva to highlight DevScope's responsive layout, dark enterprise theme, interactive states, and visualization quality:

- [ ] **Responsive Breakpoint (`< 1024px`) & Mobile Drawer**: Resize the browser viewport to **`800px`** width. Verify the left sidebar automatically collapses into the top-left hamburger menu icon (`MenuIcon`) and opens cleanly as a slide-out temporary drawer, while Main Dashboard metric cards transition cleanly from 4 columns (`>= 1024px`) to 2 columns (`768px–1023px`) and 1 column (`< 768px`) with zero horizontal overflow.
- [ ] **Unified Deep Midnight & Indigo Dark Theme**: Navigate across Home (`/`), Dashboard (`/dashboard`), Analytics (`/analytics`), Code Smells (`/code-smells`), Technical Debt (`/technical-debt`), Reports (`/reports`), and Settings (`/settings`). Confirm zero white flashes, consistent `#0F172A` (`slate-900`) canvas and `#1E293B` (`slate-800`) surfaces, `#6366F1` indigo primary bars in Recharts, and rose (`HIGH RISK`) vs. emerald (`LOW RISK`) status badges.
- [ ] **Fixed-Height Tables with Thin Dark Scrollbars**: Open **Code Smells**, **Dead Code**, and **Duplicate Code** on `complex-project`. Verify tables render inside fixed-height scrollable containers (`maxHeight: 380px–420px`) with sticky dark headers and custom thin 6px dark slate scrollbars (`#334155` thumb / `#6366F1` hover).
- [ ] **Analyzing AST Loading State & Smooth SPA Navigation**: Click **Analyze Project** on the Upload Page and verify the button enters a disabled state displaying `<CircularProgress size={20} />` and `"Analyzing AST..."`. Switch between **Dashboard → Code Smells → Technical Debt → Dependency Graph** and confirm instant SPA transitions with zero full-page reloads.
- [ ] **Dependency Graph Layout & Floating Legend**: Navigate to **Dependency Graph** (`/dependency-graph`). Verify Cytoscape renders on a `#0F172A` canvas using the spaced **`cose`** force-directed layout (with one-click toggle to **`Hierarchy` (`breadthfirst`)** and **`Fit View`**), nodes are evenly distributed with zero corner clustering, and the floating dark-glass legend displays **`Node = Class`** (or `Package`), **`Edge = Dependency`**, and **`Red Edge = Cycle`**.
- [ ] **Clear Workspace Confirmation Prompt**: Click **Clear Workspace** in the top-right header. Verify the dark confirmation dialog appears displaying `"Are you sure you want to clear the current analysis?"`, preserves state if cancelled, and cleanly resets React state, clears `localStorage`, and navigates to `/` upon confirmation.
- [ ] **Clean Code Empty State**: Analyze **`clean-project`** and open **Code Smells** (as well as **Dead Code** and **Duplicate Code**). Verify the styled emerald success empty state renders with the check illustration and `"No issues found. Your code is clean!"` instead of a blank table.

