# Shared Expense App - Backend API Documentation

This Node.js & Express server connects to a MySQL database using Sequelize ORM. It manages users, groups, expenses, peer splits, settlements, and imports raw CSV transaction sheets.

---

## Technical Features
* **Authentication**: JWT (JSON Web Tokens) with a custom authentication middleware.
* **Database Migration**: Automatic table synchronization (`sequelize.sync({ alter: true })`) on server boot.
* **Import Transaction Engine**: Handles bulk CSV parsing and anomaly logs inside database transactions.
* **Greedy Transfer Simplifier**: Pairs net debtor balances with net creditor balances to minimize payments.

---

## Environment Configuration (`.env`)
Create a `.env` file in the root of the `backend` directory:
```env
PORT=5000
DB_NAME=expense_manager
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
JWT_SECRET=your_jwt_signing_key
```

---

## API Endpoints Reference

### 1. Authentication (`/api/auth`)
* `POST /register`: Registers a new user.
  * *Request Body*: `{ "name": "Aisha", "email": "aisha@flatmates.com", "password": "password123" }`
* `POST /login`: Log in and receive JWT token.
  * *Request Body*: `{ "email": "aisha@flatmates.com", "password": "password123" }`
  * *Response*: `{ "token": "JWT_TOKEN_HERE", "user": { "id": 1, "name": "Aisha", "email": "aisha@flatmates.com" } }`

### 2. Group Management (`/api/groups`)
* `GET /`: Retrieve all active groups the logged-in user belongs to. *(Bearer Token Required)*
* `POST /`: Create a new group. Creator is automatically added as the first active member. *(Bearer Token Required)*
  * *Request Body*: `{ "name": "4BHK Flatmates" }`
* `GET /:groupId/members`: Retrieve membership records and user details for a group. *(Bearer Token Required)*
* `POST /:groupId/members`: Add a user to a group by their email address. *(Bearer Token Required)*
  * *Request Body*: `{ "email": "sam@flatmates.com", "joinDate": "2026-04-10" }`
* `PATCH /members/:membershipId/leave`: Log a member leaving the group. *(Bearer Token Required)*
  * *Request Body*: `{ "leaveDate": "2026-03-31" }`

### 3. Expense Ledger (`/api/expenses`)
* `POST /`: Add a manual shared expense. Split values are pre-calculated. *(Bearer Token Required)*
  * *Request Body*:
    ```json
    {
      "groupId": 1,
      "amount": 12000,
      "currency": "INR",
      "description": "Furniture for common room",
      "expenseDate": "2026-04-18",
      "splitType": "EQUAL",
      "paidBy": 1,
      "shares": [
        { "userId": 1, "shareAmount": 3000 },
        { "userId": 2, "shareAmount": 3000 },
        { "userId": 3, "shareAmount": 3000 },
        { "userId": 5, "shareAmount": 3000 }
      ]
    }
    ```
* `GET /group/:groupId`: Retrieve all recorded expenses for a group. *(Bearer Token Required)*
* `GET /group/:groupId/balances`: Get net group balances, category-wise spending analytics, and simplified peer-to-peer debts (who pays whom). *(Bearer Token Required)*

### 4. Direct Settlements (`/api/settlements`)
* `POST /`: Record a peer-to-peer settlement payment. *(Bearer Token Required)*
  * *Request Body*: `{ "groupId": 1, "amount": 5000, "currency": "INR", "paidById": 2, "receivedById": 1, "settlementDate": "2026-02-25" }`
* `GET /group/:groupId`: Fetch all settlement history for a group. *(Bearer Token Required)*

### 5. CSV Importer (`/api/import`)
* `POST /analyze`: Ingests raw CSV spreadsheet text, parses records, flags 12+ anomalies, and computes categories. *(Bearer Token Required)*
  * *Request Body*: `{ "csvText": "DATE,DESCRIPTION,..." }`
* `POST /commit`: Ingests resolved rows, name mappings, and exchange rates. Commits groups, users, memberships, expenses, shares, settlements, and anomaly logs inside a single transaction. *(Bearer Token Required)*
* `GET /reports`: Fetch metadata and logs for all past imports. *(Bearer Token Required)*

---

## Setup & Startup
1. Run `npm install` inside the `backend` folder to install dependencies.
2. Ensure MySQL is running on your system.
3. Start the API server:
   ```bash
   npm run dev
   ```
