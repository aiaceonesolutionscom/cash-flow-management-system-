"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadSystemLogs = exports.clearSystemLogs = exports.getSystemLogs = void 0;
const logger_1 = require("../utils/logger");
const fs_1 = __importDefault(require("fs"));
const getSystemLogs = async (_req, res) => {
    try {
        const logs = logger_1.logger.getRecentErrors(100);
        const stats = logger_1.logger.getLogStats();
        res.json({
            success: true,
            stats,
            logs
        });
    }
    catch (err) {
        logger_1.logger.error('Failed to retrieve system error logs', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve system logs' });
    }
};
exports.getSystemLogs = getSystemLogs;
const clearSystemLogs = async (_req, res) => {
    try {
        const success = logger_1.logger.clearErrors();
        if (success) {
            res.json({ success: true, message: 'System error logs cleared successfully' });
        }
        else {
            res.status(500).json({ success: false, message: 'Failed to clear log file' });
        }
    }
    catch (err) {
        logger_1.logger.error('Failed to clear system error logs', err);
        res.status(500).json({ success: false, message: 'Failed to clear system logs' });
    }
};
exports.clearSystemLogs = clearSystemLogs;
const downloadSystemLogs = async (_req, res) => {
    try {
        const logPath = logger_1.logger.getErrorLogPath();
        if (!fs_1.default.existsSync(logPath)) {
            res.status(404).json({ success: false, message: 'No error log file found yet' });
            return;
        }
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="cashflow-error.log"');
        const fileStream = fs_1.default.createReadStream(logPath);
        fileStream.pipe(res);
    }
    catch (err) {
        logger_1.logger.error('Failed to download system error logs', err);
        res.status(500).json({ success: false, message: 'Failed to download system logs' });
    }
};
exports.downloadSystemLogs = downloadSystemLogs;
