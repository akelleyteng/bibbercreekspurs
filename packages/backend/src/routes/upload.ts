import { Router, Request, Response } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { Role } from '@4hclub/shared';
import { logger } from '../utils/logger';
import * as driveService from '../services/google-drive.service';

const router = Router();

router.post('/upload', async (req: Request, res: Response) => {
  try {
    // 1. Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // 2. Admin role check
    const userRepo = new UserRepository();
    const user = await userRepo.findById(payload.userId);
    if (!user || user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // 3. Parse multipart with multer (lazy require)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max (under Cloud Run's 32 MB limit)
    }).single('file');

    await new Promise<void>((resolve, reject) => {
      upload(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    // 4. Get target folder from form body
    const folderId = req.body?.folderId;
    if (!folderId) {
      res.status(400).json({ error: 'folderId is required' });
      return;
    }

    // 5. Upload to Google Drive
    const result = await driveService.uploadFile(
      file.originalname,
      file.mimetype,
      file.buffer,
      folderId
    );

    if (!result) {
      res.status(500).json({ error: 'Failed to upload file to Google Drive. Check server logs for details.' });
      return;
    }

    logger.info(`File uploaded to Drive: ${result.name} (${result.id})`);
    res.status(200).json({ file: result });
  } catch (error: any) {
    logger.error('Upload failed', { error: error.message, stack: error.stack });
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large (max 25 MB)' });
      return;
    }
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

export default router;
