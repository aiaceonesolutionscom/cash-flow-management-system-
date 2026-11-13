import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import fs from 'fs';

export const getSystemLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = logger.getRecentErrors(100);
    const stats = logger.getLogStats();

    res.json({
      success: true,
      stats,
      logs
    });
  } catch (err: any) {
    logger.error('Failed to retrieve system error logs', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve system logs' });
  }
};

export const clearSystemLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const success = logger.clearErrors();
    if (success) {
      res.json({ success: true, message: 'System error logs cleared successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to clear log file' });
    }
  } catch (err: any) {
    logger.error('Failed to clear system error logs', err);
    res.status(500).json({ success: false, message: 'Failed to clear system logs' });
  }
};

export const downloadSystemLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logPath = logger.getErrorLogPath();
    if (!fs.existsSync(logPath)) {
      res.status(404).json({ success: false, message: 'No error log file found yet' });
      return;
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="cashflow-error.log"');
    const fileStream = fs.createReadStream(logPath);
    fileStream.pipe(res);
  } catch (err: any) {
    logger.error('Failed to download system error logs', err);
    res.status(500).json({ success: false, message: 'Failed to download system logs' });
  }
};
