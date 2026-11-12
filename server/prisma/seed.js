"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const DEFAULT_EXPENSE_CATEGORIES = [
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
const DEFAULT_INCOME_CATEGORIES = [
    'Company Funds',
    'Client Invoice / Sales',
    'Consulting Services',
    'Retainer Fee',
    'Investment Return',
    'Commission',
    'Other Income'
];
const COMPANIES = [
    { name: 'Global Tech International', code: 'GTI' },
    { name: 'Krunch 360', code: 'K360' },
    { name: 'Global Sourcing International', code: 'GSI' }
];
const ACCOUNT_TYPES = [
    { name: 'Cash', type: client_1.AccountType.CASH },
    { name: 'Bank', type: client_1.AccountType.BANK },
    { name: 'Wallet', type: client_1.AccountType.WALLET }
];
async function main() {
    console.log('🌱 Starting database seed...');
    // 1. Seed Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cashflow.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    const adminName = process.env.ADMIN_NAME || 'Finance Administrator';
    const salt = await bcryptjs_1.default.genSalt(12);
    const passwordHash = await bcryptjs_1.default.hash(adminPassword, salt);
    const admin = await prisma.admin.upsert({
        where: { email: adminEmail },
        update: {
            passwordHash,
            name: adminName
        },
        create: {
            email: adminEmail,
            passwordHash,
            name: adminName
        }
    });
    console.log(`✅ Admin seeded: ${admin.email}`);
    // 2. Seed Companies and their Accounts
    for (const comp of COMPANIES) {
        const company = await prisma.company.upsert({
            where: { code: comp.code },
            update: { name: comp.name },
            create: {
                name: comp.name,
                code: comp.code,
                currency: 'PKR'
            }
        });
        console.log(`🏢 Company: ${company.name}`);
        // Create 3 Accounts for each Company
        for (const acc of ACCOUNT_TYPES) {
            await prisma.account.upsert({
                where: {
                    companyId_name: {
                        companyId: company.id,
                        name: acc.name
                    }
                },
                update: { type: acc.type },
                create: {
                    companyId: company.id,
                    name: acc.name,
                    type: acc.type,
                    openingBalance: 0.00,
                    currentBalance: 0.00
                }
            });
        }
        // Create Default Expense Categories for each company
        for (const expName of DEFAULT_EXPENSE_CATEGORIES) {
            await prisma.category.upsert({
                where: {
                    companyId_name_type: {
                        companyId: company.id,
                        name: expName,
                        type: client_1.CategoryType.EXPENSE
                    }
                },
                update: {},
                create: {
                    companyId: company.id,
                    name: expName,
                    type: client_1.CategoryType.EXPENSE,
                    isDefault: true
                }
            });
        }
        // Create Default Income Categories for each company
        for (const incName of DEFAULT_INCOME_CATEGORIES) {
            await prisma.category.upsert({
                where: {
                    companyId_name_type: {
                        companyId: company.id,
                        name: incName,
                        type: client_1.CategoryType.INCOME
                    }
                },
                update: {},
                create: {
                    companyId: company.id,
                    name: incName,
                    type: client_1.CategoryType.INCOME,
                    isDefault: true
                }
            });
        }
    }
    console.log('✅ Default accounts and categories seeded successfully for all 3 companies.');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
