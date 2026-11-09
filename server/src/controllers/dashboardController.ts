import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { MoneyCalculator } from '../utils/money';
import { TransactionType, AccountType } from '@prisma/client';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format } from 'date-fns';
import { Decimal } from 'decimal.js';

function getDateRange(range?: string, customStart?: string, customEnd?: string): { gte?: Date; lte?: Date } {
  const now = new Date();
  switch (range) {
    case 'today':
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case 'yesterday':
      const yest = subDays(now, 1);
      return { gte: startOfDay(yest), lte: endOfDay(yest) };
    case 'this_week':
      return { gte: startOfWeek(now, { weekStartsOn: 1 }), lte: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'this_month':
      return { gte: startOfMonth(now), lte: endOfMonth(now) };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { gte: startOfMonth(lastMonth), lte: endOfMonth(lastMonth) };
    case 'this_year':
      return { gte: startOfYear(now), lte: endOfYear(now) };
    case 'custom':
      if (customStart && customEnd) {
        return {
          gte: startOfDay(new Date(customStart)),
          lte: endOfDay(new Date(customEnd))
        };
      }
      return {};
    default:
      return {};
  }
}

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, dateRange, startDate, endDate } = req.query;

    const whereTx: any = {};
    const whereAcc: any = {};

    if (companyId && companyId !== 'all') {
      whereTx.companyId = companyId as string;
      whereAcc.companyId = companyId as string;
    }

    const dateFilter = getDateRange(dateRange as string, startDate as string, endDate as string);
    if (dateFilter.gte || dateFilter.lte) {
      whereTx.paymentDate = dateFilter;
    }

    // 1. Calculate Transactions Totals (Cash In, Cash Out, Expenses)
    const [cashInAgg, cashOutAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...whereTx, type: TransactionType.CASH_IN },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { ...whereTx, type: TransactionType.CASH_OUT },
        _sum: { amount: true }
      })
    ]);

    const totalCashIn = new Decimal(cashInAgg._sum.amount?.toString() || 0).toFixed(2);
    const totalCashOut = new Decimal(cashOutAgg._sum.amount?.toString() || 0).toFixed(2);
    const totalExpenses = totalCashOut; // Cash Out represents all outgoing expenses
    const netCashFlow = MoneyCalculator.netCashFlow(totalCashIn, totalCashOut).toFixed(2);

    // 2. Calculate Account Balances (Always reflects current real-time ledger balance)
    const accounts = await prisma.account.findMany({
      where: whereAcc,
      include: { company: true }
    });

    let cashBalance = new Decimal(0);
    let bankBalance = new Decimal(0);
    let walletBalance = new Decimal(0);

    for (const acc of accounts) {
      const b = new Decimal(acc.currentBalance.toString());
      if (acc.type === AccountType.CASH) cashBalance = cashBalance.plus(b);
      else if (acc.type === AccountType.BANK) bankBalance = bankBalance.plus(b);
      else if (acc.type === AccountType.WALLET) walletBalance = walletBalance.plus(b);
    }

    const totalAvailableBalance = cashBalance.plus(bankBalance).plus(walletBalance).toFixed(2);

    // 3. Category Breakdown (Expenses)
    const expenseTxns = await prisma.transaction.findMany({
      where: { ...whereTx, type: TransactionType.CASH_OUT },
      include: { category: true }
    });

    const categoryMap = new Map<string, Decimal>();
    for (const tx of expenseTxns) {
      const catName = tx.category?.name || 'Uncategorized';
      const prev = categoryMap.get(catName) || new Decimal(0);
      categoryMap.set(catName, prev.plus(new Decimal(tx.amount.toString())));
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([name, total]) => ({
        name,
        value: Number(total.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);

    // 4. Monthly Cash In vs Cash Out (Last 6 Months)
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
    const recentTxns = await prisma.transaction.findMany({
      where: {
        ...(whereTx.companyId ? { companyId: whereTx.companyId } : {}),
        paymentDate: { gte: sixMonthsAgo }
      },
      select: { paymentDate: true, type: true, amount: true }
    });

    const monthlyMap = new Map<string, { month: string; cashIn: Decimal; cashOut: Decimal }>();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'MMM yyyy');
      monthlyMap.set(key, { month: key, cashIn: new Decimal(0), cashOut: new Decimal(0) });
    }

    for (const tx of recentTxns) {
      const key = format(tx.paymentDate, 'MMM yyyy');
      const entry = monthlyMap.get(key);
      if (entry) {
        if (tx.type === TransactionType.CASH_IN) {
          entry.cashIn = entry.cashIn.plus(new Decimal(tx.amount.toString()));
        } else {
          entry.cashOut = entry.cashOut.plus(new Decimal(tx.amount.toString()));
        }
      }
    }

    const monthlyComparison = Array.from(monthlyMap.values()).map((e) => ({
      month: e.month,
      cashIn: Number(e.cashIn.toFixed(2)),
      cashOut: Number(e.cashOut.toFixed(2)),
      net: Number(e.cashIn.minus(e.cashOut).toFixed(2))
    }));

    // 5. Company-Wise Financial Comparison
    const companies = await prisma.company.findMany({
      include: { accounts: true }
    });

    const companyComparison = await Promise.all(
      companies.map(async (c) => {
        const cInAgg = await prisma.transaction.aggregate({
          where: { ...whereTx, companyId: c.id, type: TransactionType.CASH_IN },
          _sum: { amount: true }
        });
        const cOutAgg = await prisma.transaction.aggregate({
          where: { ...whereTx, companyId: c.id, type: TransactionType.CASH_OUT },
          _sum: { amount: true }
        });
        const cIn = Number(cInAgg._sum.amount?.toString() || 0);
        const cOut = Number(cOutAgg._sum.amount?.toString() || 0);
        const bal = c.accounts.reduce((acc, a) => acc + Number(a.currentBalance), 0);

        return {
          companyId: c.id,
          name: c.name,
          code: c.code,
          cashIn: cIn,
          cashOut: cOut,
          net: cIn - cOut,
          balance: bal
        };
      })
    );

    // 6. Recent Transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: whereTx,
      include: {
        company: { select: { name: true, code: true } },
        account: { select: { name: true, type: true } },
        category: { select: { name: true } }
      },
      orderBy: { paymentDate: 'desc' },
      take: 8
    });

    res.json({
      success: true,
      cards: {
        totalCashIn,
        totalCashOut,
        totalExpenses,
        netCashFlow,
        totalAvailableBalance,
        cashAccountBalance: cashBalance.toFixed(2),
        bankAccountBalance: bankBalance.toFixed(2),
        walletAccountBalance: walletBalance.toFixed(2)
      },
      charts: {
        monthlyComparison,
        categoryBreakdown,
        companyComparison
      },
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Failed to generate dashboard analytics' });
  }
};
