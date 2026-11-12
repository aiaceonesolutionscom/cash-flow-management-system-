"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportTransactions = exports.restoreTransaction = exports.getTransactions = void 0;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
const decimal_js_1 = require("decimal.js");
const getTransactions = async (req, res) => {
    try {
        const { companyId, accountId, accountType, categoryId, type, startDate, endDate, search, page = '1', limit = '50', sortBy = 'paymentDate', sortOrder = 'desc' } = req.query;
        const where = {};
        if (companyId && companyId !== 'all') {
            where.companyId = companyId;
        }
        if (accountId && accountId !== 'all') {
            where.accountId = accountId;
        }
        if (accountType && accountType !== 'all') {
            where.account = { type: accountType };
        }
        if (categoryId && categoryId !== 'all') {
            if (!companyId || companyId === 'all') {
                const cat = await prisma_1.prisma.category.findUnique({ where: { id: categoryId } });
                if (cat) {
                    const siblingCats = await prisma_1.prisma.category.findMany({
                        where: { name: cat.name },
                        select: { id: true }
                    });
                    where.categoryId = { in: siblingCats.map(c => c.id) };
                }
                else {
                    where.categoryId = categoryId;
                }
            }
            else {
                where.categoryId = categoryId;
            }
        }
        if (type && (type === 'CASH_IN' || type === 'CASH_OUT')) {
            where.type = type;
        }
        if (startDate || endDate) {
            where.paymentDate = {};
            if (startDate)
                where.paymentDate.gte = new Date(startDate);
            if (endDate)
                where.paymentDate.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }
        if (search) {
            where.OR = [
                { party: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { referenceNo: { contains: search, mode: 'insensitive' } },
            ];
        }
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * limitNum;
        const [totalCount, transactions, cashInSum, cashOutSum] = await Promise.all([
            prisma_1.prisma.transaction.count({ where }),
            prisma_1.prisma.transaction.findMany({
                where,
                include: {
                    company: { select: { id: true, name: true, code: true } },
                    account: { select: { id: true, name: true, type: true } },
                    category: { select: { id: true, name: true, type: true } },
                    attachments: true
                },
                orderBy: {
                    [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc'
                },
                skip,
                take: limitNum
            }),
            prisma_1.prisma.transaction.aggregate({
                where: { ...where, type: client_1.TransactionType.CASH_IN },
                _sum: { amount: true }
            }),
            prisma_1.prisma.transaction.aggregate({
                where: { ...where, type: client_1.TransactionType.CASH_OUT },
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch transaction ledger' });
    }
};
exports.getTransactions = getTransactions;
const restoreTransaction = async (req, res) => {
    try {
        const { id, companyId, accountId, categoryId, type, amount, party, paymentDate, referenceNo, description } = req.body;
        if (!companyId || !accountId || !categoryId || !type || !amount || !party) {
            res.status(400).json({ success: false, message: 'Incomplete transaction snapshot for restore' });
            return;
        }
        const amountDec = new decimal_js_1.Decimal(amount);
        const restored = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Create transaction back
            const created = await tx.transaction.create({
                data: {
                    id: id || undefined,
                    companyId,
                    accountId,
                    categoryId,
                    type: type,
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
            if (type === client_1.TransactionType.CASH_IN) {
                await tx.account.update({
                    where: { id: accountId },
                    data: { currentBalance: { increment: amountDec } }
                });
            }
            else {
                await tx.account.update({
                    where: { id: accountId },
                    data: { currentBalance: { decrement: amountDec } }
                });
            }
            return created;
        });
        res.json({ success: true, message: 'Transaction restored successfully', transaction: restored });
    }
    catch (error) {
        console.error('Error restoring transaction:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to restore transaction' });
    }
};
exports.restoreTransaction = restoreTransaction;
const bulkImportTransactions = async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ success: false, message: 'Items array is required and must not be empty' });
            return;
        }
        if (items.length > 500) {
            res.status(400).json({ success: false, message: 'Maximum 500 records can be imported per batch' });
            return;
        }
        let importedCount = 0;
        await prisma_1.prisma.$transaction(async (tx) => {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item.companyId || !item.accountId || !item.categoryId || !item.type || !item.amount || !item.party) {
                    throw new Error(`Row ${i + 1}: Missing required fields (company, account, category, type, amount, party)`);
                }
                const amtNum = Number(item.amount);
                if (isNaN(amtNum) || amtNum <= 0) {
                    throw new Error(`Row ${i + 1}: Invalid amount "${item.amount}"`);
                }
                const txType = item.type === 'CASH_IN' ? client_1.TransactionType.CASH_IN : client_1.TransactionType.CASH_OUT;
                const amtDec = new decimal_js_1.Decimal(amtNum);
                await tx.transaction.create({
                    data: {
                        companyId: item.companyId,
                        accountId: item.accountId,
                        categoryId: item.categoryId,
                        type: txType,
                        amount: amtDec,
                        party: String(item.party).trim(),
                        paymentDate: new Date(item.paymentDate || new Date()),
                        referenceNo: item.referenceNo ? String(item.referenceNo).trim() : null,
                        description: item.description ? String(item.description).trim() : null
                    }
                });
                if (txType === client_1.TransactionType.CASH_IN) {
                    await tx.account.update({
                        where: { id: item.accountId },
                        data: { currentBalance: { increment: amtDec } }
                    });
                }
                else {
                    await tx.account.update({
                        where: { id: item.accountId },
                        data: { currentBalance: { decrement: amtDec } }
                    });
                }
                importedCount++;
            }
        });
        res.json({
            success: true,
            message: `Successfully imported ${importedCount} transactions.`,
            importedCount
        });
    }
    catch (error) {
        console.error('Error in bulk import:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to bulk import transactions' });
    }
};
exports.bulkImportTransactions = bulkImportTransactions;
