import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { TransactionType } from '@prisma/client';

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      accountId,
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
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId as string;
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
