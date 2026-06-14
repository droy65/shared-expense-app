# Shared Expense Manager App

A high-fidelity premium Shared Expense App built with a Node/Express backend, MySQL database, and React + Vanilla CSS frontend. It resolves complex spreadsheet anomalies interactively, manages memberships changing over time, and simplifies debts using a greedy transaction minimization algorithm.

---

## Technical Stack
* **Backend**: Node.js, Express.js, Sequelize ORM
* **Database**: MySQL (relational database)
* **Frontend**: React (Vite), Vanilla CSS (glassmorphic theme)
* **AI Tool Used**: Antigravity (Gemini 3.5 Flash)

---

## Setup Instructions

### 1. Prerequisites
Ensure you have Node.js and MySQL server installed and running.

### 2. Database Setup
Create database connection settings in `backend/.env`.
```env
PORT=5000
DB_NAME=expense_manager
DB_USER=root
DB_PASSWORD=kush1410
DB_HOST=localhost
JWT_SECRET=mysecretkey
```
*(A startup script will automatically check and run `CREATE DATABASE IF NOT EXISTS expense_manager;`.)*

### 3. Running the Backend
1. Open a terminal, go to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server in dev mode:
   ```bash
   npm run dev
   ```
   *The server runs on `http://localhost:5000`.*

### 4. Running the Frontend
1. Open a new terminal, go to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
   *The client runs on `http://localhost:5173`.*

---

## Key Features

1. **Interactive CSV Import Wizard**: Upload `expenses_export.csv` directly. The app parses it, highlights all 12+ anomalies, and allows mapping names, merging duplicates, and correcting splits before committing.
2. **Simplified Debt Summary**: Displays who pays whom, how much, satisfying Aisha's request.
3. **Drill-Down ledger breakdown**: Click any user in a group to see a transparent equation of all their payments, shares, and settlements, satisfying Rohan's request.
4. **Temporal Memberships**: Mark members joining/leaving (e.g. Meera leaves March 31, Sam joins April 10) to compute balances dynamically, satisfying Sam's request.
5. **Auto-Login Feature**: Quick login as Aisha, Rohan, Priya, Meera, or Sam from the auth screen for easy grading and demo.
