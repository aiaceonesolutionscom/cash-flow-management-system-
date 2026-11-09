# Expense & Cash Flow Management System

A production-grade, centralized financial management application engineered for managing the financial activities, liquidity, expenses, income, transfers, and statements of three companies from a unified dashboard in **Pakistani Rupee (PKR)**.

---

## 🏢 Managed Companies

1. **Global Tech International** (Code: `GTI`)
2. **Krunch 360** (Code: `K360`)
3. **Global Sourcing International** (Code: `GSI`)

---

## 🔑 Single Admin Credentials

| Parameter | Default Value | Notes |
| :--- | :--- | :--- |
| **Email** | `admin@cashflow.local` | Configurable in `server/.env` |
| **Password** | `AdminPassword123!` | Hashed via Bcrypt (12 rounds) |
| **Role** | System Administrator | Single-admin strictly enforced |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL 14+** (running on `localhost:5432`)

### 1. Database Configuration
Ensure PostgreSQL is running and database `cashflow_db` exists:
```bash
# In server directory:
cd server
npm run prisma:generate
npm run prisma:migrate # or npx prisma db push
npm run prisma:seed    # Seeds Admin, 3 Companies, 9 Accounts, & 14 Default Categories
```

### 2. Start Backend API Server
```bash
cd server
npm run dev
# Server will run on: http://localhost:5000
```

### 3. Start Frontend Client
```bash
cd client
npm run dev
# Vite client will run on: http://localhost:5173
```

---

## 🏛 Architecture & Financial Calculation Rules

- **Decimal Precision**: Never uses JavaScript floats for money. All monetary calculations use `Decimal.js` and PostgreSQL `Decimal(15,2)` columns.
- **Net Cash Flow**: $\text{Net Cash Flow} = \sum \text{Cash In} - \sum \text{Cash Out}$
- **Account Current Balance**: $\text{Current Balance} = \text{Opening Balance} + \sum \text{Cash In} - \sum \text{Cash Out} + \sum \text{Transfers In} - \sum \text{Transfers Out}$
- **Total Available Balance**: Sum of all Cash, Bank, and Digital Wallet balances across all three companies.
- **Transfer Invariance**: Intra-company transfers between Cash, Bank, and Wallet debit the source and credit the destination atomically without modifying company income, expense, or total available balance.
- **Opening Capital**: Managed independently for each company's account and does not distort Cash In or income reports.

---

## 📊 Modules & Capabilities

- **Main Dashboard**: 8 real-time KPI cards, Recharts visualizations (Monthly Cash In vs Out, Net trend, Company comparisons, Expense category distribution), quick action modals.
- **Cash In Module**: Record income, payer, income category, target account, receipt attachment, automatic account balance increment.
- **Cash Out Module**: 14 default expense categories, vendor tracking, receipt attachment, automatic account deduction.
- **Internal Money Transfers**: Seamless intra-company liquidity transfer between Cash, Bank, and Digital Wallet.
- **Master Transactions Ledger**: Unified tabular view with multi-parameter filtering, sorting, pagination, and positive/negative indicators.
- **Accounts & Balances**: Company-wise accounts, live balances, and inline opening balance reconfiguration with automatic ledger recalculation.
- **Companies Overview**: High-level liquidity and net margins for each company entity.
- **Expense Categories**: Custom and standard category CRUD with dependency protection against deleting linked categories.
- **Financial Reports Engine**: 9 comprehensive report views + direct streaming exports to **Excel (.xlsx)**, **PDF (.pdf)**, and **CSV (.csv)**.
- **System Audit Trail**: Complete audit logging of all creation, modification, deletion, transfer, and balance adjustment events.

---

## 🧪 Automated Testing

To run the automated financial calculation test suite and API integration tests:
```bash
cd server
npm run test
```
All 14 tests covering Net Cash Flow formulas, transfer invariance, atomic balance reconciliation, and unauthorized rejection run with Vitest.
