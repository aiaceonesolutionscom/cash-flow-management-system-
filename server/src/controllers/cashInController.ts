import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../prisma';
import { Decimal } from 'decimal.js';
import { AuditAction, TransactionType } from '@prisma/client';
import { createAuditLog } from '../utils/audit';

export const createCashIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, accountId, categoryId, amount, party, paymentDate, referenceNo, description } = req.body;

    if (!companyId || !accountId || !categoryId || !amount || !party || !paymentDate) {
      res.status(400).json({ success: false, message: 'All required fields must be provided' });
      return;
    }

    const amountDec = new Decimal(amount);
    if (amountDec.lessThanOrEqualTo(0)) {
      res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify account belongs to company
      const account = await tx.account.findFirst({
        where: { id: accountId, companyId }
      });
      if (!account) {
        throw new Error('Selected account does not belong to the selected company');
      }

      // 2. Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          accountId,
          categoryId,
          type: TransactionType.CASH_IN,
          amount: amountDec,
          party: party.trim(),
          paymentDate: new Date(paymentDate),
          referenceNo: referenceNo?.trim() || null,
          description: description?.trim() || null,
        },
        include: {
          company: true,
          account: true,
          category: true,
          attachments: true
        }
      });

      // 3. Atomically increase target account balance
      await tx.account.update({
        where: { id: accountId },
        data: {
          currentBalance: {
            increment: amountDec
          }
        }
      });

      // 4. Handle attachment if uploaded (saved as bytes in PostgreSQL)
      if (req.file) {
        const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
        await tx.attachment.create({
          data: {
            transactionId: transaction.id,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            filePath: `/uploads/${req.file.filename}`,
            fileData: fileBuffer
          }
        });
      }

      return transaction;
    });

    await createAuditLog({
      action: AuditAction.CREATE,
      entity: 'TRANSACTION_CASH_IN',
      entityId: result.id,
      details: {
        company: result.company.name,
        account: result.account.name,
        amount: amountDec.toFixed(2),
        party: result.party
      },
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'Cash In recorded successfully', transaction: result });
  } catch (error: any) {
    console.error('Error creating cash in:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to record Cash In' });
  }
};

export const getCashInList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, accountId, accountType, categoryId, startDate, endDate, search, page = '1', limit = '50' } = req.query;

    const where: any = { type: TransactionType.CASH_IN };

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
            where: { name: cat.name, type: 'INCOME' },
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

    const [totalCount, transactions, totalSum] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true } },
          attachments: true
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.transaction.aggregate({
        where,
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
        totalAmount: totalSum._sum.amount?.toString() || '0.00'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch Cash In records' });
  }
};

export const updateCashIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { companyId, accountId, categoryId, amount, party, paymentDate, referenceNo, description } = req.body;

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, company: true }
    });

    if (!existing || existing.type !== TransactionType.CASH_IN) {
      res.status(404).json({ success: false, message: 'Cash In transaction not found' });
      return;
    }

    const newAmountDec = new Decimal(amount || existing.amount);
    if (newAmountDec.lessThanOrEqualTo(0)) {
      res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Revert previous amount from existing account
      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          currentBalance: {
            decrement: existing.amount
          }
        }
      });

      // 2. Add new amount to target account (may be same or new account)
      const targetAccountId = accountId || existing.accountId;
      await tx.account.update({
        where: { id: targetAccountId },
        data: {
          currentBalance: {
            increment: newAmountDec
          }
        }
      });

      // 3. Update transaction record
      const txn = await tx.transaction.update({
        where: { id },
        data: {
          companyId: companyId || existing.companyId,
          accountId: targetAccountId,
          categoryId: categoryId || existing.categoryId,
          amount: newAmountDec,
          party: party ? party.trim() : existing.party,
          paymentDate: paymentDate ? new Date(paymentDate) : existing.paymentDate,
          referenceNo: referenceNo !== undefined ? referenceNo?.trim() || null : existing.referenceNo,
          description: description !== undefined ? description?.trim() || null : existing.description
        },
        include: {
          company: true,
          account: true,
          category: true,
          attachments: true
        }
      });

      if (req.file) {
        const fileBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
        await tx.attachment.create({
          data: {
            transactionId: txn.id,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            filePath: `/uploads/${req.file.filename}`,
            fileData: fileBuffer
          }
        });
      }

      return txn;
    });

    await createAuditLog({
      action: AuditAction.UPDATE,
      entity: 'TRANSACTION_CASH_IN',
      entityId: id,
      details: {
        oldAmount: existing.amount.toString(),
        newAmount: newAmountDec.toFixed(2),
        party: updated.party
      },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Cash In updated successfully', transaction: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to update Cash In' });
  }
};

export const deleteCashIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, company: true }
    });

    if (!existing || existing.type !== TransactionType.CASH_IN) {
      res.status(404).json({ success: false, message: 'Cash In transaction not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Revert account balance (decrement previously added cash)
      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          currentBalance: {
            decrement: existing.amount
          }
        }
      });

      // 2. Delete transaction (attachments cascade)
      await tx.transaction.delete({ where: { id } });
    });

    await createAuditLog({
      action: AuditAction.DELETE,
      entity: 'TRANSACTION_CASH_IN',
      entityId: id,
      details: {
        company: existing.company.name,
        account: existing.account.name,
        amount: existing.amount.toString(),
        party: existing.party
      },
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Cash In deleted successfully and account balance restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete Cash In' });
  }
};
