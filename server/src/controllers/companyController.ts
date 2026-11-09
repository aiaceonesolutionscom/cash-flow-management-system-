import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { MoneyCalculator } from '../utils/money';

export const getCompanies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        accounts: true,
      },
      orderBy: { name: 'asc' }
    });

    // Calculate aggregated company metrics
    const results = await Promise.all(
      companies.map(async (comp) => {
        const cashInAgg = await prisma.transaction.aggregate({
          where: { companyId: comp.id, type: 'CASH_IN' },
          _sum: { amount: true }
        });
        const cashOutAgg = await prisma.transaction.aggregate({
          where: { companyId: comp.id, type: 'CASH_OUT' },
          _sum: { amount: true }
        });

        const totalCashIn = cashInAgg._sum.amount?.toString() || '0.00';
        const totalCashOut = cashOutAgg._sum.amount?.toString() || '0.00';
        const netCashFlow = MoneyCalculator.netCashFlow(totalCashIn, totalCashOut).toFixed(2);

        // Sum current balances of Cash, Bank, Wallet
        const totalBalance = MoneyCalculator.sum(
          comp.accounts.map((a) => a.currentBalance.toString())
        ).toFixed(2);

        return {
          ...comp,
          metrics: {
            totalCashIn,
            totalCashOut,
            netCashFlow,
            totalBalance
          }
        };
      })
    );

    res.json({ success: true, companies: results });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch companies' });
  }
};

export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch company details' });
  }
};
