# 🚀 Cash Flow & Expense Management System — cPanel Deployment Guide

> **Target Domain:** `https://cashflow.hawksnfox.com`  
> **Architecture:** Single-process unified deployment. Express backend directly serves the compiled React + Vite Single-Page Application (SPA) and all protected REST API routes (`/api/*`).  
> **Compatible with:** CloudLinux Node.js Selector, LiteSpeed (`lsnode` Unix Socket), and Apache Passenger.

---

## 📋 Pre-Deployment Checklist

1. **cPanel Subdomain:**
   - Go to **cPanel > Domains** and create subdomain `cashflow.hawksnfox.com`.
   - Ensure the document root is set (e.g. `/home/username/cashflow.hawksnfox.com`).
   - Enable Free **AutoSSL / Let's Encrypt** in cPanel for `cashflow.hawksnfox.com`.

2. **PostgreSQL Database:**
   - **Option A (cPanel PostgreSQL):** Go to **cPanel > PostgreSQL Databases**, create a database (e.g. `username_cashflow`) and user with full privileges. Connection URL format:
     ```
     postgresql://username_cashuser:YourPassword@127.0.0.1:5432/username_cashflow?schema=public
     ```
   - **Option B (Recommended Cloud PostgreSQL - Zero Server Overhead):** Use **Neon.tech**, **Supabase**, or **Aiven** (Free Tier available, instant SSL, zero cPanel RAM usage). Connection URL format:
     ```
     postgresql://user:password@ep-sample-pool.region.neon.tech/neondb?sslmode=require
     ```

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Create the Node.js Application in cPanel

1. In cPanel, click **Setup Node.js App** (CloudLinux NodeJS Selector).
2. Click **Create Application**:
   - **Node.js Version:** `20.x` LTS (Recommended) or `22.x`
   - **Application Mode:** `Production`
   - **Application Root:** `cashflow.hawksnfox.com` (or your chosen directory)
   - **Application URL:** `cashflow.hawksnfox.com`
   - **Application Startup File:** `server.js`
3. Click **Create**.
4. At the top of the page, cPanel will display an activation command like:
   ```bash
   source /home/username/nodevenv/cashflow.hawksnfox.com/20/bin/activate && cd /home/username/cashflow.hawksnfox.com
   ```
   *(Copy this command for Step 4).*

---

### Step 2: Prepare & Upload Project Files

1. On your local computer, create a ZIP file of the project containing:
   - `server.js` (Root startup file)
   - `package.json`
   - `.env` (Copied from `.env.production.example`)
   - `server/` (Full directory)
   - `client/` (Full directory)
   
   > ⚠️ **DO NOT zip:** `node_modules`, `.git`, or `.gemini`.

2. Open **cPanel > File Manager**, navigate into your Application Root directory (`/home/username/cashflow.hawksnfox.com`).
3. Upload your ZIP file and click **Extract**.

---

### Step 3: Configure Environment Variables (`.env`)

In **File Manager**, create or edit the `.env` file in the application root:

```env
NODE_ENV="production"
PORT=5000

# Canonical Domain URL
CLIENT_URL="https://cashflow.hawksnfox.com"

# PostgreSQL Connection String
DATABASE_URL="postgresql://username:password@127.0.0.1:5432/database_name?schema=public"

# Secure 256-bit JWT Secret
JWT_SECRET="e93a7d4f8b2c1e5a9601d3f572a94ce1883b5d2079f410c841e2a861fbc94017"

# Default Admin Account (Created automatically on seed)
DEFAULT_ADMIN_EMAIL="admin@cashflow.local"
DEFAULT_ADMIN_PASSWORD="StrongPassword2026!#"
```

---

### Step 4: Run Database Migration & Build in cPanel Terminal

Open **cPanel > Terminal** (or connect via SSH) and run:

```bash
# 1. Activate the Node.js environment (Paste your command from Step 1)
source /home/username/nodevenv/cashflow.hawksnfox.com/20/bin/activate && cd /home/username/cashflow.hawksnfox.com

# 2. Install dependencies for server and client
npm install --prefix server
npm install --prefix client

# 3. Push Database Schema to PostgreSQL & Seed Initial Data
cd server
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma db push
node dist/prisma/seed.js
cd ..

# 4. Trigger Instant Restart
mkdir -p tmp && touch tmp/restart.txt
```

---

### Step 5: Start / Restart the Application

1. Return to **cPanel > Setup Node.js App**.
2. Find your application and click **Restart**.
3. Open your domain in your browser: `https://cashflow.hawksnfox.com`
4. Login with:
   - **Email:** `admin@cashflow.local` (or whatever you set in `.env`)
   - **Password:** `StrongPassword2026!#`
5. Go to **Profile & Settings** to update your password immediately.

---

## 🔍 Troubleshooting & LiteSpeed Tips

- **LiteSpeed lsnode socket compatibility:**  
  LiteSpeed servers route requests through `LSNODE_SOCKET` instead of a standard TCP port. Our `server.js` startup file already includes automatic socket detection and redirection.
- **Checking Server Logs:**  
  If the page shows an error, check:
  - `stderr.log` inside your application root folder in cPanel File Manager.
  - Or run: `tail -n 50 stderr.log` in cPanel Terminal.
- **Database Connection Issues:**  
  Ensure special characters in the database password (such as `@`, `#`, `%`) are URL-encoded if using cPanel PostgreSQL (e.g. `@` becomes `%40`). Cloud databases like Neon or Supabase provide pre-formatted connection strings with SSL enabled.
