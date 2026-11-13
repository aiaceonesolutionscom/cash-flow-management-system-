"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFund = exports.updateFund = exports.createFund = exports.getAvailableFunds = exports.getFunds = void 0;
const prisma_1 = require("../prisma");
const audit_1 = require("../utils/audit");
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const getFunds = async (req, res) => {
    try {
        const { status, search } = req.query;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (search && typeof search === 'string') {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { receivedFrom: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { receivingMethod: { contains: search, mode: 'insensitive' } }
            ];
        }
        const funds = await prisma_1.prisma.companyFund.findMany({
            where,
            include: {
                transactions: {
                    select: {
                        id: true,
                        amount: true,
                        paymentDate: true,
                        referenceNo: true,
                        description: true,
                        company: {
                            select: { id: true, name: true, code: true }
                        },
                        account: {
                            select: { id: true, name: true, type: true }
                        }
                    },
                    orderBy: { paymentDate: 'desc' }
                }
            },
            orderBy: [{ fundDate: 'desc' }, { createdAt: 'desc' }]
        });
        // Summary aggregates
        const allFunds = await prisma_1.prisma.companyFund.findMany();
        let totalFundsReceived = 0;
        let totalAllocated = 0;
        allFunds.forEach((f) => {
            totalFundsReceived += Number(f.totalAmount);
            totalAllocated += Number(f.allocatedAmount);
        });
        const remainingPoolBalance = Math.max(0, totalFundsReceived - totalAllocated);
        const formattedFunds = funds.map((f) => {
            const tot = Number(f.totalAmount);
            const alloc = Number(f.allocatedAmount);
            const remaining = Math.max(0, tot - alloc);
            return {
                ...f,
                totalAmount: tot,
                allocatedAmount: alloc,
                remainingAmount: remaining,
                allocationsCount: f.transactions.length,
                allocations: f.transactions.map((t) => ({
                    transactionId: t.id,
                    companyId: t.company.id,
                    companyName: t.company.name,
                    companyCode: t.company.code,
                    accountId: t.account.id,
                    accountName: t.account.name,
                    accountType: t.account.type,
                    amount: Number(t.amount),
                    paymentDate: t.paymentDate,
                    referenceNo: t.referenceNo,
                    description: t.description
                }))
            };
        });
        res.json({
            success: true,
            summary: {
                totalFundsReceived,
                totalAllocated,
                remainingPoolBalance,
                totalCount: allFunds.length
            },
            funds: formattedFunds
        });
    }
    catch (error) {
        console.error('Error fetching company funds:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch company funds', error: error.message });
    }
};
exports.getFunds = getFunds;
const getAvailableFunds = async (_req, res) => {
    try {
        const funds = await prisma_1.prisma.companyFund.findMany({
            where: {
                status: { in: [client_1.FundStatus.UNALLOCATED, client_1.FundStatus.PARTIALLY_ALLOCATED] }
            },
            orderBy: [{ fundDate: 'desc' }, { createdAt: 'desc' }]
        });
        const available = funds
            .map((f) => {
            const tot = Number(f.totalAmount);
            const alloc = Number(f.allocatedAmount);
            const remaining = Math.max(0, tot - alloc);
            return {
                id: f.id,
                title: f.title,
                receivedFrom: f.receivedFrom,
                receivingMethod: f.receivingMethod,
                fundDate: f.fundDate,
                totalAmount: tot,
                allocatedAmount: alloc,
                remainingAmount: remaining,
                status: f.status
            };
        })
            .filter((f) => f.remainingAmount > 0);
        res.json({
            success: true,
            funds: available
        });
    }
    catch (error) {
        console.error('Error fetching available funds:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch available funds', error: error.message });
    }
};
exports.getAvailableFunds = getAvailableFunds;
const createFund = async (req, res) => {
    try {
        const { title, totalAmount, receivedFrom, receivingMethod, fundDate, description } = req.body;
        if (!title || !totalAmount || !receivedFrom) {
            res.status(400).json({ success: false, message: 'Title, total amount, and received from (source party) are required' });
            return;
        }
        const parsedAmount = parseFloat(totalAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            res.status(400).json({ success: false, message: 'Total amount must be greater than zero' });
            return;
        }
        let attachmentUrl;
        let attachmentName;
        if (req.file) {
            attachmentUrl = `/uploads/${req.file.filename}`;
            attachmentName = req.file.originalname;
        }
        const fund = await prisma_1.prisma.companyFund.create({
            data: {
                title: title.trim(),
                totalAmount: parsedAmount,
                allocatedAmount: 0,
                receivedFrom: receivedFrom.trim(),
                receivingMethod: receivingMethod ? receivingMethod.trim() : null,
                fundDate: fundDate ? new Date(fundDate) : new Date(),
                description: description ? description.trim() : null,
                attachmentUrl,
                attachmentName,
                status: client_1.FundStatus.UNALLOCATED
            }
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.CREATE,
            entity: 'CompanyFund',
            entityId: fund.id,
            details: {
                title: fund.title,
                totalAmount: parsedAmount,
                receivedFrom: fund.receivedFrom,
                receivingMethod: fund.receivingMethod
            },
            ipAddress: req.ip
        });
        res.status(201).json({
            success: true,
            message: 'Company Fund created successfully',
            fund: {
                ...fund,
                totalAmount: Number(fund.totalAmount),
                allocatedAmount: Number(fund.allocatedAmount),
                remainingAmount: Number(fund.totalAmount)
            }
        });
    }
    catch (error) {
        console.error('Error creating company fund:', error);
        res.status(500).json({ success: false, message: 'Failed to create company fund', error: error.message });
    }
};
exports.createFund = createFund;
const updateFund = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, receivedFrom, receivingMethod, fundDate, description, totalAmount } = req.body;
        const existing = await prisma_1.prisma.companyFund.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Company fund not found' });
            return;
        }
        const data = {};
        if (title)
            data.title = title.trim();
        if (receivedFrom)
            data.receivedFrom = receivedFrom.trim();
        if (receivingMethod !== undefined)
            data.receivingMethod = receivingMethod ? receivingMethod.trim() : null;
        if (fundDate)
            data.fundDate = new Date(fundDate);
        if (description !== undefined)
            data.description = description ? description.trim() : null;
        if (totalAmount !== undefined) {
            const parsedAmount = parseFloat(totalAmount);
            if (isNaN(parsedAmount) || parsedAmount < Number(existing.allocatedAmount)) {
                res.status(400).json({
                    success: false,
                    message: `Total amount cannot be less than already allocated amount (PKR ${existing.allocatedAmount})`
                });
                return;
            }
            data.totalAmount = parsedAmount;
            if (parsedAmount === Number(existing.allocatedAmount)) {
                data.status = client_1.FundStatus.FULLY_ALLOCATED;
            }
            else if (Number(existing.allocatedAmount) > 0) {
                data.status = client_1.FundStatus.PARTIALLY_ALLOCATED;
            }
            else {
                data.status = client_1.FundStatus.UNALLOCATED;
            }
        }
        if (req.file) {
            // Remove old file if exists
            if (existing.attachmentUrl) {
                const oldPath = path_1.default.join(process.cwd(), existing.attachmentUrl.replace(/^\//, ''));
                if (fs_1.default.existsSync(oldPath)) {
                    try {
                        fs_1.default.unlinkSync(oldPath);
                    }
                    catch (e) { /* ignore */ }
                }
            }
            data.attachmentUrl = `/uploads/${req.file.filename}`;
            data.attachmentName = req.file.originalname;
        }
        const updated = await prisma_1.prisma.companyFund.update({
            where: { id },
            data
        });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.UPDATE,
            entity: 'CompanyFund',
            entityId: id,
            details: {
                title: updated.title,
                totalAmount: Number(updated.totalAmount),
                allocatedAmount: Number(updated.allocatedAmount)
            },
            ipAddress: req.ip
        });
        res.json({
            success: true,
            message: 'Company fund updated successfully',
            fund: {
                ...updated,
                totalAmount: Number(updated.totalAmount),
                allocatedAmount: Number(updated.allocatedAmount),
                remainingAmount: Math.max(0, Number(updated.totalAmount) - Number(updated.allocatedAmount))
            }
        });
    }
    catch (error) {
        console.error('Error updating company fund:', error);
        res.status(500).json({ success: false, message: 'Failed to update company fund', error: error.message });
    }
};
exports.updateFund = updateFund;
const deleteFund = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.companyFund.findUnique({
            where: { id },
            include: { transactions: true }
        });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Company fund not found' });
            return;
        }
        if (existing.transactions && existing.transactions.length > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete this fund because PKR ${existing.allocatedAmount} has already been allocated across ${existing.transactions.length} Cash In transactions. Please delete or reassign those Cash In entries first.`
            });
            return;
        }
        // Delete attachment if exists
        if (existing.attachmentUrl) {
            const filePath = path_1.default.join(process.cwd(), existing.attachmentUrl.replace(/^\//, ''));
            if (fs_1.default.existsSync(filePath)) {
                try {
                    fs_1.default.unlinkSync(filePath);
                }
                catch (e) { /* ignore */ }
            }
        }
        await prisma_1.prisma.companyFund.delete({ where: { id } });
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.DELETE,
            entity: 'CompanyFund',
            entityId: id,
            details: {
                title: existing.title,
                totalAmount: Number(existing.totalAmount),
                receivedFrom: existing.receivedFrom
            },
            ipAddress: req.ip
        });
        res.json({ success: true, message: 'Company fund deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting company fund:', error);
        res.status(500).json({ success: false, message: 'Failed to delete company fund', error: error.message });
    }
};
exports.deleteFund = deleteFund;
