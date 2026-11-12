"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyById = exports.getCompanies = void 0;
const prisma_1 = require("../prisma");
const money_1 = require("../utils/money");
const getCompanies = async (_req, res) => {
    try {
        const companies = await prisma_1.prisma.company.findMany({
            include: {
                accounts: true,
            },
            orderBy: { name: 'asc' }
        });
        // Calculate aggregated company metrics
        const results = await Promise.all(companies.map(async (comp) => {
            const cashInAgg = await prisma_1.prisma.transaction.aggregate({
                where: { companyId: comp.id, type: 'CASH_IN' },
                _sum: { amount: true }
            });
            const cashOutAgg = await prisma_1.prisma.transaction.aggregate({
                where: { companyId: comp.id, type: 'CASH_OUT' },
                _sum: { amount: true }
            });
            const totalCashIn = cashInAgg._sum.amount?.toString() || '0.00';
            const totalCashOut = cashOutAgg._sum.amount?.toString() || '0.00';
            const netCashFlow = money_1.MoneyCalculator.netCashFlow(totalCashIn, totalCashOut).toFixed(2);
            // Sum current balances of Cash, Bank, Wallet
            const totalBalance = money_1.MoneyCalculator.sum(comp.accounts.map((a) => a.currentBalance.toString())).toFixed(2);
            return {
                ...comp,
                metrics: {
                    totalCashIn,
                    totalCashOut,
                    netCashFlow,
                    totalBalance
                }
            };
        }));
        res.json({ success: true, companies: results });
    }
    catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch companies' });
    }
};
exports.getCompanies = getCompanies;
const getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await prisma_1.prisma.company.findUnique({
            where: { id },
            include: {
                accounts: {
                    orderBy: { name: 'asc' }
                },
                categories: {
                    orderBy: { name: 'asc' }
                }
            }
        });
        if (!company) {
            res.status(404).json({ success: false, message: 'Company not found' });
            return;
        }
        res.json({ success: true, company });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch company details' });
    }
};
exports.getCompanyById = getCompanyById;
