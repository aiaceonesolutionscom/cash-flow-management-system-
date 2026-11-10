import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { MoneyCalculator } from '../utils/money';
import { createAuditLog } from '../utils/audit';
import { AuditAction } from '@prisma/client';
import { Decimal } from 'decimal.js';

export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.query;

    const where: any = {};
    if (companyId && companyId !== 'all') {
      where.companyId = companyId as string;
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, code: true, currency: true }
        }
      },
      orderBy: [
        { company: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // When "All Companies" is selected, return the 3 consolidated account types (Cash, Bank, Wallet)
    // with combined balances across all companies so the user doesn't see 9 duplicate accounts!
    if (!companyId || companyId === 'all') {
      const consolidated: Record<string, any> = {
        CASH: { id: 'CASH', name: 'Cash Account', type: 'CASH', openingBalance: '0.00', currentBalance: '0.00', company: { name: 'Combined' } },
        BANK: { id: 'BANK', name: 'Bank Account', type: 'BANK', openingBalance: '0.00', currentBalance: '0.00', company: { name: 'Combined' } },
        WALLET: { id: 'WALLET', name: 'Wallet Account', type: 'WALLET', openingBalance: '0.00', currentBalance: '0.00', company: { name: 'Combined' } }
      };

      for (const acc of accounts) {
        if (consolidated[acc.type]) {
          consolidated[acc.type].openingBalance = new Decimal(consolidated[acc.type].openingBalance).plus(acc.openingBalance.toString()).toFixed(2);
          consolidated[acc.type].currentBalance = new Decimal(consolidated[acc.type].currentBalance).plus(acc.currentBalance.toString()).toFixed(2);
        }
      }

      res.json({ success: true, accounts: Object.values(consolidated) });
      return;
    }

    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch accounts' });
  }
};

export const updateAccountOpeningBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { openingBalance } = req.body;

    if (openingBalance === undefined || isNaN(Number(openingBalance))) {
      res.status(400).json({ success: false, message: 'Valid opening balance number is required' });
      return;
    }

    const account = await prisma.account.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }

    const newOpeningDec = new Decimal(openingBalance);

    // Atomically recalculate balance based on transactions and transfers
    const updatedAccount = await prisma.$transaction(async (tx) => {
      const cashInAgg = await tx.transaction.aggregate({
        where: { accountId: id, type: 'CASH_IN' },
        _sum: { amount: true }
      });
      const cashOutAgg = await tx.transaction.aggregate({
        where: { accountId: id, type: 'CASH_OUT' },
        _sum: { amount: true }
      });
      const transfersInAgg = await tx.transfer.aggregate({
        where: { toAccountId: id },
        _sum: { amount: true }
      });
      const transfersOutAgg = await tx.transfer.aggregate({
        where: { fromAccountId: id },
        _sum: { amount: true }
      });

      const newCurrentBalance = MoneyCalculator.accountBalance({
        openingBalance: newOpeningDec,
        totalCashIn: cashInAgg._sum.amount?.toString() || '0.00',
        totalCashOut: cashOutAgg._sum.amount?.toString() || '0.00',
        totalTransfersIn: transfersInAgg._sum.amount?.toString() || '0.00',
        totalTransfersOut: transfersOutAgg._sum.amount?.toString() || '0.00'
      });

      return tx.account.update({
        where: { id },
        data: {
          openingBalance: newOpeningDec,
          currentBalance: newCurrentBalance
        },
        include: { company: true }
      });
    });

    await createAuditLog({
      action: AuditAction.BALANCE_ADJUST,
      entity: 'ACCOUNT',
      entityId: account.id,
      details: {
        company: account.company.name,
        account: account.name,
        oldOpening: account.openingBalance.toString(),
        newOpening: newOpeningDec.toFixed(2),
        newCurrentBalance: updatedAccount.currentBalance.toString()
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Account opening balance updated and current balance recalculated successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Error updating account opening balance:', error);
    res.status(500).json({ success: false, message: 'Failed to update opening balance' });
  }
};

export const getAccountHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!account) {
      res.status(404).json({ success: false, message: 'Account not found' });
      return;
    }

    const transactions = await prisma.transaction.findMany({
      where: { accountId: id },
      include: {
        category: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    const transfersFrom = await prisma.transfer.findMany({
      where: { fromAccountId: id },
      include: { toAccount: true },
      orderBy: { transferDate: 'desc' }
    });

    const transfersTo = await prisma.transfer.findMany({
      where: { toAccountId: id },
      include: { fromAccount: true },
      orderBy: { transferDate: 'desc' }
    });

    res.json({
      success: true,
      account,
      history: {
        transactions,
        transfersFrom,
        transfersTo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch account history' });
  }
};
