"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCashOut = exports.updateCashOut = exports.getCashOutList = exports.createCashOut = void 0;
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../prisma");
const decimal_js_1 = require("decimal.js");
const client_1 = require("@prisma/client");
const audit_1 = require("../utils/audit");
const createCashOut = async (req, res) => {
    try {
        const { companyId, accountId, categoryId, categoryName, amount, party, paymentDate, referenceNo, description } = req.body;
        if (!companyId || !accountId || (!categoryId && !categoryName) || !amount || !party || !paymentDate) {
            res.status(400).json({ success: false, message: 'All required fields must be provided' });
            return;
        }
        const amountDec = new decimal_js_1.Decimal(amount);
        if (amountDec.lessThanOrEqualTo(0)) {
            res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
            return;
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Resolve category: search or auto-create to prevent duplicates
            let targetCategoryId = categoryId;
            if (categoryName && categoryName.trim()) {
                const trimmedCat = categoryName.trim();
                const existingCat = await tx.category.findFirst({
                    where: {
                        name: { equals: trimmedCat, mode: 'insensitive' },
                        type: 'EXPENSE',
                        OR: [
                            { companyId },
                            { companyId: null }
                        ]
                    }
                });
                if (existingCat) {
                    targetCategoryId = existingCat.id;
                }
                else {
                    const newCat = await tx.category.create({
                        data: {
                            name: trimmedCat,
                            type: 'EXPENSE',
                            companyId
                        }
                    });
                    targetCategoryId = newCat.id;
                }
            }
            if (!targetCategoryId) {
                throw new Error('Valid expense category is required');
            }
            // 2. Verify account belongs to company
            const account = await tx.account.findFirst({
                where: { id: accountId, companyId }
            });
            if (!account) {
                throw new Error('Selected account does not belong to the selected company');
            }
            // 3. Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    companyId,
                    accountId,
                    categoryId: targetCategoryId,
                    type: client_1.TransactionType.CASH_OUT,
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
            // 3. Atomically decrease target account balance
            await tx.account.update({
                where: { id: accountId },
                data: {
                    currentBalance: {
                        decrement: amountDec
                    }
                }
            });
            // 4. Handle attachment if uploaded (saved as bytes in PostgreSQL)
            if (req.file) {
                const fileBuffer = req.file.buffer || (req.file.path ? fs_1.default.readFileSync(req.file.path) : null);
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
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.CREATE,
            entity: 'TRANSACTION_CASH_OUT',
            entityId: result.id,
            details: {
                company: result.company.name,
                account: result.account.name,
                category: result.category.name,
                amount: amountDec.toFixed(2),
                vendor: result.party
            },
            ipAddress: req.ip
        });
        res.status(201).json({ success: true, message: 'Cash Out recorded successfully', transaction: result });
    }
    catch (error) {
        console.error('Error creating cash out:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to record Cash Out' });
    }
};
exports.createCashOut = createCashOut;
const getCashOutList = async (req, res) => {
    try {
        const { companyId, accountId, accountType, categoryId, startDate, endDate, search, page = '1', limit = '50' } = req.query;
        const where = { type: client_1.TransactionType.CASH_OUT };
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
                        where: { name: cat.name, type: 'EXPENSE' },
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
        const [totalCount, transactions, totalSum] = await Promise.all([
            prisma_1.prisma.transaction.count({ where }),
            prisma_1.prisma.transaction.findMany({
                where,
                include: {
                    company: { select: { id: true, name: true, code: true } },
                    account: { select: { id: true, name: true, type: true } },
                    category: { select: { id: true, name: true } },
                    attachments: true
                },
                orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limitNum
            }),
            prisma_1.prisma.transaction.aggregate({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch Cash Out records' });
    }
};
exports.getCashOutList = getCashOutList;
const updateCashOut = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, accountId, categoryId, amount, party, paymentDate, referenceNo, description } = req.body;
        const existing = await prisma_1.prisma.transaction.findUnique({
            where: { id },
            include: { account: true, company: true }
        });
        if (!existing || existing.type !== client_1.TransactionType.CASH_OUT) {
            res.status(404).json({ success: false, message: 'Cash Out transaction not found' });
            return;
        }
        const newAmountDec = new decimal_js_1.Decimal(amount || existing.amount);
        if (newAmountDec.lessThanOrEqualTo(0)) {
            res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
            return;
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Revert previous amount to existing account (increment back)
            await tx.account.update({
                where: { id: existing.accountId },
                data: {
                    currentBalance: {
                        increment: existing.amount
                    }
                }
            });
            // 2. Subtract new amount from target account (may be same or new account)
            const targetAccountId = accountId || existing.accountId;
            await tx.account.update({
                where: { id: targetAccountId },
                data: {
                    currentBalance: {
                        decrement: newAmountDec
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
                const fileBuffer = req.file.buffer || (req.file.path ? fs_1.default.readFileSync(req.file.path) : null);
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
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.UPDATE,
            entity: 'TRANSACTION_CASH_OUT',
            entityId: id,
            details: {
                oldAmount: existing.amount.toString(),
                newAmount: newAmountDec.toFixed(2),
                vendor: updated.party
            },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Cash Out updated successfully', transaction: updated });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to update Cash Out' });
    }
};
exports.updateCashOut = updateCashOut;
const deleteCashOut = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.transaction.findUnique({
            where: { id },
            include: { account: true, company: true }
        });
        if (!existing || existing.type !== client_1.TransactionType.CASH_OUT) {
            res.status(404).json({ success: false, message: 'Cash Out transaction not found' });
            return;
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Revert account balance (increment back previously deducted cash)
            await tx.account.update({
                where: { id: existing.accountId },
                data: {
                    currentBalance: {
                        increment: existing.amount
                    }
                }
            });
            // 2. Delete transaction (attachments cascade)
            await tx.transaction.delete({ where: { id } });
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.DELETE,
            entity: 'TRANSACTION_CASH_OUT',
            entityId: id,
            details: {
                company: existing.company.name,
                account: existing.account.name,
                amount: existing.amount.toString(),
                vendor: existing.party
            },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Cash Out deleted successfully and account balance restored' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete Cash Out' });
    }
};
exports.deleteCashOut = deleteCashOut;
