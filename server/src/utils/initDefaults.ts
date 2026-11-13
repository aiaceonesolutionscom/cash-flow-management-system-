import { prisma } from '../prisma';
import { AccountType, CategoryType } from '@prisma/client';

export const ensureDefaultEntities = async (): Promise<void> => {
  try {
    // 1. Ensure 'Grouped Company Assets' exists
    const gca = await prisma.company.upsert({
      where: { code: 'GCA' },
      update: { name: 'Grouped Company Assets' },
      create: {
        name: 'Grouped Company Assets',
        code: 'GCA',
        currency: 'PKR'
      }
    });

    // 2. Ensure standard accounts exist for GCA (Cash, Bank, Wallet)
    const accountTypes: { name: string; type: AccountType }[] = [
      { name: 'Cash', type: AccountType.CASH },
      { name: 'Bank', type: AccountType.BANK },
      { name: 'Wallet', type: AccountType.WALLET }
    ];

    for (const acc of accountTypes) {
      await prisma.account.upsert({
        where: {
          companyId_name: {
            companyId: gca.id,
            name: acc.name
          }
        },
        update: { type: acc.type },
        create: {
          companyId: gca.id,
          name: acc.name,
          type: acc.type,
          openingBalance: 0.00,
          currentBalance: 0.00
        }
      });
    }

    // 3. Ensure Default Categories exist for GCA
    const defaultExpenseCategories = [
      'Office Equipment & Laptops',
      'IT & Hardware',
      'Furniture & Fixtures',
      'Shared Office Assets',
      'Office Rent',
      'Salaries',
      'Electricity',
      'Internet',
      'Transportation',
      'Fuel',
      'Food & Refreshments',
      'Marketing',
      'Software & Subscriptions',
      'Equipment',
      'Maintenance',
      'Office Supplies',
      'Travel',
      'Miscellaneous'
    ];

    for (const catName of defaultExpenseCategories) {
      await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId: gca.id,
            name: catName,
            type: CategoryType.EXPENSE
          }
        },
        update: {},
        create: {
          companyId: gca.id,
          name: catName,
          type: CategoryType.EXPENSE,
          isDefault: true
        }
      });
    }

    const defaultIncomeCategories = [
      'Company Funds',
      'Capital Inflow',
      'Asset Disposal',
      'Other Income'
    ];

    for (const incName of defaultIncomeCategories) {
      await prisma.category.upsert({
        where: {
          companyId_name_type: {
            companyId: gca.id,
            name: incName,
            type: CategoryType.INCOME
          }
        },
        update: {},
        create: {
          companyId: gca.id,
          name: incName,
          type: CategoryType.INCOME,
          isDefault: true
        }
      });
    }

    console.log('✅ Entity "Grouped Company Assets" initialized successfully.');
  } catch (err) {
    console.error('Error ensuring default entities:', err);
  }
};
