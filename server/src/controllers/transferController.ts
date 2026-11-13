import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Decimal } from 'decimal.js';
import { AuditAction } from '@prisma/client';
import { createAuditLog } from '../utils/audit';

export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, fromAccountId, toAccountId, amount, transferDate, referenceNo, notes } = req.body;

    if (!companyId || !fromAccountId || !toAccountId || !amount || !transferDate) {
      res.status(400).json({ success: false, message: 'All required transfer fields must be provided' });
      return;
    }

    if (fromAccountId === toAccountId) {
      res.status(400).json({ success: false, message: 'Source and destination accounts cannot be the same' });
      return;
    }

    const amountDec = new Decimal(amount);
    if (amountDec.lessThanOrEqualTo(0)) {
      res.status(400).json({ success: false, message: 'Transfer amount must be greater than zero' });
      return;
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // 1. Verify source and destination accounts exist (allows same company or inter-company)
      const fromAcc = await tx.account.findFirst({
        where: { id: fromAccountId, companyId },
        include: { company: true }
      });
      const toAcc = await tx.account.findFirst({
        where: { id: toAccountId },
        include: { company: true }
      });

      if (!fromAcc) {
        throw new Error('Source account does not exist in the source company');
      }
      if (!toAcc) {
        throw new Error('Destination account does not exist');
      }

      // 2. Decrement source account
      await tx.account.update({
        where: { id: fromAccountId },
        data: {
          currentBalance: {
            decrement: amountDec
          }
        }
      });

      // 3. Increment destination account
      await tx.account.update({
        where: { id: toAccountId },
        data: {
          currentBalance: {
            increment: amountDec
          }
        }
      });

      // 4. Create transfer log
      return tx.transfer.create({
        data: {
          companyId,
          fromAccountId,
          toAccountId,
          amount: amountDec,
          transferDate: new Date(transferDate),
          referenceNo: referenceNo?.trim() || null,
          notes: notes?.trim() || null
        },
        include: {
          company: true,
          fromAccount: { include: { company: true } },
          toAccount: { include: { company: true } }
        }
      });
    });

    await createAuditLog({
      action: AuditAction.TRANSFER,
      entity: 'TRANSFER',
      entityId: transfer.id,
      details: {
        fromCompany: transfer.fromAccount.company.name,
        fromAccount: transfer.fromAccount.name,
        toCompany: transfer.toAccount.company.name,
        toAccount: transfer.toAccount.name,
        amount: amountDec.toFixed(2),
        referenceNo: transfer.referenceNo
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      transfer
    });
  } catch (error: any) {
    console.error('Transfer error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to execute transfer' });
  }
};

export const getTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, accountId, startDate, endDate, search, page = '1', limit = '50' } = req.query;

    const where: any = {};

    if (companyId && companyId !== 'all') {
      where.companyId = companyId as string;
    }
    if (accountId && accountId !== 'all') {
      where.OR = [
        { fromAccountId: accountId as string },
        { toAccountId: accountId as string }
      ];
    }
    if (startDate || endDate) {
      where.transferDate = {};
      if (startDate) where.transferDate.gte = new Date(startDate as string);
      if (endDate) where.transferDate.lte = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
    }
    if (search) {
      where.OR = [
        { notes: { contains: search as string, mode: 'insensitive' } },
        { referenceNo: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, transfers, sumResult] = await Promise.all([
      prisma.transfer.count({ where }),
      prisma.transfer.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          fromAccount: {
            select: {
              id: true,
              name: true,
              type: true,
              company: { select: { id: true, name: true, code: true } }
            }
          },
          toAccount: {
            select: {
              id: true,
              name: true,
              type: true,
              company: { select: { id: true, name: true, code: true } }
            }
          }
        },
        orderBy: { transferDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.transfer.aggregate({
        where,
        _sum: { amount: true }
      })
    ]);

    res.json({
      success: true,
      transfers,
      meta: {
        totalCount,
        page: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalAmount: sumResult._sum.amount?.toString() || '0.00'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transfers' });
  }
};

export const deleteTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        company: true,
        fromAccount: true,
        toAccount: true
      }
    });

    if (!transfer) {
      res.status(404).json({ success: false, message: 'Transfer record not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Revert fromAccount (increment back)
      await tx.account.update({
        where: { id: transfer.fromAccountId },
        data: {
          currentBalance: {
            increment: transfer.amount
          }
        }
      });

      // Revert toAccount (decrement)
      await tx.account.update({
        where: { id: transfer.toAccountId },
        data: {
          currentBalance: {
            decrement: transfer.amount
          }
        }
      });

      // Delete transfer record
      await tx.transfer.delete({ where: { id } });
    });

    await createAuditLog({
      action: AuditAction.DELETE,
      entity: 'TRANSFER',
      entityId: id,
      details: {
        company: transfer.company.name,
        from: transfer.fromAccount.name,
        to: transfer.toAccount.name,
        amount: transfer.amount.toString()
      },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Transfer reversed and deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reverse and delete transfer' });
  }
};
