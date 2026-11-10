import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { TransactionType } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { Decimal } from 'decimal.js';

// Helper to construct complete, multi-filter where clause
async function buildReportWhere(query: any) {
  const { companyId, startDate, endDate, accountType, accountId, categoryId, type, search } = query;
  const where: any = {};

  if (companyId && companyId !== 'all') {
    where.companyId = companyId as string;
  }
  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) where.paymentDate.gte = new Date(startDate as string);
    if (endDate) where.paymentDate.lte = new Date(new Date(endDate as string).setHours(23, 59, 59, 999));
  }
  if (accountType && accountType !== 'all') {
    where.account = { type: accountType };
  }
  if (accountId && accountId !== 'all') {
    where.accountId = accountId as string;
  }
  if (categoryId && categoryId !== 'all') {
    if (!companyId || companyId === 'all') {
      const cat = await prisma.category.findUnique({ where: { id: categoryId as string } });
      if (cat) {
        const siblingCats = await prisma.category.findMany({
          where: { name: cat.name },
          select: { id: true }
        });
        where.categoryId = { in: siblingCats.map((c) => c.id) };
      } else {
        where.categoryId = categoryId as string;
      }
    } else {
      where.categoryId = categoryId as string;
    }
  }
  if (type && (type === 'CASH_IN' || type === 'CASH_OUT')) {
    where.type = type as TransactionType;
  }
  if (search) {
    where.OR = [
      { party: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { referenceNo: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  return where;
}

export const getFinancialReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportType = 'cash_flow', companyId } = req.query;
    const where = await buildReportWhere(req.query);

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, code: true } },
        account: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, type: true } },
        attachments: { select: { id: true, originalName: true, mimeType: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const accounts = await prisma.account.findMany({
      where: companyId && companyId !== 'all' ? { companyId: companyId as string } : {},
      include: { company: true }
    });

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
    const where = await buildReportWhere(req.query);

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
    workbook.creator = 'CASHFLOW Financial Management System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Financial Ledger Report');

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
        reference: tx.referenceNo || '—',
        description: tx.description || '—'
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
    const where = await buildReportWhere(req.query);

    // Fetch COMPLETE transactions dataset (no arbitrary limit!)
    const transactions = await prisma.transaction.findMany({
      where,
      include: { company: true, account: true, category: true },
      orderBy: { paymentDate: 'desc' }
    });

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);
    transactions.forEach((t) => {
      if (t.type === TransactionType.CASH_IN) totalIn = totalIn.plus(new Decimal(t.amount.toString()));
      else totalOut = totalOut.plus(new Decimal(t.amount.toString()));
    });
    const netFlow = totalIn.minus(totalOut);

    // High quality landscape A4 format
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 36,
      bufferPages: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Financial_Statement_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 72; // 770 pt

    // Function to draw table header
    const drawTableHeader = (y: number) => {
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
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(
      `Executive Financial Statement  •  Generated: ${format(new Date(), 'dd MMMM yyyy, hh:mm a')}`,
      36,
      52
    );

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
      doc.text(format(tx.paymentDate, 'yyyy-MM-dd'), 42, currentY + 4, { width: 68 });
      doc.text(tx.company.name.slice(0, 18), 114, currentY + 4, { width: 110 });

      if (tx.type === TransactionType.CASH_IN) {
        doc.fillColor('#059669').font('Helvetica-Bold').text('+ Cash In', 228, currentY + 4, { width: 60 });
      } else {
        doc.fillColor('#dc2626').font('Helvetica-Bold').text('- Cash Out', 228, currentY + 4, { width: 60 });
      }

      doc.font('Helvetica').fillColor('#334155');
      doc.text(tx.category.name.slice(0, 18), 292, currentY + 4, { width: 105 });
      doc.text(tx.party.slice(0, 22), 402, currentY + 4, { width: 125 });
      doc.text(tx.account.name.slice(0, 12), 532, currentY + 4, { width: 75 });
      doc.text((tx.referenceNo || '—').slice(0, 14), 612, currentY + 4, { width: 75 });

      // Amount column
      const amtStr = Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
      if (tx.type === TransactionType.CASH_IN) {
        doc.fillColor('#059669').font('Helvetica-Bold').text(`+${amtStr}`, 692, currentY + 4, { width: 106, align: 'right' });
      } else {
        doc.fillColor('#dc2626').font('Helvetica-Bold').text(`-${amtStr}`, 692, currentY + 4, { width: 106, align: 'right' });
      }

      doc.font('Helvetica');
      currentY += 16;
    });

    // Add running footer across all buffered pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Page ${i + 1} of ${range.count}   •   CASHFLOW Financial Suite   •   Confidential Financial Record`,
        36,
        doc.page.height - 24,
        { align: 'center', width: contentWidth }
      );
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
  }
};

export const exportReportCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const where = await buildReportWhere(req.query);

    const transactions = await prisma.transaction.findMany({
      where,
      include: { company: true, account: true, category: true },
      orderBy: { paymentDate: 'desc' }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=CashFlow_Ledger_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);

    let csv = 'Transaction ID,Date,Company,Type,Category,Party/Vendor,Payment Account,Amount (PKR),Reference,Description\n';

    transactions.forEach((tx) => {
      csv += `"${tx.id}","${format(tx.paymentDate, 'yyyy-MM-dd')}","${tx.company.name}","${tx.type}","${tx.category.name}","${tx.party.replace(/"/g, '""')}","${tx.account.name}",${tx.amount},"${(tx.referenceNo || '').replace(/"/g, '""')}","${(tx.description || '').replace(/"/g, '""')}"\n`;
    });

    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate CSV report' });
  }
};
