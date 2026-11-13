"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCashIn = exports.updateCashIn = exports.getCashInList = exports.createCashIn = void 0;
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../prisma");
const decimal_js_1 = require("decimal.js");
const client_1 = require("@prisma/client");
const audit_1 = require("../utils/audit");
const createCashIn = async (req, res) => {
    try {
        const { companyId, accountId, categoryId, categoryName, amount, party, paymentDate, referenceNo, description, companyFundId } = req.body;
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
                        type: 'INCOME',
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
                            type: 'INCOME',
                            companyId
                        }
                    });
                    targetCategoryId = newCat.id;
                }
            }
            if (!targetCategoryId) {
                throw new Error('Valid income category is required');
            }
            // 2. Verify account belongs to company
            const account = await tx.account.findFirst({
                where: { id: accountId, companyId }
            });
            if (!account) {
                throw new Error('Selected account does not belong to the selected company');
            }
            // 3. If linked to CompanyFund, validate remaining balance & allocate
            let resolvedFundId = null;
            if (companyFundId && typeof companyFundId === 'string' && companyFundId.trim() && companyFundId !== 'none') {
                resolvedFundId = companyFundId.trim();
                const fund = await tx.companyFund.findUnique({ where: { id: resolvedFundId } });
                if (!fund) {
                    throw new Error('Selected Company Fund not found');
                }
                const remaining = Number(fund.totalAmount) - Number(fund.allocatedAmount);
                if (amountDec.toNumber() > remaining) {
                    throw new Error(`Allocation amount (PKR ${amountDec.toNumber().toLocaleString()}) exceeds remaining available fund balance (PKR ${remaining.toLocaleString()})`);
                }
                const newAllocated = Number(fund.allocatedAmount) + amountDec.toNumber();
                const newStatus = newAllocated >= Number(fund.totalAmount) ? 'FULLY_ALLOCATED' : 'PARTIALLY_ALLOCATED';
                await tx.companyFund.update({
                    where: { id: resolvedFundId },
                    data: {
                        allocatedAmount: newAllocated,
                        status: newStatus
                    }
                });
            }
            // 4. Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    companyId,
                    accountId,
                    categoryId: targetCategoryId,
                    type: client_1.TransactionType.CASH_IN,
                    amount: amountDec,
                    party: party.trim(),
                    paymentDate: new Date(paymentDate),
                    referenceNo: referenceNo?.trim() || null,
                    description: description?.trim() || null,
                    companyFundId: resolvedFundId,
                },
                include: {
                    company: true,
                    account: true,
                    category: true,
                    attachments: true,
                    companyFund: true
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
    }
    catch (error) {
        console.error('Error creating cash in:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to record Cash In' });
    }
};
exports.createCashIn = createCashIn;
const getCashInList = async (req, res) => {
    try {
        const { companyId, accountId, accountType, categoryId, startDate, endDate, search, page = '1', limit = '50' } = req.query;
        const where = { type: client_1.TransactionType.CASH_IN };
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
            if (categoryId === 'company_funds') {
                where.category = {
                    name: { contains: 'Fund', mode: 'insensitive' }
                };
            }
            else if (!companyId || companyId === 'all') {
                const cat = await prisma_1.prisma.category.findUnique({ where: { id: categoryId } });
                if (cat) {
                    const siblingCats = await prisma_1.prisma.category.findMany({
                        where: { name: cat.name, type: 'INCOME' },
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
                    attachments: true,
                    companyFund: {
                        select: {
                            id: true,
                            title: true,
                            receivedFrom: true,
                            attachmentUrl: true,
                            attachmentName: true
                        }
                    }
                },
                orderBy: { paymentDate: 'desc' },
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
        res.status(500).json({ success: false, message: 'Failed to fetch Cash In records' });
    }
};
exports.getCashInList = getCashInList;
const updateCashIn = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, accountId, categoryId, amount, party, paymentDate, referenceNo, description } = req.body;
        const existing = await prisma_1.prisma.transaction.findUnique({
            where: { id },
            include: { account: true, company: true }
        });
        if (!existing || existing.type !== client_1.TransactionType.CASH_IN) {
            res.status(404).json({ success: false, message: 'Cash In transaction not found' });
            return;
        }
        const newAmountDec = new decimal_js_1.Decimal(amount || existing.amount);
        if (newAmountDec.lessThanOrEqualTo(0)) {
            res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
            return;
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message || 'Failed to update Cash In' });
    }
};
exports.updateCashIn = updateCashIn;
const deleteCashIn = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.transaction.findUnique({
            where: { id },
            include: { account: true, company: true }
        });
        if (!existing || existing.type !== client_1.TransactionType.CASH_IN) {
            res.status(404).json({ success: false, message: 'Cash In transaction not found' });
            return;
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Revert account balance (decrement previously added cash)
            await tx.account.update({
                where: { id: existing.accountId },
                data: {
                    currentBalance: {
                        decrement: existing.amount
                    }
                }
            });
            // 2. If linked to CompanyFund, reverse the allocated amount on the fund
            if (existing.companyFundId) {
                const fund = await tx.companyFund.findUnique({ where: { id: existing.companyFundId } });
                if (fund) {
                    const newAllocated = Math.max(0, Number(fund.allocatedAmount) - Number(existing.amount));
                    const newStatus = newAllocated === 0 ? 'UNALLOCATED' : 'PARTIALLY_ALLOCATED';
                    await tx.companyFund.update({
                        where: { id: existing.companyFundId },
                        data: {
                            allocatedAmount: newAllocated,
                            status: newStatus
                        }
                    });
                }
            }
            // 3. Delete transaction (attachments cascade)
            await tx.transaction.delete({ where: { id } });
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.DELETE,
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete Cash In' });
    }
};
exports.deleteCashIn = deleteCashIn;
