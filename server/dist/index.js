"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
const initDefaults_1 = require("./utils/initDefaults");
// Catch uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
    logger_1.logger.error('Fatal Uncaught Exception', err);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Promise Rejection', reason);
});
const PORT = process.env.PORT || 5000;
const app = (0, app_1.createApp)();
app.listen(PORT, async () => {
    logger_1.logger.info(`Cash Flow Server started on port ${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
    console.log(`🚀 Cash Flow Management Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    await (0, initDefaults_1.ensureDefaultEntities)();
});
