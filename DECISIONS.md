# DECISIONS - Architecture and Design Log

This log outlines the key product and engineering decisions made during development.

---

## 1. Multi-stage Interactive CSV Importer (Product Decision)

* **Context**: The `expenses_export.csv` contains numerous anomalies, dates in multiple formats, names with typos, duplicates, and direct settlements.
* **Options Considered**:
  1. **Silent Auto-Resolution**: Make a best guess on all rows and import them silently.
  2. **Interactive Staging & Conflict Resolver (Chosen)**: Parse the CSV, flag all anomalies, and display them in a visual "import staging page" before committing.
* **Rationale**: Auto-resolution risks importing wrong amounts (e.g. choice between Thalassa dinner amounts ₹2400 and ₹2450). Showing the problems side-by-side allows the users to approve or modify resolving actions inline (e.g., skip duplicate, mapping names like `Priya S` -> `Priya`), guaranteeing database cleanliness.

---

## 2. Relational Database & Transactions (Engineering Decision)

* **Context**: Saving the parsed CSV results in inserting groups, users, group members, expenses, shares, settlements, and logs.
* **Options Considered**:
  1. **Individual Inserts**: Run database inserts row by row. If one fails, others remain.
  2. **SQL Transaction (Chosen)**: Run the entire commit inside a Sequelize transaction.
* **Rationale**: If the import fails halfway, individual inserts leave the database in a corrupted state (partial group, half of the expenses). A transaction guarantees "all-or-nothing" execution.

---

## 3. Simplified peer-to-peer debts (Algorithm Decision)

* **Context**: Aisha requested: "I just want one number per person. Who pays whom, how much, done."
* **Options Considered**:
  1. **Direct balance matching**: Create a transfer for every expense.
  2. **Greedy debt minimization (Chosen)**: Compute net balances (payments minus shares and settlements), divide users into debtors and creditors, and pair them greedily.
* **Rationale**: Minimizes transactions. Instead of transferring money 20 times, it calculates a simplified transfer matrix (e.g., Rohan pays Aisha X, Priya pays Sam Y), fulfilling Aisha's request.

---

## 4. Itemized Ledger Breakdown (Rohan's Request)

* **Context**: Rohan requested: "No magic numbers. If the app says I owe Rs.2,300, I want to see exactly which expenses make that up."
* **Options Considered**:
  1. **Static balance page**: Just show total numbers.
  2. **Drill-down Ledger (Chosen)**: Click a member's card to reveal the exact list of expenses they paid, expenses they participated in (with total and their share), and settlement entries.
* **Rationale**: Provides absolute mathematical transparency, satisfying Rohan's request directly.
