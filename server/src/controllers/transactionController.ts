import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { TransactionType } from '@prisma/client';
import { Decimal } from 'decimal.js';

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      accountId,
      accountType,
      categoryId,
      type,
      startDate,
      endDate,
      search,
      page = '1',
      limit = '50',
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};

    if (companyId && companyId !== 'all') {
      where.companyId = companyId as string;
    }
    if (accountId && accountId !== 'all') {
      where.accountId = accountId as string;
    }
    if (accountType && accountType !== 'all') {
      where.account = { type: accountType };
    }
    if (categoryId && categoryId !== 'all') {
      if (!companyId || companyId === 'all') {
        const cat = await prisma.category.findUnique({ where: { id: categoryId as string } });
        if (cat) {
          const siblingCats = await prisma.category.findMany({
            where: { name: cat.name },
            select: { id: true }
          });
          where.categoryId = { in: siblingCats.map(c => c.id) };
        } else {
          where.categoryId = categoryId as string;
        }
      } else {
        where.categoryId = categoryId as string;
      }
    }
    if (type && (type === 'CASH_IN' || type === 'CASH_OUT')) {
      where.type = type as TransactionType;
    }
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
    }
    if (search) {
      where.OR = [
        { party: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { referenceNo: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, transactions, cashInSum, cashOutSum] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, type: true } },
          attachments: true
        },
        orderBy: {
          [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc'
        },
        skip,
        take: limitNum
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.CASH_IN },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.CASH_OUT },
        _sum: { amount: true }
      })
    ]);

    res.json({
      success: true,
      transactions,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCashIn: cashInSum._sum.amount?.toString() || '0.00',
        totalCashOut: cashOutSum._sum.amount?.toString() || '0.00'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transaction ledger' });
  }
};

export const restoreTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, companyId, accountId, categoryId, type, amount, party, paymentDate, referenceNo, description } = req.body;

    if (!companyId || !accountId || !categoryId || !type || !amount || !party) {
      res.status(400).json({ success: false, message: 'Incomplete transaction snapshot for restore' });
      return;
    }

    const amountDec = new Decimal(amount);

    const restored = await prisma.$transaction(async (tx) => {
      // 1. Create transaction back
      const created = await tx.transaction.create({
        data: {
          id: id || undefined,
          companyId,
          accountId,
          categoryId,
          type: type as TransactionType,
          amount: amountDec,
          party,
          paymentDate: new Date(paymentDate || new Date()),
          referenceNo: referenceNo || null,
          description: description || null
        },
        include: {
          company: true,
          account: true,
          category: true,
          attachments: true
        }
      });

      // 2. Readjust account balance
      if (type === TransactionType.CASH_IN) {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amountDec } }
        });
      } else {
        await tx.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: amountDec } }
        });
      }

      return created;
    });

    res.json({ success: true, message: 'Transaction restored successfully', transaction: restored });
  } catch (error: any) {
    console.error('Error restoring transaction:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to restore transaction' });
  }
};
