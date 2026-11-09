import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma';

const app = createApp();

describe('Full Financial API Integration Test', () => {
  let authToken = '';
  let testCompanyId = '';
  let cashAccountId = '';
  let bankAccountId = '';
  let incomeCategoryId = '';
  let expenseCategoryId = '';

  beforeAll(async () => {
    // Clean up test transactions, transfers, and audit logs to ensure clean slate
    await prisma.attachment.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.transfer.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // Reset account balances to 0
    await prisma.account.updateMany({
      data: { openingBalance: 0, currentBalance: 0 }
    });

    // Look up seeded company and accounts
    const company = await prisma.company.findFirst({
      where: { code: 'GTI' },
      include: { accounts: true, categories: true }
    });
    if (!company) throw new Error('Seeded company not found');
    testCompanyId = company.id;

    const cashAcc = company.accounts.find((a) => a.name === 'Cash');
    const bankAcc = company.accounts.find((a) => a.name === 'Bank');
    if (!cashAcc || !bankAcc) throw new Error('Accounts not found');
    cashAccountId = cashAcc.id;
    bankAccountId = bankAcc.id;

    const incCat = company.categories.find((c) => c.type === 'INCOME');
    const expCat = company.categories.find((c) => c.type === 'EXPENSE');
    incomeCategoryId = incCat!.id;
    expenseCategoryId = expCat!.id;
  });

  it('rejects unauthorized access to protected endpoints', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('fails login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cashflow.local', password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  it('succeeds login with correct admin credentials and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cashflow.local', password: 'AdminPassword123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  it('fetches companies with authenticated token', async () => {
    const res = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.companies.length).toBe(3);
  });

  it('creates Cash In of PKR 100,000 and increments account balance', async () => {
    const initialAcc = await prisma.account.findUnique({ where: { id: bankAccountId } });
    const initialBal = Number(initialAcc!.currentBalance);

    const res = await request(app)
      .post('/api/cash-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyId: testCompanyId,
        accountId: bankAccountId,
        categoryId: incomeCategoryId,
        amount: '100000.00',
        party: 'Apex Global Client',
        paymentDate: new Date().toISOString(),
        referenceNo: 'INV-1001',
        description: 'Software Development Milestone 1'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const updatedAcc = await prisma.account.findUnique({ where: { id: bankAccountId } });
    expect(Number(updatedAcc!.currentBalance)).toBe(initialBal + 100000);
  });

  it('creates Cash Out of PKR 25,000 and decrements account balance', async () => {
    const initialAcc = await prisma.account.findUnique({ where: { id: bankAccountId } });
    const initialBal = Number(initialAcc!.currentBalance);

    const res = await request(app)
      .post('/api/cash-out')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyId: testCompanyId,
        accountId: bankAccountId,
        categoryId: expenseCategoryId,
        amount: '25000.00',
        party: 'Cloud Hosting Provider',
        paymentDate: new Date().toISOString(),
        referenceNo: 'EXP-5001',
        description: 'Monthly Dedicated Servers'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const updatedAcc = await prisma.account.findUnique({ where: { id: bankAccountId } });
    expect(Number(updatedAcc!.currentBalance)).toBe(initialBal - 25000);
  });

  it('transfers PKR 20,000 from Bank to Cash atomically without altering company total balance', async () => {
    const fromBefore = await prisma.account.findUnique({ where: { id: bankAccountId } });
    const toBefore = await prisma.account.findUnique({ where: { id: cashAccountId } });

    const totalBefore = Number(fromBefore!.currentBalance) + Number(toBefore!.currentBalance);

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        companyId: testCompanyId,
        fromAccountId: bankAccountId,
        toAccountId: cashAccountId,
        amount: '20000.00',
        transferDate: new Date().toISOString(),
        referenceNo: 'TRF-001',
        notes: 'ATM Withdrawal for Office Petty Cash'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const fromAfter = await prisma.account.findUnique({ where: { id: bankAccountId } });
    const toAfter = await prisma.account.findUnique({ where: { id: cashAccountId } });

    expect(Number(fromAfter!.currentBalance)).toBe(Number(fromBefore!.currentBalance) - 20000);
    expect(Number(toAfter!.currentBalance)).toBe(Number(toBefore!.currentBalance) + 20000);

    const totalAfter = Number(fromAfter!.currentBalance) + Number(toAfter!.currentBalance);
    expect(totalAfter).toBe(totalBefore);
  });

  it('generates dashboard summary accurately matching transactions', async () => {
    const res = await request(app)
      .get(`/api/dashboard/summary?companyId=${testCompanyId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.cards.totalCashIn).toBe('100000.00');
    expect(res.body.cards.totalCashOut).toBe('25000.00');
    expect(res.body.cards.netCashFlow).toBe('75000.00');
    expect(Number(res.body.cards.totalAvailableBalance)).toBe(75000);
  });
});
