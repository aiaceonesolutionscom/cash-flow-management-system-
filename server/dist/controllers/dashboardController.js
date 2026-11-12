"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = void 0;
const prisma_1 = require("../prisma");
const money_1 = require("../utils/money");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const decimal_js_1 = require("decimal.js");
function getDateRange(range, customStart, customEnd) {
    const now = new Date();
    switch (range) {
        case 'today':
            return { gte: (0, date_fns_1.startOfDay)(now), lte: (0, date_fns_1.endOfDay)(now) };
        case 'yesterday':
            const yest = (0, date_fns_1.subDays)(now, 1);
            return { gte: (0, date_fns_1.startOfDay)(yest), lte: (0, date_fns_1.endOfDay)(yest) };
        case 'this_week':
            return { gte: (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }), lte: (0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1 }) };
        case 'this_month':
            return { gte: (0, date_fns_1.startOfMonth)(now), lte: (0, date_fns_1.endOfMonth)(now) };
        case 'last_month':
            const lastMonth = (0, date_fns_1.subMonths)(now, 1);
            return { gte: (0, date_fns_1.startOfMonth)(lastMonth), lte: (0, date_fns_1.endOfMonth)(lastMonth) };
        case 'this_year':
            return { gte: (0, date_fns_1.startOfYear)(now), lte: (0, date_fns_1.endOfYear)(now) };
        case 'custom':
            if (customStart && customEnd) {
                return {
                    gte: (0, date_fns_1.startOfDay)(new Date(customStart)),
                    lte: (0, date_fns_1.endOfDay)(new Date(customEnd))
                };
            }
            return {};
        default:
            return {};
    }
}
const getDashboardSummary = async (req, res) => {
    try {
        const { companyId, dateRange, startDate, endDate } = req.query;
        const whereTx = {};
        const whereAcc = {};
        if (companyId && companyId !== 'all') {
            whereTx.companyId = companyId;
            whereAcc.companyId = companyId;
        }
        const dateFilter = getDateRange(dateRange, startDate, endDate);
        if (dateFilter.gte || dateFilter.lte) {
            whereTx.paymentDate = dateFilter;
        }
        // 1. Calculate Transactions Totals (Cash In, Cash Out, Expenses)
        const [cashInAgg, cashOutAgg] = await Promise.all([
            prisma_1.prisma.transaction.aggregate({
                where: { ...whereTx, type: client_1.TransactionType.CASH_IN },
                _sum: { amount: true }
            }),
            prisma_1.prisma.transaction.aggregate({
                where: { ...whereTx, type: client_1.TransactionType.CASH_OUT },
                _sum: { amount: true }
            })
        ]);
        const totalCashIn = new decimal_js_1.Decimal(cashInAgg._sum.amount?.toString() || 0).toFixed(2);
        const totalCashOut = new decimal_js_1.Decimal(cashOutAgg._sum.amount?.toString() || 0).toFixed(2);
        const totalExpenses = totalCashOut; // Cash Out represents all outgoing expenses
        const netCashFlow = money_1.MoneyCalculator.netCashFlow(totalCashIn, totalCashOut).toFixed(2);
        // 2. Calculate Account Balances (Always reflects current real-time ledger balance)
        const accounts = await prisma_1.prisma.account.findMany({
            where: whereAcc,
            include: { company: true }
        });
        let cashBalance = new decimal_js_1.Decimal(0);
        let bankBalance = new decimal_js_1.Decimal(0);
        let walletBalance = new decimal_js_1.Decimal(0);
        for (const acc of accounts) {
            const b = new decimal_js_1.Decimal(acc.currentBalance.toString());
            if (acc.type === client_1.AccountType.CASH)
                cashBalance = cashBalance.plus(b);
            else if (acc.type === client_1.AccountType.BANK)
                bankBalance = bankBalance.plus(b);
            else if (acc.type === client_1.AccountType.WALLET)
                walletBalance = walletBalance.plus(b);
        }
        const totalAvailableBalance = cashBalance.plus(bankBalance).plus(walletBalance).toFixed(2);
        // 3. Category Breakdown (Expenses)
        const expenseTxns = await prisma_1.prisma.transaction.findMany({
            where: { ...whereTx, type: client_1.TransactionType.CASH_OUT },
            include: { category: true }
        });
        const categoryMap = new Map();
        for (const tx of expenseTxns) {
            const catName = tx.category?.name || 'Uncategorized';
            const prev = categoryMap.get(catName) || new decimal_js_1.Decimal(0);
            categoryMap.set(catName, prev.plus(new decimal_js_1.Decimal(tx.amount.toString())));
        }
        const categoryBreakdown = Array.from(categoryMap.entries())
            .map(([name, total]) => ({
            name,
            value: Number(total.toFixed(2))
        }))
            .sort((a, b) => b.value - a.value);
        // 4. Monthly Cash In vs Cash Out (Last 6 Months)
        const sixMonthsAgo = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(new Date(), 5));
        const recentTxns = await prisma_1.prisma.transaction.findMany({
            where: {
                ...(whereTx.companyId ? { companyId: whereTx.companyId } : {}),
                paymentDate: { gte: sixMonthsAgo }
            },
            select: { paymentDate: true, type: true, amount: true }
        });
        const monthlyMap = new Map();
        for (let i = 5; i >= 0; i--) {
            const d = (0, date_fns_1.subMonths)(new Date(), i);
            const key = (0, date_fns_1.format)(d, 'MMM yyyy');
            monthlyMap.set(key, { month: key, cashIn: new decimal_js_1.Decimal(0), cashOut: new decimal_js_1.Decimal(0) });
        }
        for (const tx of recentTxns) {
            const key = (0, date_fns_1.format)(tx.paymentDate, 'MMM yyyy');
            const entry = monthlyMap.get(key);
            if (entry) {
                if (tx.type === client_1.TransactionType.CASH_IN) {
                    entry.cashIn = entry.cashIn.plus(new decimal_js_1.Decimal(tx.amount.toString()));
                }
                else {
                    entry.cashOut = entry.cashOut.plus(new decimal_js_1.Decimal(tx.amount.toString()));
                }
            }
        }
        const monthlyComparison = Array.from(monthlyMap.values()).map((e) => ({
            month: e.month,
            cashIn: Number(e.cashIn.toFixed(2)),
            cashOut: Number(e.cashOut.toFixed(2)),
            net: Number(e.cashIn.minus(e.cashOut).toFixed(2))
        }));
        // 5. Company-Wise Financial Comparison
        const companies = await prisma_1.prisma.company.findMany({
            include: { accounts: true }
        });
        const companyComparison = await Promise.all(companies.map(async (c) => {
            const cInAgg = await prisma_1.prisma.transaction.aggregate({
                where: { ...whereTx, companyId: c.id, type: client_1.TransactionType.CASH_IN },
                _sum: { amount: true }
            });
            const cOutAgg = await prisma_1.prisma.transaction.aggregate({
                where: { ...whereTx, companyId: c.id, type: client_1.TransactionType.CASH_OUT },
                _sum: { amount: true }
            });
            const cIn = Number(cInAgg._sum.amount?.toString() || 0);
            const cOut = Number(cOutAgg._sum.amount?.toString() || 0);
            const bal = c.accounts.reduce((acc, a) => acc + Number(a.currentBalance), 0);
            return {
                companyId: c.id,
                name: c.name,
                code: c.code,
                cashIn: cIn,
                cashOut: cOut,
                net: cIn - cOut,
                balance: bal
            };
        }));
        // 6. Recent Transactions
        const recentTransactions = await prisma_1.prisma.transaction.findMany({
            where: whereTx,
            include: {
                company: { select: { name: true, code: true } },
                account: { select: { name: true, type: true } },
                category: { select: { name: true } }
            },
            orderBy: { paymentDate: 'desc' },
            take: 8
        });
        // 7. Company Funds Injected (Category: "Company Funds")
        const fundsInjectedAgg = await prisma_1.prisma.transaction.aggregate({
            where: {
                ...whereTx,
                type: client_1.TransactionType.CASH_IN,
                category: {
                    name: { contains: 'Fund', mode: 'insensitive' }
                }
            },
            _sum: { amount: true }
        });
        const totalFundsInjected = Number(fundsInjectedAgg._sum.amount?.toString() || 0);
        // 8. Active Company Requirements / Notes
        const whereNotes = {
            status: { in: ['PENDING', 'IN_PROGRESS'] }
        };
        if (companyId && companyId !== 'all') {
            whereNotes.companyId = companyId;
        }
        const activeNotes = await prisma_1.prisma.companyNote.findMany({
            where: whereNotes,
            include: {
                company: { select: { id: true, name: true, code: true } },
                items: true
            },
            orderBy: [
                { priority: 'asc' },
                { dueDate: 'asc' },
                { createdAt: 'desc' }
            ],
            take: 5
        });
        const activeNotesAgg = await prisma_1.prisma.companyNote.aggregate({
            where: whereNotes,
            _sum: { totalAmount: true },
            _count: { id: true }
        });
        const totalRequirementsPending = Number(activeNotesAgg._sum.totalAmount?.toString() || 0);
        const activeRequirementsCount = activeNotesAgg._count.id || 0;
        res.json({
            success: true,
            cards: {
                totalCashIn,
                totalCashOut,
                totalExpenses,
                netCashFlow,
                totalAvailableBalance,
                cashAccountBalance: cashBalance.toFixed(2),
                bankAccountBalance: bankBalance.toFixed(2),
                walletAccountBalance: walletBalance.toFixed(2),
                totalFundsInjected,
                totalRequirementsPending,
                activeRequirementsCount
            },
            charts: {
                monthlyComparison,
                categoryBreakdown,
                companyComparison
            },
            recentTransactions,
            activeNotes
        });
    }
    catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ success: false, message: 'Failed to generate dashboard analytics' });
    }
};
exports.getDashboardSummary = getDashboardSummary;
