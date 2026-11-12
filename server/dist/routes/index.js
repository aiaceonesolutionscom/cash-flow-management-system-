"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const rateLimiter_1 = require("../middleware/rateLimiter");
// Controllers
const authController = __importStar(require("../controllers/authController"));
const companyController = __importStar(require("../controllers/companyController"));
const accountController = __importStar(require("../controllers/accountController"));
const categoryController = __importStar(require("../controllers/categoryController"));
const cashInController = __importStar(require("../controllers/cashInController"));
const cashOutController = __importStar(require("../controllers/cashOutController"));
const transferController = __importStar(require("../controllers/transferController"));
const transactionController = __importStar(require("../controllers/transactionController"));
const dashboardController = __importStar(require("../controllers/dashboardController"));
const reportController = __importStar(require("../controllers/reportController"));
const auditController = __importStar(require("../controllers/auditController"));
const attachmentController = __importStar(require("../controllers/attachmentController"));
const companyNoteController = __importStar(require("../controllers/companyNoteController"));
const router = (0, express_1.Router)();
// Global API Request Rate Limiter (Protects against DoS & automated scrapers)
router.use(rateLimiter_1.generalApiRateLimiter);
// Auth Endpoints (Single Admin)
router.post('/auth/login', rateLimiter_1.loginRateLimiter, authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', auth_1.requireAdmin, authController.getMe);
router.patch('/auth/profile', auth_1.requireAdmin, authController.updateProfile);
router.post('/auth/change-password', auth_1.requireAdmin, rateLimiter_1.passwordChangeRateLimiter, authController.changePassword);
// Companies
router.get('/companies', auth_1.requireAdmin, companyController.getCompanies);
router.get('/companies/:id', auth_1.requireAdmin, companyController.getCompanyById);
// Accounts
router.get('/accounts', auth_1.requireAdmin, accountController.getAccounts);
router.patch('/accounts/:id/opening-balance', auth_1.requireAdmin, accountController.updateAccountOpeningBalance);
router.get('/accounts/:id/history', auth_1.requireAdmin, accountController.getAccountHistory);
// Categories
router.get('/categories', auth_1.requireAdmin, categoryController.getCategories);
router.post('/categories', auth_1.requireAdmin, categoryController.createCategory);
router.put('/categories/:id', auth_1.requireAdmin, categoryController.updateCategory);
router.delete('/categories/:id', auth_1.requireAdmin, categoryController.deleteCategory);
// Cash In
router.post('/cash-in', auth_1.requireAdmin, upload_1.uploadReceipt.single('receipt'), cashInController.createCashIn);
router.get('/cash-in', auth_1.requireAdmin, cashInController.getCashInList);
router.put('/cash-in/:id', auth_1.requireAdmin, upload_1.uploadReceipt.single('receipt'), cashInController.updateCashIn);
router.delete('/cash-in/:id', auth_1.requireAdmin, cashInController.deleteCashIn);
// Cash Out (Expenses)
router.post('/cash-out', auth_1.requireAdmin, upload_1.uploadReceipt.single('receipt'), cashOutController.createCashOut);
router.get('/cash-out', auth_1.requireAdmin, cashOutController.getCashOutList);
router.put('/cash-out/:id', auth_1.requireAdmin, upload_1.uploadReceipt.single('receipt'), cashOutController.updateCashOut);
router.delete('/cash-out/:id', auth_1.requireAdmin, cashOutController.deleteCashOut);
// Transfers (Intra-company)
router.post('/transfers', auth_1.requireAdmin, transferController.createTransfer);
router.get('/transfers', auth_1.requireAdmin, transferController.getTransfers);
router.delete('/transfers/:id', auth_1.requireAdmin, transferController.deleteTransfer);
// Centralized Transactions Ledger
router.get('/transactions', auth_1.requireAdmin, transactionController.getTransactions);
router.post('/transactions/restore', auth_1.requireAdmin, transactionController.restoreTransaction);
// Dashboard & Analytics
router.get('/dashboard/summary', auth_1.requireAdmin, dashboardController.getDashboardSummary);
// Financial Reports & Exports
router.get('/reports', auth_1.requireAdmin, reportController.getFinancialReport);
router.get('/reports/export/excel', auth_1.requireAdmin, reportController.exportReportExcel);
router.get('/reports/export/pdf', auth_1.requireAdmin, reportController.exportReportPDF);
router.get('/reports/export/csv', auth_1.requireAdmin, reportController.exportReportCSV);
// Audit Logs
router.get('/audit-logs', auth_1.requireAdmin, auditController.getAuditLogs);
// Company Notes & Financial Requirements
router.get('/company-notes', auth_1.requireAdmin, companyNoteController.getCompanyNotes);
router.get('/company-notes/summary', auth_1.requireAdmin, companyNoteController.getCompanyNotesSummary);
router.post('/company-notes', auth_1.requireAdmin, companyNoteController.createCompanyNote);
router.put('/company-notes/:id', auth_1.requireAdmin, companyNoteController.updateCompanyNote);
router.patch('/company-notes/:id/status', auth_1.requireAdmin, companyNoteController.updateCompanyNoteStatus);
router.delete('/company-notes/:id', auth_1.requireAdmin, companyNoteController.deleteCompanyNote);
// Attachments / Receipts (Streamed directly from PostgreSQL bytes - Strictly Protected)
router.get('/attachments/:id/view', auth_1.requireAdmin, attachmentController.getAttachment);
router.get('/attachments/:id/download', auth_1.requireAdmin, attachmentController.downloadAttachment);
exports.default = router;
