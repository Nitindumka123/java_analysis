# DevScope — Windows Local Startup Guide

DevScope runs 100% locally on your Windows machine using a single unified Node.js server (Express backend + React/Vite frontend on port **3000**). No cloud services, databases, or external API keys are required.

---

## 1. Prerequisites

- **Node.js (v20 LTS or newer)** installed on Windows.
  - Download from [https://nodejs.org](https://nodejs.org) (choose the **LTS** installer).
  - Verify installation in **PowerShell** or **Command Prompt (CMD)**:
    ```powershell
    node -v
    npm -v
    ```

---

## 2. Installation

Open **PowerShell** or **Command Prompt**, navigate to the DevScope project folder, and install all dependencies:

```powershell
cd C:\path\to\devscope
npm install
```

---

## 3. Running the App

Start both the **Express backend API** and the **React frontend** together with a single command:

```powershell
npm run dev
```

Wait until the terminal displays:

```text
DevScope platform running on http://0.0.0.0:3000
```

Both the UI and all `/api/*` analysis/report endpoints are now running locally on **`http://localhost:3000`**.

---

## 4. How to Test

1. Open your browser (Chrome or Edge) and go to:
   ```text
   http://localhost:3000
   ```
2. On the **Analyze Project** screen, either:
   - Click the **Complex Project** sample card (`sample-projects/complex-project`) directly to run an immediate AST scan, **or**
   - Enter any local Windows folder path (for example `C:\Users\YourName\Projects\JavaApp` or `sample-projects\complex-project`), or drag & drop a `.zip` archive of `.java` files, and click **Analyze Project**.
3. Explore the generated analysis:
   - **Dashboard & Analytics**: Overview KPIs, risk indicator, and Recharts complexity charts.
   - **Code Smells & Complexity**: Inspect `GodClass.java#massiveMethodWithHighComplexity()` flagged for high Cyclomatic Complexity, deep nesting, and long method length.
   - **Duplicate Code & Dead Code**: View detected token clones and unreferenced private methods (`unusedHelper()`).
   - **Dependencies & Change Impact**: Explore the Cytoscape dependency graph and reverse-graph BFS blast radius for `GodClass`.
   - **Reports**: Export real binary **PDF** and **CSV** audit reports.
   - **Settings**: Adjust **Max Cyclomatic Complexity** or **Max Method Length**, click **Save Configuration**, and re-run an analysis to see custom thresholds applied live.

---

## 5. Troubleshooting

### Port 3000 Is Already in Use (`EADDRINUSE`)

If another process is already occupying port `3000`, free it with:

```powershell
npx kill-port 3000
```

Alternatively, kill the process manually using built-in Windows commands in **PowerShell / CMD**:

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID_FROM_ABOVE> /F
```

Then start DevScope again:

```powershell
npm run dev
```

### Windows Path Tips

- Both backslash (`C:\Users\Name\Projects\JavaApp`, `sample-projects\complex-project`) and forward-slash (`sample-projects/complex-project`) paths are supported.
- Make sure the target folder contains at least one `.java` file and is not a protected Windows system folder (such as `C:\Windows`).
- If you see `PowerShell script execution disabled` when running `npm`, run PowerShell as your user and execute:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```
