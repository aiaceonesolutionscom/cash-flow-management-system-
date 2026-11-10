import { Request, Response } from 'express';
import { prisma } from '../prisma';
import fs from 'fs';
import path from 'path';

export const getAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      res.status(404).json({ success: false, message: 'Attachment not found' });
      return;
    }

    // 1. If stored in PostgreSQL bytea, stream directly from database
    if (attachment.fileData) {
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Length', attachment.fileData.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(attachment.fileData);
      return;
    }

    // 2. Fallback to disk if legacy file
    if (attachment.filePath) {
      const fullPath = path.join(process.cwd(), attachment.filePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        res.setHeader('Content-Type', attachment.mimeType);
        res.sendFile(fullPath);
        return;
      }
    }

    res.status(404).json({ success: false, message: 'Attachment file content not available' });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    res.status(500).json({ success: false, message: 'Failed to load attachment' });
  }
};

export const downloadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id }
    });

    if (!attachment) {
      res.status(404).json({ success: false, message: 'Attachment not found' });
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);

    if (attachment.fileData) {
      res.setHeader('Content-Length', attachment.fileData.length);
      res.send(attachment.fileData);
      return;
    }

    if (attachment.filePath) {
      const fullPath = path.join(process.cwd(), attachment.filePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        res.download(fullPath, attachment.originalName);
        return;
      }
    }

    res.status(404).json({ success: false, message: 'Attachment file content not available' });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ success: false, message: 'Failed to download attachment' });
  }
};
