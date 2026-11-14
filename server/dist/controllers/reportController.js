"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReportCSV = exports.exportReportPDF = exports.exportReportExcel = exports.getFinancialReport = void 0;
const prisma_1 = require("../prisma");
const client_1 = require("@prisma/client");
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const date_fns_1 = require("date-fns");
const decimal_js_1 = require("decimal.js");
// Helper to construct complete, multi-filter where clause
async function buildReportWhere(query) {
    const { companyId, startDate, endDate, accountType, accountId, categoryId, type, search } = query;
    const where = {};
    if (companyId && companyId !== 'all') {
        where.companyId = companyId;
    }
    if (startDate || endDate) {
        where.paymentDate = {};
        if (startDate)
            where.paymentDate.gte = new Date(startDate);
        if (endDate)
            where.paymentDate.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }
    if (accountType && accountType !== 'all') {
        where.account = { type: accountType };
    }
    if (accountId && accountId !== 'all') {
        where.accountId = accountId;
    }
    if (categoryId && categoryId !== 'all') {
        if (!companyId || companyId === 'all') {
            const cat = await prisma_1.prisma.category.findUnique({ where: { id: categoryId } });
            if (cat) {
                const siblingCats = await prisma_1.prisma.category.findMany({
                    where: { name: cat.name },
                    select: { id: true }
                });
                where.categoryId = { in: siblingCats.map((c) => c.id) };
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
    if (search) {
        where.OR = [
            { party: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { referenceNo: { contains: search, mode: 'insensitive' } },
        ];
    }
    return where;
}
const getFinancialReport = async (req, res) => {
    try {
        const { reportType = 'cash_flow', companyId, status, priority } = req.query;
        // 1. DEDICATED REPORT: Company Requirements / Demands Notes
        if (reportType === 'company_requirements') {
            const noteWhere = {};
            if (companyId && companyId !== 'all') {
                noteWhere.companyId = companyId;
            }
            if (status && status !== 'all') {
                noteWhere.status = status;
            }
            if (priority && priority !== 'all') {
                noteWhere.priority = priority;
            }
            const notes = await prisma_1.prisma.companyNote.findMany({
                where: noteWhere,
                include: {
                    company: { select: { id: true, name: true, code: true } },
                    items: { orderBy: { createdAt: 'asc' } }
                },
                orderBy: [
                    { status: 'asc' },
                    { dueDate: 'asc' },
                    { createdAt: 'desc' }
                ]
            });
            let grandTotal = 0;
            let pendingTotal = 0;
            let fulfilledTotal = 0;
            const companyMap = new Map();
            notes.forEach((n) => {
                const amt = Number(n.totalAmount) || 0;
                grandTotal += amt;
                if (n.status === 'PENDING' || n.status === 'IN_PROGRESS') {
                    pendingTotal += amt;
                }
                else if (n.status === 'FULFILLED') {
                    fulfilledTotal += amt;
                }
                const compEntry = companyMap.get(n.companyId) || {
                    companyName: n.company.name,
                    total: 0,
                    pending: 0,
                    count: 0
                };
                compEntry.total += amt;
                if (n.status === 'PENDING' || n.status === 'IN_PROGRESS') {
                    compEntry.pending += amt;
                }
                compEntry.count += 1;
                companyMap.set(n.companyId, compEntry);
            });
            res.json({
                success: true,
                reportType: 'company_requirements',
                grandTotal: grandTotal.toFixed(2),
                pendingTotal: pendingTotal.toFixed(2),
                fulfilledTotal: fulfilledTotal.toFixed(2),
                totalCount: notes.length,
                companySummaries: Array.from(companyMap.values()).map((c) => ({
                    companyName: c.companyName,
                    total: c.total.toFixed(2),
                    pending: c.pending.toFixed(2),
                    count: c.count
                })),
                notes
            });
            return;
        }
        // 2. DEDICATED REPORT: Company Funds Statement
        if (reportType === 'company_funds') {
            const { status, startDate, endDate, search } = req.query;
            const fundWhere = {};
            if (status && status !== 'all') {
                fundWhere.status = status;
            }
            if (startDate || endDate) {
                fundWhere.fundDate = {};
                if (startDate)
                    fundWhere.fundDate.gte = new Date(startDate);
                if (endDate)
                    fundWhere.fundDate.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            }
            if (search) {
                fundWhere.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { receivedFrom: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { receivingMethod: { contains: search, mode: 'insensitive' } }
                ];
            }
            const rawFunds = await prisma_1.prisma.companyFund.findMany({
                where: fundWhere,
                include: {
                    transactions: {
                        include: {
                            company: { select: { id: true, name: true, code: true } },
                            account: { select: { id: true, name: true, type: true } },
                            category: { select: { id: true, name: true } }
                        },
                        orderBy: { paymentDate: 'desc' }
                    }
                },
                orderBy: { fundDate: 'desc' }
            });
            let totalInjected = new decimal_js_1.Decimal(0);
            let totalAllocated = new decimal_js_1.Decimal(0);
            let totalRemaining = new decimal_js_1.Decimal(0);
            const funds = rawFunds.map((f) => {
                const tot = new decimal_js_1.Decimal(f.totalAmount.toString());
                const alloc = new decimal_js_1.Decimal(f.allocatedAmount.toString());
                const rem = tot.minus(alloc);
                totalInjected = totalInjected.plus(tot);
                totalAllocated = totalAllocated.plus(alloc);
                totalRemaining = totalRemaining.plus(rem);
                return {
                    id: f.id,
                    title: f.title,
                    description: f.description,
                    totalAmount: tot.toFixed(2),
                    allocatedAmount: alloc.toFixed(2),
                    remainingAmount: rem.toFixed(2),
                    receivedFrom: f.receivedFrom,
                    receivingMethod: f.receivingMethod,
                    fundDate: f.fundDate,
                    status: f.status,
                    attachmentUrl: f.attachmentUrl,
                    attachmentName: f.attachmentName,
                    allocations: f.transactions.map((tx) => ({
                        id: tx.id,
                        companyName: tx.company.name,
                        accountName: tx.account.name,
                        categoryName: tx.category?.name || 'Company Funds',
                        amount: Number(tx.amount).toFixed(2),
                        paymentDate: tx.paymentDate,
                        referenceNo: tx.referenceNo,
                        description: tx.description
                    }))
                };
            });
            res.json({
                success: true,
                reportType: 'company_funds',
                summary: {
                    totalFundsInjected: totalInjected.toFixed(2),
                    totalAllocated: totalAllocated.toFixed(2),
                    remainingBalance: totalRemaining.toFixed(2),
                    totalCount: funds.length
                },
                funds
            });
            return;
        }
        const where = await buildReportWhere(req.query);
        const transactions = await prisma_1.prisma.transaction.findMany({
            where,
            include: {
                company: { select: { id: true, name: true, code: true } },
                account: { select: { id: true, name: true, type: true } },
                category: { select: { id: true, name: true, type: true } },
                companyFund: { select: { id: true, title: true, receivedFrom: true } },
                attachments: { select: { id: true, originalName: true, mimeType: true } }
            },
            orderBy: { paymentDate: 'desc' }
        });
        const accounts = await prisma_1.prisma.account.findMany({
            where: companyId && companyId !== 'all' ? { companyId: companyId } : {},
            include: { company: true }
        });
        let totalCashIn = new decimal_js_1.Decimal(0);
        let totalCashOut = new decimal_js_1.Decimal(0);
        const categoryTotals = new Map();
        const companyTotals = new Map();
        const monthlyData = new Map();
        for (const t of transactions) {
            const amt = new decimal_js_1.Decimal(t.amount.toString());
            const compName = t.company.name;
            const catName = t.category.name;
            const monthKey = (0, date_fns_1.format)(t.paymentDate, 'yyyy-MM');
            if (t.type === client_1.TransactionType.CASH_IN) {
                totalCashIn = totalCashIn.plus(amt);
            }
            else {
                totalCashOut = totalCashOut.plus(amt);
            }
            // Category map
            const catEntry = categoryTotals.get(catName) || { type: t.category.type, total: new decimal_js_1.Decimal(0) };
            catEntry.total = catEntry.total.plus(amt);
            categoryTotals.set(catName, catEntry);
            // Company map
            const compEntry = companyTotals.get(compName) || { cashIn: new decimal_js_1.Decimal(0), cashOut: new decimal_js_1.Decimal(0) };
            if (t.type === client_1.TransactionType.CASH_IN)
                compEntry.cashIn = compEntry.cashIn.plus(amt);
            else
                compEntry.cashOut = compEntry.cashOut.plus(amt);
            companyTotals.set(compName, compEntry);
            // Monthly map
            const mEntry = monthlyData.get(monthKey) || { cashIn: new decimal_js_1.Decimal(0), cashOut: new decimal_js_1.Decimal(0) };
            if (t.type === client_1.TransactionType.CASH_IN)
                mEntry.cashIn = mEntry.cashIn.plus(amt);
            else
                mEntry.cashOut = mEntry.cashOut.plus(amt);
            monthlyData.set(monthKey, mEntry);
        }
        const netCashFlow = totalCashIn.minus(totalCashOut);
        res.json({
            success: true,
            reportType,
            summary: {
                totalCashIn: totalCashIn.toFixed(2),
                totalCashOut: totalCashOut.toFixed(2),
                netCashFlow: netCashFlow.toFixed(2),
                transactionCount: transactions.length
            },
            categories: Array.from(categoryTotals.entries()).map(([name, data]) => ({
                name,
                type: data.type,
                total: data.total.toFixed(2)
            })),
            companies: Array.from(companyTotals.entries()).map(([name, data]) => ({
                name,
                cashIn: data.cashIn.toFixed(2),
                cashOut: data.cashOut.toFixed(2),
                net: data.cashIn.minus(data.cashOut).toFixed(2)
            })),
            accounts: accounts.map((a) => ({
                company: a.company.name,
                name: a.name,
                type: a.type,
                openingBalance: a.openingBalance.toString(),
                currentBalance: a.currentBalance.toString()
            })),
            monthly: Array.from(monthlyData.entries()).map(([month, data]) => ({
                month,
                cashIn: data.cashIn.toFixed(2),
                cashOut: data.cashOut.toFixed(2),
                net: data.cashIn.minus(data.cashOut).toFixed(2)
            })),
            transactions
        });
    }
    catch (error) {
        console.error('Error compiling financial report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate financial report' });
    }
};
exports.getFinancialReport = getFinancialReport;
const exportReportExcel = async (req, res) => {
    try {
        const { reportType, companyId, status, priority } = req.query;
        // Excel Export for Company Requirements / Demands
        if (reportType === 'company_requirements') {
            const noteWhere = {};
            if (companyId && companyId !== 'all')
                noteWhere.companyId = companyId;
            if (status && status !== 'all')
                noteWhere.status = status;
            if (priority && priority !== 'all')
                noteWhere.priority = priority;
            const notes = await prisma_1.prisma.companyNote.findMany({
                where: noteWhere,
                include: {
                    company: true,
                    items: { orderBy: { createdAt: 'asc' } }
                },
                orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
            });
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = 'CASHFLOW Financial Management System';
            workbook.created = new Date();
            const sheet = workbook.addWorksheet('Company Requirements');
            sheet.columns = [
                { header: 'Created Date', key: 'date', width: 14 },
                { header: 'Company', key: 'company', width: 28 },
                { header: 'Requirement / Purpose', key: 'title', width: 26 },
                { header: 'Line Items Breakdown', key: 'items', width: 45 },
                { header: 'Priority', key: 'priority', width: 14 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Due Date', key: 'dueDate', width: 14 },
                { header: 'Total Amount (PKR)', key: 'amount', width: 22 }
            ];
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E40AF' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 26;
            let grandTotal = 0;
            let pendingTotal = 0;
            notes.forEach((n) => {
                const amt = Number(n.totalAmount);
                grandTotal += amt;
                if (n.status === 'PENDING' || n.status === 'IN_PROGRESS')
                    pendingTotal += amt;
                const itemsStr = n.items.map((it) => `${it.itemName}: PKR ${Number(it.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`).join(' | ');
                const row = sheet.addRow({
                    date: (0, date_fns_1.format)(n.createdAt, 'yyyy-MM-dd'),
                    company: n.company.name,
                    title: n.title,
                    items: itemsStr,
                    priority: n.priority,
                    status: n.status,
                    dueDate: n.dueDate ? (0, date_fns_1.format)(n.dueDate, 'yyyy-MM-dd') : '—',
                    amount: amt
                });
                row.getCell('amount').numFmt = '#,##0.00';
                row.getCell('amount').font = { bold: true, color: { argb: n.status === 'FULFILLED' ? 'FF059669' : 'FF2563EB' } };
            });
            sheet.addRow({});
            const pendingRow = sheet.addRow({ title: 'TOTAL PENDING DEMANDS', amount: pendingTotal });
            pendingRow.font = { bold: true };
            pendingRow.getCell('amount').numFmt = '#,##0.00';
            pendingRow.getCell('amount').font = { color: { argb: 'FFDC2626' }, bold: true };
            const grandRow = sheet.addRow({ title: 'GRAND TOTAL ALL REQUIREMENTS', amount: grandTotal });
            grandRow.font = { bold: true };
            grandRow.getCell('amount').numFmt = '#,##0.00';
            grandRow.getCell('amount').font = { color: { argb: 'FF1E40AF' }, bold: true };
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Company_Requirements_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
            return;
        }
        // Dedicated Excel Export for Company Funds Statement
        if (reportType === 'company_funds') {
            const { status, startDate, endDate, search } = req.query;
            const fundWhere = {};
            if (status && status !== 'all')
                fundWhere.status = status;
            if (startDate || endDate) {
                fundWhere.fundDate = {};
                if (startDate)
                    fundWhere.fundDate.gte = new Date(startDate);
                if (endDate)
                    fundWhere.fundDate.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            }
            if (search) {
                fundWhere.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { receivedFrom: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { receivingMethod: { contains: search, mode: 'insensitive' } }
                ];
            }
            const funds = await prisma_1.prisma.companyFund.findMany({
                where: fundWhere,
                include: {
                    transactions: {
                        include: {
                            company: true,
                            account: true,
                            category: true
                        },
                        orderBy: { paymentDate: 'desc' }
                    }
                },
                orderBy: { fundDate: 'desc' }
            });
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = 'CASHFLOW Financial Management System';
            workbook.created = new Date();
            // Sheet 1: Master Capital Inflows
            const sheet = workbook.addWorksheet('Central Funds Pool');
            sheet.columns = [
                { header: 'Date', key: 'date', width: 14 },
                { header: 'Fund Title', key: 'title', width: 28 },
                { header: 'Investor / Source', key: 'receivedFrom', width: 26 },
                { header: 'Receiving Method', key: 'receivingMethod', width: 20 },
                { header: 'Total Inflow (PKR)', key: 'totalAmount', width: 20 },
                { header: 'Allocated to Companies (PKR)', key: 'allocatedAmount', width: 24 },
                { header: 'Remaining Balance (PKR)', key: 'remainingAmount', width: 22 },
                { header: 'Status', key: 'status', width: 18 },
                { header: 'Allocations Count', key: 'allocCount', width: 16 }
            ];
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E40AF' }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 26;
            let totalInjected = 0;
            let totalAllocated = 0;
            let totalRemaining = 0;
            funds.forEach((f) => {
                const tot = Number(f.totalAmount);
                const alloc = Number(f.allocatedAmount);
                const rem = tot - alloc;
                totalInjected += tot;
                totalAllocated += alloc;
                totalRemaining += rem;
                const row = sheet.addRow({
                    date: (0, date_fns_1.format)(f.fundDate, 'yyyy-MM-dd'),
                    title: f.title,
                    receivedFrom: f.receivedFrom,
                    receivingMethod: f.receivingMethod || '—',
                    totalAmount: tot,
                    allocatedAmount: alloc,
                    remainingAmount: rem,
                    status: f.status,
                    allocCount: f.transactions.length
                });
                row.getCell('totalAmount').numFmt = '#,##0.00';
                row.getCell('allocatedAmount').numFmt = '#,##0.00';
                row.getCell('remainingAmount').numFmt = '#,##0.00';
                row.getCell('remainingAmount').font = { bold: true, color: { argb: 'FF1E40AF' } };
            });
            sheet.addRow({});
            const summaryRow = sheet.addRow({
                receivedFrom: 'TOTAL SUMMARY',
                totalAmount: totalInjected,
                allocatedAmount: totalAllocated,
                remainingAmount: totalRemaining
            });
            summaryRow.font = { bold: true };
            summaryRow.getCell('totalAmount').numFmt = '#,##0.00';
            summaryRow.getCell('allocatedAmount').numFmt = '#,##0.00';
            summaryRow.getCell('remainingAmount').numFmt = '#,##0.00';
            summaryRow.getCell('remainingAmount').font = { color: { argb: 'FF059669' }, bold: true };
            // Sheet 2: Allocations Breakdown
            const allocSheet = workbook.addWorksheet('Company Allocations');
            allocSheet.columns = [
                { header: 'Allocation Date', key: 'date', width: 14 },
                { header: 'Fund Title', key: 'fundTitle', width: 28 },
                { header: 'Investor / Source', key: 'source', width: 22 },
                { header: 'Receiving Company', key: 'company', width: 26 },
                { header: 'Receiving Account', key: 'account', width: 20 },
                { header: 'Category', key: 'category', width: 22 },
                { header: 'Allocated Amount (PKR)', key: 'amount', width: 22 },
                { header: 'Reference #', key: 'ref', width: 18 },
                { header: 'Description / Notes', key: 'notes', width: 30 }
            ];
            const allocHeader = allocSheet.getRow(1);
            allocHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            allocHeader.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF059669' }
            };
            allocHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            allocHeader.height = 26;
            funds.forEach((f) => {
                f.transactions.forEach((tx) => {
                    const row = allocSheet.addRow({
                        date: (0, date_fns_1.format)(tx.paymentDate, 'yyyy-MM-dd'),
                        fundTitle: f.title,
                        source: f.receivedFrom,
                        company: tx.company.name,
                        account: tx.account.name,
                        category: tx.category?.name || 'Company Funds',
                        amount: Number(tx.amount),
                        ref: tx.referenceNo || '—',
                        notes: tx.description || '—'
                    });
                    row.getCell('amount').numFmt = '#,##0.00';
                    row.getCell('amount').font = { bold: true, color: { argb: 'FF059669' } };
                });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Company_Funds_Statement_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
            return;
        }
        const where = await buildReportWhere(req.query);
        const transactions = await prisma_1.prisma.transaction.findMany({
            where,
            include: {
                company: true,
                account: true,
                category: true,
                companyFund: true
            },
            orderBy: { paymentDate: 'desc' }
        });
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = 'CASHFLOW Financial Management System';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet(reportType === 'company_funds' ? 'Company Funds Report' : 'Financial Ledger Report');
        sheet.columns = [
            { header: 'Date', key: 'date', width: 14 },
            { header: 'Company', key: 'company', width: 28 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Category', key: 'category', width: 24 },
            { header: 'Party / Vendor', key: 'party', width: 28 },
            { header: 'Payment Method', key: 'account', width: 18 },
            { header: 'Amount (PKR)', key: 'amount', width: 20 },
            { header: 'Reference #', key: 'reference', width: 20 },
            { header: 'Description / Notes', key: 'description', width: 35 }
        ];
        // Style Header Row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E40AF' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 26;
        let totalIn = 0;
        let totalOut = 0;
        transactions.forEach((tx) => {
            const amt = Number(tx.amount);
            if (tx.type === client_1.TransactionType.CASH_IN)
                totalIn += amt;
            else
                totalOut += amt;
            const row = sheet.addRow({
                date: (0, date_fns_1.format)(tx.paymentDate, 'yyyy-MM-dd'),
                company: tx.company.name,
                type: tx.type === client_1.TransactionType.CASH_IN ? 'Cash In (+)' : 'Cash Out (-)',
                category: tx.category.name,
                party: tx.party,
                account: tx.account.name,
                amount: amt,
                reference: tx.referenceNo || '—',
                description: tx.description || '—'
            });
            row.getCell('amount').numFmt = '#,##0.00';
            if (tx.type === client_1.TransactionType.CASH_IN) {
                row.getCell('amount').font = { color: { argb: 'FF059669' }, bold: true };
            }
            else {
                row.getCell('amount').font = { color: { argb: 'FFDC2626' }, bold: true };
            }
        });
        // Summary Rows
        sheet.addRow({});
        const totalInRow = sheet.addRow({ party: 'TOTAL CASH INFLOW', amount: totalIn });
        totalInRow.font = { bold: true };
        totalInRow.getCell('amount').numFmt = '#,##0.00';
        totalInRow.getCell('amount').font = { color: { argb: 'FF059669' }, bold: true };
        const totalOutRow = sheet.addRow({ party: 'TOTAL CASH OUTFLOW', amount: totalOut });
        totalOutRow.font = { bold: true };
        totalOutRow.getCell('amount').numFmt = '#,##0.00';
        totalOutRow.getCell('amount').font = { color: { argb: 'FFDC2626' }, bold: true };
        const netRow = sheet.addRow({ party: 'NET CASH FLOW', amount: totalIn - totalOut });
        netRow.font = { bold: true, color: { argb: totalIn - totalOut >= 0 ? 'FF059669' : 'FFDC2626' } };
        netRow.getCell('amount').numFmt = '#,##0.00';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=CashFlow_Report_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate Excel report' });
    }
};
exports.exportReportExcel = exportReportExcel;
const exportReportPDF = async (req, res) => {
    try {
        const { reportType, companyId, status, priority } = req.query;
        // 1. PDF Export for Company Requirements / Demands
        if (reportType === 'company_requirements') {
            const noteWhere = {};
            if (companyId && companyId !== 'all')
                noteWhere.companyId = companyId;
            if (status && status !== 'all')
                noteWhere.status = status;
            if (priority && priority !== 'all')
                noteWhere.priority = priority;
            const notes = await prisma_1.prisma.companyNote.findMany({
                where: noteWhere,
                include: {
                    company: true,
                    items: { orderBy: { createdAt: 'asc' } }
                },
                orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
            });
            let grandTotal = 0;
            let pendingTotal = 0;
            let fulfilledTotal = 0;
            notes.forEach((n) => {
                const amt = Number(n.totalAmount) || 0;
                grandTotal += amt;
                if (n.status === 'PENDING' || n.status === 'IN_PROGRESS')
                    pendingTotal += amt;
                else if (n.status === 'FULFILLED')
                    fulfilledTotal += amt;
            });
            const doc = new pdfkit_1.default({
                size: 'A4',
                layout: 'landscape',
                margin: 36,
                bufferPages: true
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Company_Requirements_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
            doc.pipe(res);
            const pageWidth = doc.page.width;
            const contentWidth = pageWidth - 72; // 770 pt
            const drawReqHeader = (y) => {
                doc.rect(36, y, contentWidth, 20).fill('#1e40af');
                doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
                doc.text('Date', 42, y + 5, { width: 60 });
                doc.text('Company', 106, y + 5, { width: 110 });
                doc.text('Requirement Title', 220, y + 5, { width: 120 });
                doc.text('Line Items Breakdown', 344, y + 5, { width: 220 });
                doc.text('Priority', 568, y + 5, { width: 55 });
                doc.text('Status', 627, y + 5, { width: 65 });
                doc.text('Amount (PKR)', 696, y + 5, { width: 102, align: 'right' });
            };
            // Header Title
            doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('CASHFLOW FINANCIAL MANAGEMENT SYSTEM', 36, 32);
            doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Company Financial Requirements & Demands Statement  •  Generated: ${(0, date_fns_1.format)(new Date(), 'dd MMMM yyyy, hh:mm a')}`, 36, 52);
            // KPI Cards
            const kpiY = 70;
            const cardWidth = (contentWidth - 24) / 4;
            // Card 1: Pending Total
            doc.rect(36, kpiY, cardWidth, 42).fillAndStroke('#fff1f2', '#fecdd3');
            doc.fillColor('#9f1239').fontSize(8).font('Helvetica-Bold').text('PENDING DEMANDS', 44, kpiY + 8);
            doc.fillColor('#dc2626').fontSize(11).font('Helvetica-Bold').text(`PKR ${pendingTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 44, kpiY + 22);
            // Card 2: Fulfilled Total
            doc.rect(36 + cardWidth + 8, kpiY, cardWidth, 42).fillAndStroke('#ecfdf5', '#a7f3d0');
            doc.fillColor('#065f46').fontSize(8).font('Helvetica-Bold').text('FULFILLED DEMANDS', 36 + cardWidth + 16, kpiY + 8);
            doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text(`PKR ${fulfilledTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 36 + cardWidth + 16, kpiY + 22);
            // Card 3: Grand Total
            doc.rect(36 + (cardWidth + 8) * 2, kpiY, cardWidth, 42).fillAndStroke('#eff6ff', '#bfdbfe');
            doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold').text('GRAND TOTAL REQUIRED', 36 + (cardWidth + 8) * 2 + 8, kpiY + 8);
            doc.fillColor('#2563eb').fontSize(11).font('Helvetica-Bold').text(`PKR ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 36 + (cardWidth + 8) * 2 + 8, kpiY + 22);
            // Card 4: Total Records
            doc.rect(36 + (cardWidth + 8) * 3, kpiY, cardWidth, 42).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('TOTAL DEMANDS', 36 + (cardWidth + 8) * 3 + 8, kpiY + 8);
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${notes.length} Demands`, 36 + (cardWidth + 8) * 3 + 8, kpiY + 22);
            let currentY = 126;
            drawReqHeader(currentY);
            currentY += 20;
            doc.font('Helvetica').fontSize(8);
            notes.forEach((n, idx) => {
                if (currentY > 510) {
                    doc.addPage();
                    currentY = 36;
                    drawReqHeader(currentY);
                    currentY += 20;
                    doc.font('Helvetica').fontSize(8);
                }
                if (idx % 2 === 0) {
                    doc.rect(36, currentY, contentWidth, 20).fill('#f8fafc');
                }
                const itemsSummary = n.items.map((it) => `${it.itemName} (${Number(it.amount).toLocaleString('en-US')})`).join(', ');
                doc.fillColor('#334155');
                doc.text((0, date_fns_1.format)(n.createdAt, 'yyyy-MM-dd'), 42, currentY + 5, { width: 60 });
                doc.text(n.company.name.slice(0, 18), 106, currentY + 5, { width: 110 });
                doc.font('Helvetica-Bold').text(n.title.slice(0, 22), 220, currentY + 5, { width: 120 });
                doc.font('Helvetica').fillColor('#64748b');
                doc.text(itemsSummary.slice(0, 48), 344, currentY + 5, { width: 220 });
                // Priority Badge
                doc.font('Helvetica-Bold').fillColor(n.priority === 'URGENT' ? '#b91c1c' : '#d97706');
                doc.text(n.priority, 568, currentY + 5, { width: 55 });
                // Status Badge
                doc.fillColor(n.status === 'FULFILLED' ? '#059669' : n.status === 'IN_PROGRESS' ? '#d97706' : '#2563eb');
                doc.text(n.status, 627, currentY + 5, { width: 65 });
                // Amount
                const amtStr = Number(n.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 });
                doc.fillColor('#0f172a').text(`PKR ${amtStr}`, 696, currentY + 5, { width: 102, align: 'right' });
                currentY += 20;
            });
            const range = doc.bufferedPageRange();
            for (let i = 0; i < range.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).fillColor('#94a3b8').text(`Page ${i + 1} of ${range.count}   •   CASHFLOW Financial Suite   •   Company Requirements Statement`, 36, doc.page.height - 24, { align: 'center', width: contentWidth });
            }
            doc.end();
            return;
        }
        // Dedicated PDF Export for Company Funds Statement
        if (reportType === 'company_funds') {
            const { status, startDate, endDate, search } = req.query;
            const fundWhere = {};
            if (status && status !== 'all')
                fundWhere.status = status;
            if (startDate || endDate) {
                fundWhere.fundDate = {};
                if (startDate)
                    fundWhere.fundDate.gte = new Date(startDate);
                if (endDate)
                    fundWhere.fundDate.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            }
            if (search) {
                fundWhere.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { receivedFrom: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { receivingMethod: { contains: search, mode: 'insensitive' } }
                ];
            }
            const funds = await prisma_1.prisma.companyFund.findMany({
                where: fundWhere,
                include: {
                    transactions: {
                        include: { company: true, account: true, category: true },
                        orderBy: { paymentDate: 'desc' }
                    }
                },
                orderBy: { fundDate: 'desc' }
            });
            let totalInjected = 0;
            let totalAllocated = 0;
            let totalRemaining = 0;
            funds.forEach((f) => {
                const tot = Number(f.totalAmount);
                const alloc = Number(f.allocatedAmount);
                const rem = tot - alloc;
                totalInjected += tot;
                totalAllocated += alloc;
                totalRemaining += rem;
            });
            const doc = new pdfkit_1.default({
                size: 'A4',
                layout: 'landscape',
                margin: 36,
                bufferPages: true
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Company_Funds_Statement_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
            doc.pipe(res);
            const pageWidth = doc.page.width;
            const contentWidth = pageWidth - 72;
            // Title & Subtitle
            doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('CASHFLOW FINANCIAL MANAGEMENT SYSTEM', 36, 32);
            doc.fontSize(9.5).font('Helvetica').fillColor('#64748b').text(`Company Funds Statement & Distribution Breakdown  •  Generated: ${(0, date_fns_1.format)(new Date(), 'dd MMMM yyyy, hh:mm a')}`, 36, 52);
            // Top KPI Summary Cards
            const kpiY = 70;
            const cardWidth = (contentWidth - 24) / 4;
            // Card 1: Total Injected
            doc.rect(36, kpiY, cardWidth, 42).fillAndStroke('#eff6ff', '#bfdbfe');
            doc.fillColor('#1e40af').fontSize(8).font('Helvetica-Bold').text('TOTAL CAPITAL INFLOW', 44, kpiY + 8);
            doc.fillColor('#2563eb').fontSize(11).font('Helvetica-Bold').text(`PKR ${totalInjected.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 44, kpiY + 22);
            // Card 2: Distributed to Companies
            doc.rect(36 + cardWidth + 8, kpiY, cardWidth, 42).fillAndStroke('#ecfdf5', '#a7f3d0');
            doc.fillColor('#065f46').fontSize(8).font('Helvetica-Bold').text('DISTRIBUTED TO COMPANIES', 36 + cardWidth + 16, kpiY + 8);
            doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text(`PKR ${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 36 + cardWidth + 16, kpiY + 22);
            // Card 3: Remaining Pool Balance
            doc.rect(36 + (cardWidth + 8) * 2, kpiY, cardWidth, 42).fillAndStroke('#fef3c7', '#fde68a');
            doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold').text('REMAINING UNSPENT POOL', 36 + (cardWidth + 8) * 2 + 8, kpiY + 8);
            doc.fillColor('#b45309').fontSize(11).font('Helvetica-Bold').text(`PKR ${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 36 + (cardWidth + 8) * 2 + 8, kpiY + 22);
            // Card 4: Total Inflows Count
            doc.rect(36 + (cardWidth + 8) * 3, kpiY, cardWidth, 42).fillAndStroke('#f8fafc', '#e2e8f0');
            doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('TOTAL INFLOW FUNDS', 36 + (cardWidth + 8) * 3 + 8, kpiY + 8);
            doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${funds.length} Inflow Funds`, 36 + (cardWidth + 8) * 3 + 8, kpiY + 22);
            let currentY = 126;
            const drawSubTableHeader = (y, fundTitle) => {
                doc.rect(36, y, contentWidth, 16).fill('#f1f5f9');
                doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
                doc.text('Distribution Date', 44, y + 4, { width: 75 });
                doc.text('Distributed To (Company)', 125, y + 4, { width: 175 });
                doc.text('Receiving Account', 305, y + 4, { width: 105 });
                doc.text('Category', 415, y + 4, { width: 105 });
                doc.text('Reference # / Notes', 525, y + 4, { width: 125 });
                doc.text('Distributed Amount (PKR)', 655, y + 4, { width: 142, align: 'right' });
            };
            funds.forEach((f) => {
                const tot = Number(f.totalAmount);
                const alloc = Number(f.allocatedAmount);
                const rem = tot - alloc;
                const txList = f.transactions || [];
                // Estimate block height
                const minBlockHeight = 24 + (txList.length > 0 ? 16 + txList.length * 17 + 20 : 22) + 12;
                if (currentY + Math.min(minBlockHeight, 100) > 520) {
                    doc.addPage();
                    currentY = 36;
                }
                // 1. Fund Header Banner
                doc.rect(36, currentY, contentWidth, 24).fill('#1e3a8a');
                doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
                const fundDateStr = (0, date_fns_1.format)(f.fundDate, 'yyyy-MM-dd');
                doc.text(`FUND: ${f.title}`, 44, currentY + 7, { width: 220 });
                doc.fontSize(8).font('Helvetica');
                doc.text(`From: ${f.receivedFrom}  |  Method: ${f.receivingMethod || '—'}  |  Date: ${fundDateStr}`, 270, currentY + 8, { width: 280 });
                // Status Tag
                const statusText = f.status === 'FULLY_ALLOCATED' ? 'FULLY ALLOCATED' : f.status === 'PARTIALLY_ALLOCATED' ? 'PARTIALLY ALLOCATED' : 'UNALLOCATED';
                doc.font('Helvetica-Bold').fontSize(8).text(`[${statusText}]`, 560, currentY + 8, { width: 110 });
                // Total Inflow Amount
                doc.fontSize(9.5).font('Helvetica-Bold').text(`PKR ${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 660, currentY + 7, { width: 137, align: 'right' });
                currentY += 24;
                // 2. Distributions Breakdown
                if (txList.length > 0) {
                    drawSubTableHeader(currentY, f.title);
                    currentY += 16;
                    txList.forEach((tx, tIdx) => {
                        if (currentY > 525) {
                            doc.addPage();
                            currentY = 36;
                            drawSubTableHeader(currentY, f.title);
                            currentY += 16;
                        }
                        if (tIdx % 2 === 0) {
                            doc.rect(36, currentY, contentWidth, 17).fill('#fafafa');
                        }
                        doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
                        doc.text((0, date_fns_1.format)(tx.paymentDate, 'yyyy-MM-dd'), 44, currentY + 4, { width: 75 });
                        doc.font('Helvetica-Bold').fillColor('#0f172a').text(tx.company.name.slice(0, 32), 125, currentY + 4, { width: 175 });
                        doc.font('Helvetica').fillColor('#475569').text(tx.account.name.slice(0, 18), 305, currentY + 4, { width: 105 });
                        doc.text((tx.category?.name || 'Company Funds').slice(0, 18), 415, currentY + 4, { width: 105 });
                        doc.text((tx.referenceNo || tx.description || '—').slice(0, 24), 525, currentY + 4, { width: 125 });
                        const txAmt = Number(tx.amount);
                        doc.font('Helvetica-Bold').fillColor('#059669').text(`PKR ${txAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 655, currentY + 4, { width: 142, align: 'right' });
                        currentY += 17;
                    });
                    // Fund Subtotal / Summary Bar
                    if (currentY > 520) {
                        doc.addPage();
                        currentY = 36;
                    }
                    doc.rect(36, currentY, contentWidth, 20).fill('#ecfdf5');
                    doc.rect(36, currentY, contentWidth, 20).stroke('#a7f3d0');
                    doc.fillColor('#065f46').fontSize(8).font('Helvetica-Bold');
                    doc.text(`Distribution Summary: Total Inflow: PKR ${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })}   •   Distributed: PKR ${alloc.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${txList.length} allocation${txList.length > 1 ? 's' : ''})   •   Remaining Available Balance: PKR ${rem.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 44, currentY + 5, { width: contentWidth - 16 });
                    currentY += 20;
                }
                else {
                    // Zero distributions recorded yet
                    doc.rect(36, currentY, contentWidth, 20).fill('#f8fafc');
                    doc.rect(36, currentY, contentWidth, 20).stroke('#e2e8f0');
                    doc.fillColor('#64748b').fontSize(8).font('Helvetica');
                    doc.text(`⚡ No distributions recorded yet — Full capital amount of PKR ${tot.toLocaleString('en-US', { minimumFractionDigits: 2 })} remains completely unallocated and available in pool.`, 44, currentY + 6, { width: contentWidth - 16 });
                    currentY += 20;
                }
                currentY += 10; // Spacing before next fund
            });
            const range = doc.bufferedPageRange();
            for (let i = 0; i < range.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).fillColor('#94a3b8').text(`Page ${i + 1} of ${range.count}   •   CASHFLOW Financial Suite   •   Company Funds Statement`, 36, doc.page.height - 24, { align: 'center', width: contentWidth });
            }
            doc.end();
            return;
        }
        const where = await buildReportWhere(req.query);
        // Fetch COMPLETE transactions dataset (no arbitrary limit!)
        const transactions = await prisma_1.prisma.transaction.findMany({
            where,
            include: {
                company: true,
                account: true,
                category: true,
                companyFund: true
            },
            orderBy: { paymentDate: 'desc' }
        });
        let totalIn = new decimal_js_1.Decimal(0);
        let totalOut = new decimal_js_1.Decimal(0);
        transactions.forEach((t) => {
            if (t.type === client_1.TransactionType.CASH_IN)
                totalIn = totalIn.plus(new decimal_js_1.Decimal(t.amount.toString()));
            else
                totalOut = totalOut.plus(new decimal_js_1.Decimal(t.amount.toString()));
        });
        const netFlow = totalIn.minus(totalOut);
        // High quality landscape A4 format
        const doc = new pdfkit_1.default({
            size: 'A4',
            layout: 'landscape',
            margin: 36,
            bufferPages: true
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Financial_Statement_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
        doc.pipe(res);
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - 72; // 770 pt
        // Function to draw table header
        const drawTableHeader = (y) => {
            doc.rect(36, y, contentWidth, 20).fill('#1e40af');
            doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
            doc.text('Date', 42, y + 5, { width: 68 });
            doc.text('Company', 114, y + 5, { width: 110 });
            doc.text('Type', 228, y + 5, { width: 60 });
            doc.text('Category', 292, y + 5, { width: 105 });
            doc.text('Party / Vendor', 402, y + 5, { width: 125 });
            doc.text('Account', 532, y + 5, { width: 75 });
            doc.text('Reference', 612, y + 5, { width: 75 });
            doc.text('Amount (PKR)', 692, y + 5, { width: 106, align: 'right' });
        };
        // Header Title
        doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('CASHFLOW FINANCIAL MANAGEMENT SYSTEM', 36, 32);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Executive Financial Statement  •  Generated: ${(0, date_fns_1.format)(new Date(), 'dd MMMM yyyy, hh:mm a')}`, 36, 52);
        // 4 KPI Summary Cards
        const kpiY = 70;
        const cardWidth = (contentWidth - 24) / 4;
        // Card 1: Inflow
        doc.rect(36, kpiY, cardWidth, 42).fillAndStroke('#ecfdf5', '#a7f3d0');
        doc.fillColor('#065f46').fontSize(8).font('Helvetica-Bold').text('TOTAL INFLOW', 44, kpiY + 8);
        doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text(`+PKR ${Number(totalIn).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 44, kpiY + 22);
        // Card 2: Outflow
        doc.rect(36 + cardWidth + 8, kpiY, cardWidth, 42).fillAndStroke('#fff1f2', '#fecdd3');
        doc.fillColor('#9f1239').fontSize(8).font('Helvetica-Bold').text('TOTAL OUTFLOW', 36 + cardWidth + 16, kpiY + 8);
        doc.fillColor('#dc2626').fontSize(11).font('Helvetica-Bold').text(`-PKR ${Number(totalOut).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 36 + cardWidth + 16, kpiY + 22);
        // Card 3: Net Cash Flow
        const netIsPositive = netFlow.greaterThanOrEqualTo(0);
        doc.rect(36 + (cardWidth + 8) * 2, kpiY, cardWidth, 42).fillAndStroke(netIsPositive ? '#eff6ff' : '#fef2f2', netIsPositive ? '#bfdbfe' : '#fecaca');
        doc.fillColor(netIsPositive ? '#1e40af' : '#991b1b').fontSize(8).font('Helvetica-Bold').text('NET CASH FLOW', 36 + (cardWidth + 8) * 2 + 8, kpiY + 8);
        doc.fillColor(netIsPositive ? '#2563eb' : '#dc2626').fontSize(11).font('Helvetica-Bold').text(`${netIsPositive ? '+' : ''}PKR ${Number(netFlow).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 36 + (cardWidth + 8) * 2 + 8, kpiY + 22);
        // Card 4: Total Records
        doc.rect(36 + (cardWidth + 8) * 3, kpiY, cardWidth, 42).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('TOTAL TRANSACTIONS', 36 + (cardWidth + 8) * 3 + 8, kpiY + 8);
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${transactions.length} Records`, 36 + (cardWidth + 8) * 3 + 8, kpiY + 22);
        // Table Header
        let currentY = 126;
        drawTableHeader(currentY);
        currentY += 20;
        // Table Rows
        doc.font('Helvetica').fontSize(8);
        transactions.forEach((tx, idx) => {
            // Check page break
            if (currentY > 520) {
                doc.addPage();
                currentY = 36;
                drawTableHeader(currentY);
                currentY += 20;
                doc.font('Helvetica').fontSize(8);
            }
            // Zebra striping
            if (idx % 2 === 0) {
                doc.rect(36, currentY, contentWidth, 16).fill('#f8fafc');
            }
            doc.fillColor('#334155');
            doc.text((0, date_fns_1.format)(tx.paymentDate, 'yyyy-MM-dd'), 42, currentY + 4, { width: 68 });
            doc.text(tx.company.name.slice(0, 18), 114, currentY + 4, { width: 110 });
            if (tx.type === client_1.TransactionType.CASH_IN) {
                doc.fillColor('#059669').font('Helvetica-Bold').text('+ Cash In', 228, currentY + 4, { width: 60 });
            }
            else {
                doc.fillColor('#dc2626').font('Helvetica-Bold').text('- Cash Out', 228, currentY + 4, { width: 60 });
            }
            doc.font('Helvetica').fillColor('#334155');
            doc.text(tx.category.name.slice(0, 18), 292, currentY + 4, { width: 105 });
            doc.text(tx.party.slice(0, 22), 402, currentY + 4, { width: 125 });
            doc.text(tx.account.name.slice(0, 12), 532, currentY + 4, { width: 75 });
            doc.text((tx.referenceNo || '—').slice(0, 14), 612, currentY + 4, { width: 75 });
            // Amount column
            const amtStr = Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
            if (tx.type === client_1.TransactionType.CASH_IN) {
                doc.fillColor('#059669').font('Helvetica-Bold').text(`+${amtStr}`, 692, currentY + 4, { width: 106, align: 'right' });
            }
            else {
                doc.fillColor('#dc2626').font('Helvetica-Bold').text(`-${amtStr}`, 692, currentY + 4, { width: 106, align: 'right' });
            }
            doc.font('Helvetica');
            currentY += 16;
        });
        // Add running footer across all buffered pages
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('#94a3b8').text(`Page ${i + 1} of ${range.count}   •   CASHFLOW Financial Suite   •   Confidential Financial Record`, 36, doc.page.height - 24, { align: 'center', width: contentWidth });
        }
        doc.end();
    }
    catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
    }
};
exports.exportReportPDF = exportReportPDF;
const exportReportCSV = async (req, res) => {
    try {
        const { reportType, companyId, status, priority } = req.query;
        if (reportType === 'company_requirements') {
            const noteWhere = {};
            if (companyId && companyId !== 'all')
                noteWhere.companyId = companyId;
            if (status && status !== 'all')
                noteWhere.status = status;
            if (priority && priority !== 'all')
                noteWhere.priority = priority;
            const notes = await prisma_1.prisma.companyNote.findMany({
                where: noteWhere,
                include: { company: true, items: { orderBy: { createdAt: 'asc' } } },
                orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=Company_Requirements_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
            let csv = 'Note ID,Created Date,Company,Requirement Title,Line Items Breakdown,Priority,Status,Due Date,Total Amount (PKR),Notes\n';
            notes.forEach((n) => {
                const itemsStr = n.items.map((it) => `${it.itemName}: ${it.amount}`).join('; ');
                csv += `"${n.id}","${(0, date_fns_1.format)(n.createdAt, 'yyyy-MM-dd')}","${n.company.name}","${n.title.replace(/"/g, '""')}","${itemsStr.replace(/"/g, '""')}","${n.priority}","${n.status}","${n.dueDate ? (0, date_fns_1.format)(n.dueDate, 'yyyy-MM-dd') : ''}",${n.totalAmount},"${(n.notes || '').replace(/"/g, '""')}"\n`;
            });
            res.send(csv);
            return;
        }
        if (reportType === 'company_funds') {
            const { status, startDate, endDate, search } = req.query;
            const fundWhere = {};
            if (status && status !== 'all')
                fundWhere.status = status;
            if (startDate || endDate) {
                fundWhere.fundDate = {};
                if (startDate)
                    fundWhere.fundDate.gte = new Date(startDate);
                if (endDate)
                    fundWhere.fundDate.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            }
            if (search) {
                fundWhere.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { receivedFrom: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { receivingMethod: { contains: search, mode: 'insensitive' } }
                ];
            }
            const funds = await prisma_1.prisma.companyFund.findMany({
                where: fundWhere,
                include: {
                    transactions: {
                        include: { company: true, account: true },
                        orderBy: { paymentDate: 'desc' }
                    }
                },
                orderBy: { fundDate: 'desc' }
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=Company_Funds_Statement_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
            let csv = 'Fund ID,Date,Fund Title,Investor/Source,Payment Method,Total Inflow (PKR),Allocated to Companies (PKR),Remaining Pool (PKR),Status,Company Allocations Breakdown\n';
            funds.forEach((f) => {
                const tot = Number(f.totalAmount);
                const alloc = Number(f.allocatedAmount);
                const rem = tot - alloc;
                const allocSummary = f.transactions.map((a) => `${a.company.name} (${a.account.name}): PKR ${a.amount}`).join('; ');
                csv += `"${f.id}","${(0, date_fns_1.format)(f.fundDate, 'yyyy-MM-dd')}","${f.title.replace(/"/g, '""')}","${f.receivedFrom.replace(/"/g, '""')}","${(f.receivingMethod || '').replace(/"/g, '""')}",${tot},${alloc},${rem},"${f.status}","${allocSummary.replace(/"/g, '""')}"\n`;
            });
            res.send(csv);
            return;
        }
        const where = await buildReportWhere(req.query);
        const transactions = await prisma_1.prisma.transaction.findMany({
            where,
            include: {
                company: true,
                account: true,
                category: true,
                companyFund: true
            },
            orderBy: { paymentDate: 'desc' }
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=CashFlow_Ledger_${(0, date_fns_1.format)(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        let csv = 'Transaction ID,Date,Company,Type,Category,Party/Vendor,Payment Account,Amount (PKR),Fund Source,Reference,Description\n';
        transactions.forEach((tx) => {
            const fundName = tx.companyFund ? tx.companyFund.title : '';
            csv += `"${tx.id}","${(0, date_fns_1.format)(tx.paymentDate, 'yyyy-MM-dd')}","${tx.company.name}","${tx.type}","${tx.category.name}","${tx.party.replace(/"/g, '""')}","${tx.account.name}",${tx.amount},"${fundName.replace(/"/g, '""')}","${(tx.referenceNo || '').replace(/"/g, '""')}","${(tx.description || '').replace(/"/g, '""')}"\n`;
        });
        res.send(csv);
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate CSV report' });
    }
};
exports.exportReportCSV = exportReportCSV;
