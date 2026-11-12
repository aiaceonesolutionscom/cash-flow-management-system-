"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountHistory = exports.updateAccountOpeningBalance = exports.getAccounts = void 0;
const prisma_1 = require("../prisma");
const money_1 = require("../utils/money");
const audit_1 = require("../utils/audit");
const client_1 = require("@prisma/client");
const decimal_js_1 = require("decimal.js");
const getAccounts = async (req, res) => {
    try {
        const { companyId } = req.query;
        const where = {};
        if (companyId && companyId !== 'all') {
            where.companyId = companyId;
        }
        const accounts = await prisma_1.prisma.account.findMany({
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
            const consolidated = {
                CASH: { id: 'CASH', name: 'Cash Account', type: 'CASH', openingBalance: '0.00', currentBalance: '0.00', company: { name: 'Combined' } },
                BANK: { id: 'BANK', name: 'Bank Account', type: 'BANK', openingBalance: '0.00', currentBalance: '0.00', company: { name: 'Combined' } },
                WALLET: { id: 'WALLET', name: 'Wallet Account', type: 'WALLET', openingBalance: '0.00', currentBalance: '0.00', company: { name: 'Combined' } }
            };
            for (const acc of accounts) {
                if (consolidated[acc.type]) {
                    consolidated[acc.type].openingBalance = new decimal_js_1.Decimal(consolidated[acc.type].openingBalance).plus(acc.openingBalance.toString()).toFixed(2);
                    consolidated[acc.type].currentBalance = new decimal_js_1.Decimal(consolidated[acc.type].currentBalance).plus(acc.currentBalance.toString()).toFixed(2);
                }
            }
            res.json({ success: true, accounts: Object.values(consolidated) });
            return;
        }
        res.json({ success: true, accounts });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch accounts' });
    }
};
exports.getAccounts = getAccounts;
const updateAccountOpeningBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { openingBalance } = req.body;
        if (openingBalance === undefined || isNaN(Number(openingBalance))) {
            res.status(400).json({ success: false, message: 'Valid opening balance number is required' });
            return;
        }
        const account = await prisma_1.prisma.account.findUnique({
            where: { id },
            include: { company: true }
        });
        if (!account) {
            res.status(404).json({ success: false, message: 'Account not found' });
            return;
        }
        const newOpeningDec = new decimal_js_1.Decimal(openingBalance);
        // Atomically recalculate balance based on transactions and transfers
        const updatedAccount = await prisma_1.prisma.$transaction(async (tx) => {
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
            const newCurrentBalance = money_1.MoneyCalculator.accountBalance({
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
        await (0, audit_1.createAuditLog)({
            action: client_1.AuditAction.BALANCE_ADJUST,
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
    }
    catch (error) {
        console.error('Error updating account opening balance:', error);
        res.status(500).json({ success: false, message: 'Failed to update opening balance' });
    }
};
exports.updateAccountOpeningBalance = updateAccountOpeningBalance;
const getAccountHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const account = await prisma_1.prisma.account.findUnique({
            where: { id },
            include: { company: true }
        });
        if (!account) {
            res.status(404).json({ success: false, message: 'Account not found' });
            return;
        }
        const transactions = await prisma_1.prisma.transaction.findMany({
            where: { accountId: id },
            include: {
                category: true
            },
            orderBy: { paymentDate: 'desc' }
        });
        const transfersFrom = await prisma_1.prisma.transfer.findMany({
            where: { fromAccountId: id },
            include: { toAccount: true },
            orderBy: { transferDate: 'desc' }
        });
        const transfersTo = await prisma_1.prisma.transfer.findMany({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch account history' });
    }
};
exports.getAccountHistory = getAccountHistory;
