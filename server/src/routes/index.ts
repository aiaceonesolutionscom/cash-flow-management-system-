import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { uploadReceipt } from '../middleware/upload';

// Controllers
import * as authController from '../controllers/authController';
import * as companyController from '../controllers/companyController';
import * as accountController from '../controllers/accountController';
import * as categoryController from '../controllers/categoryController';
import * as cashInController from '../controllers/cashInController';
import * as cashOutController from '../controllers/cashOutController';
import * as transferController from '../controllers/transferController';
import * as transactionController from '../controllers/transactionController';
import * as dashboardController from '../controllers/dashboardController';
import * as reportController from '../controllers/reportController';
import * as auditController from '../controllers/auditController';
import * as attachmentController from '../controllers/attachmentController';

const router = Router();

// Auth Endpoints (Single Admin)
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', requireAdmin, authController.getMe);
router.patch('/auth/profile', requireAdmin, authController.updateProfile);
router.post('/auth/change-password', requireAdmin, authController.changePassword);

// Companies
router.get('/companies', requireAdmin, companyController.getCompanies);
router.get('/companies/:id', requireAdmin, companyController.getCompanyById);

// Accounts
router.get('/accounts', requireAdmin, accountController.getAccounts);
router.patch('/accounts/:id/opening-balance', requireAdmin, accountController.updateAccountOpeningBalance);
router.get('/accounts/:id/history', requireAdmin, accountController.getAccountHistory);

// Categories
router.get('/categories', requireAdmin, categoryController.getCategories);
router.post('/categories', requireAdmin, categoryController.createCategory);
router.put('/categories/:id', requireAdmin, categoryController.updateCategory);
router.delete('/categories/:id', requireAdmin, categoryController.deleteCategory);

// Cash In
router.post('/cash-in', requireAdmin, uploadReceipt.single('receipt'), cashInController.createCashIn);
router.get('/cash-in', requireAdmin, cashInController.getCashInList);
router.put('/cash-in/:id', requireAdmin, uploadReceipt.single('receipt'), cashInController.updateCashIn);
router.delete('/cash-in/:id', requireAdmin, cashInController.deleteCashIn);

// Cash Out (Expenses)
router.post('/cash-out', requireAdmin, uploadReceipt.single('receipt'), cashOutController.createCashOut);
router.get('/cash-out', requireAdmin, cashOutController.getCashOutList);
router.put('/cash-out/:id', requireAdmin, uploadReceipt.single('receipt'), cashOutController.updateCashOut);
router.delete('/cash-out/:id', requireAdmin, cashOutController.deleteCashOut);

// Transfers (Intra-company)
router.post('/transfers', requireAdmin, transferController.createTransfer);
router.get('/transfers', requireAdmin, transferController.getTransfers);
router.delete('/transfers/:id', requireAdmin, transferController.deleteTransfer);

// Centralized Transactions Ledger
router.get('/transactions', requireAdmin, transactionController.getTransactions);
router.post('/transactions/restore', requireAdmin, transactionController.restoreTransaction);

// Dashboard & Analytics
router.get('/dashboard/summary', requireAdmin, dashboardController.getDashboardSummary);

// Financial Reports & Exports
router.get('/reports', requireAdmin, reportController.getFinancialReport);
router.get('/reports/export/excel', requireAdmin, reportController.exportReportExcel);
router.get('/reports/export/pdf', requireAdmin, reportController.exportReportPDF);
router.get('/reports/export/csv', requireAdmin, reportController.exportReportCSV);

// Audit Logs
router.get('/audit-logs', requireAdmin, auditController.getAuditLogs);

// Attachments / Receipts (Streamed directly from PostgreSQL bytes)
router.get('/attachments/:id/view', attachmentController.getAttachment);
router.get('/attachments/:id/download', attachmentController.downloadAttachment);

export default router;
