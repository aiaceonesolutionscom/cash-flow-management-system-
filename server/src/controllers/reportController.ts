import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { MoneyCalculator } from '../utils/money';
import { TransactionType } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { Decimal } from 'decimal.js';

export const getFinancialReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportType = 'cash_flow', companyId, startDate, endDate } = req.query;

    const where: any = {};
    if (companyId && companyId !== 'all') {
      where.companyId = companyId as string;
    }
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        company: { select: { name: true, code: true } },
        account: { select: { name: true, type: true } },
        category: { select: { name: true, type: true } }
      },
      orderBy: { paymentDate: 'asc' }
    });

    const accounts = await prisma.account.findMany({
      where: companyId && companyId !== 'all' ? { companyId: companyId as string } : {},
      include: { company: true }
    });

    // Compute report metrics based on type
    let totalCashIn = new Decimal(0);
    let totalCashOut = new Decimal(0);
    const categoryTotals = new Map<string, { type: string; total: Decimal }>();
    const companyTotals = new Map<string, { cashIn: Decimal; cashOut: Decimal }>();
    const monthlyData = new Map<string, { cashIn: Decimal; cashOut: Decimal }>();

    for (const t of transactions) {
      const amt = new Decimal(t.amount.toString());
      const compName = t.company.name;
      const catName = t.category.name;
      const monthKey = format(t.paymentDate, 'yyyy-MM');

      if (t.type === TransactionType.CASH_IN) {
        totalCashIn = totalCashIn.plus(amt);
      } else {
        totalCashOut = totalCashOut.plus(amt);
      }

      // Category map
      const catEntry = categoryTotals.get(catName) || { type: t.category.type, total: new Decimal(0) };
      catEntry.total = catEntry.total.plus(amt);
      categoryTotals.set(catName, catEntry);

      // Company map
      const compEntry = companyTotals.get(compName) || { cashIn: new Decimal(0), cashOut: new Decimal(0) };
      if (t.type === TransactionType.CASH_IN) compEntry.cashIn = compEntry.cashIn.plus(amt);
      else compEntry.cashOut = compEntry.cashOut.plus(amt);
      companyTotals.set(compName, compEntry);

      // Monthly map
      const mEntry = monthlyData.get(monthKey) || { cashIn: new Decimal(0), cashOut: new Decimal(0) };
      if (t.type === TransactionType.CASH_IN) mEntry.cashIn = mEntry.cashIn.plus(amt);
      else mEntry.cashOut = mEntry.cashOut.plus(amt);
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
  } catch (error) {
    console.error('Error compiling financial report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate financial report' });
  }
};

export const exportReportExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, startDate, endDate } = req.query;

    const where: any = {};
    if (companyId && companyId !== 'all') {
      where.companyId = companyId as string;
    }
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        company: true,
        account: true,
        category: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Cash Flow Management System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Transactions Report');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Company', key: 'company', width: 28 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Party / Vendor', key: 'party', width: 26 },
      { header: 'Account', key: 'account', width: 14 },
      { header: 'Amount (PKR)', key: 'amount', width: 18 },
      { header: 'Reference', key: 'reference', width: 18 },
      { header: 'Description', key: 'description', width: 32 }
    ];

    // Style Header Row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Brand blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    let totalIn = 0;
    let totalOut = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      if (tx.type === TransactionType.CASH_IN) totalIn += amt;
      else totalOut += amt;

      const row = sheet.addRow({
        date: format(tx.paymentDate, 'yyyy-MM-dd'),
        company: tx.company.name,
        type: tx.type === TransactionType.CASH_IN ? 'Cash In (+)' : 'Cash Out (-)',
        category: tx.category.name,
        party: tx.party,
        account: tx.account.name,
        amount: amt,
        reference: tx.referenceNo || '-',
        description: tx.description || '-'
      });

      row.getCell('amount').numFmt = '#,##0.00';
      if (tx.type === TransactionType.CASH_IN) {
        row.getCell('amount').font = { color: { argb: 'FF059669' }, bold: true };
      } else {
        row.getCell('amount').font = { color: { argb: 'FFDC2626' }, bold: true };
      }
    });

    // Summary Rows
    sheet.addRow({});
    const totalInRow = sheet.addRow({ party: 'TOTAL CASH IN', amount: totalIn });
    totalInRow.font = { bold: true };
    totalInRow.getCell('amount').numFmt = '#,##0.00';

    const totalOutRow = sheet.addRow({ party: 'TOTAL CASH OUT', amount: totalOut });
    totalOutRow.font = { bold: true };
    totalOutRow.getCell('amount').numFmt = '#,##0.00';

    const netRow = sheet.addRow({ party: 'NET CASH FLOW', amount: totalIn - totalOut });
    netRow.font = { bold: true, color: { argb: totalIn - totalOut >= 0 ? 'FF059669' : 'FFDC2626' } };
    netRow.getCell('amount').numFmt = '#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=CashFlow_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report' });
  }
};

export const exportReportPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, startDate, endDate } = req.query;

    const where: any = {};
    if (companyId && companyId !== 'all') {
      where.companyId = companyId as string;
    }
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { company: true, account: true, category: true },
      orderBy: { paymentDate: 'desc' },
      take: 200 // Cap for clean multi-page PDF output
    });

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);
    transactions.forEach((t) => {
      if (t.type === TransactionType.CASH_IN) totalIn = totalIn.plus(new Decimal(t.amount.toString()));
      else totalOut = totalOut.plus(new Decimal(t.amount.toString()));
    });
    const netFlow = totalIn.minus(totalOut);

    const doc = new PDFDocument({ margin: 36, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Financial_Statement_${format(new Date(), 'yyyyMMdd')}.pdf`);

    doc.pipe(res);

    // Header Branding
    doc.fillColor('#1e40af').fontSize(20).text('EXPENSE & CASH FLOW STATEMENT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#64748b').fontSize(10).text(`Generated on ${format(new Date(), 'PPP p')}`, { align: 'center' });
    doc.moveDown(1);

    // Summary Box
    doc.rect(36, doc.y, 522, 60).fill('#f8fafc');
    doc.fillColor('#1e293b').fontSize(11);
    doc.text(`Total Cash In: PKR ${totalIn.toFixed(2)}`, 50, doc.y - 45);
    doc.text(`Total Cash Out: PKR ${totalOut.toFixed(2)}`, 220, doc.y - 14);
    doc.fillColor(netFlow.greaterThanOrEqualTo(0) ? '#059669' : '#dc2626');
    doc.text(`Net Cash Flow: PKR ${netFlow.toFixed(2)}`, 380, doc.y - 14);
    doc.moveDown(2);

    // Table Header
    const yTop = doc.y;
    doc.rect(36, yTop, 522, 22).fill('#1e40af');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 42, yTop + 6);
    doc.text('Company', 105, yTop + 6);
    doc.text('Category', 215, yTop + 6);
    doc.text('Party / Vendor', 305, yTop + 6);
    doc.text('Type', 415, yTop + 6);
    doc.text('Amount (PKR)', 470, yTop + 6);

    let currentY = yTop + 24;
    doc.font('Helvetica').fontSize(8);

    transactions.forEach((tx, idx) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 40;
      }

      if (idx % 2 === 0) {
        doc.rect(36, currentY - 2, 522, 16).fill('#f1f5f9');
      }

      doc.fillColor('#334155');
      doc.text(format(tx.paymentDate, 'yyyy-MM-dd'), 42, currentY);
      doc.text(tx.company.name.slice(0, 18), 105, currentY);
      doc.text(tx.category.name.slice(0, 16), 215, currentY);
      doc.text(tx.party.slice(0, 20), 305, currentY);

      if (tx.type === TransactionType.CASH_IN) {
        doc.fillColor('#059669').text('Cash In', 415, currentY);
        doc.text(`+${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 470, currentY);
      } else {
        doc.fillColor('#dc2626').text('Cash Out', 415, currentY);
        doc.text(`-${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 470, currentY);
      }

      currentY += 16;
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
  }
};

export const exportReportCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, startDate, endDate } = req.query;

    const where: any = {};
    if (companyId && companyId !== 'all') {
      where.companyId = companyId as string;
    }
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate as string);
      if (endDate) where.paymentDate.lte = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { company: true, account: true, category: true },
      orderBy: { paymentDate: 'desc' }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=CashFlow_${format(new Date(), 'yyyyMMdd')}.csv`);

    let csv = 'Transaction ID,Date,Company,Type,Category,Party/Vendor,Account,Amount (PKR),Reference,Description\n';

    transactions.forEach((tx) => {
      csv += `"${tx.id}","${format(tx.paymentDate, 'yyyy-MM-dd')}","${tx.company.name}","${tx.type}","${tx.category.name}","${tx.party.replace(/"/g, '""')}","${tx.account.name}",${tx.amount},"${(tx.referenceNo || '').replace(/"/g, '""')}","${(tx.description || '').replace(/"/g, '""')}"\n`;
    });

    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate CSV report' });
  }
};
