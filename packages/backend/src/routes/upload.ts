import { Router, Request, Response } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { PostRepository } from '../repositories/post.repository';
import { Role } from '@4hclub/shared';
import { logger } from '../utils/logger';
import * as driveService from '../services/google-drive.service';
import * as gcsService from '../services/gcs.service';

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

    // 2. Verify user exists and is approved
    const userRepo = new UserRepository();
    const user = await userRepo.findById(payload.userId);
    if (!user || user.approval_status !== 'APPROVED') {
      res.status(403).json({ error: 'Account not approved' });
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

    // 5. Validate folder access
    const folderType = await driveService.getRootFolderType(folderId);
    if (!folderType) {
      res.status(403).json({ error: 'Access denied: folder not in a recognized root' });
      return;
    }
    if (folderType === 'leadership' && user.role !== Role.ADULT_LEADER && user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Leadership files require Adult Leader or Admin access' });
      return;
    }

    // 6. Upload to Google Drive
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

    logger.info(`File uploaded to Drive by ${user.email}: ${result.name} (${result.id})`);
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

router.post('/upload/media', async (req: Request, res: Response) => {
  try {
    // 1. Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // 2. Verify user exists and is approved
    const userRepo = new UserRepository();
    const user = await userRepo.findById(payload.userId);
    if (!user || user.approval_status !== 'APPROVED') {
      res.status(403).json({ error: 'Account not approved' });
      return;
    }

    // 3. Parse multipart (50 MB limit for videos)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
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

    // 4. Validate media type and size
    const validation = gcsService.validateMediaFile(file.mimetype, file.size);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // 5. Upload to GCS
    const result = await gcsService.uploadMedia(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // 6. Insert unlinked media row in database
    const postRepo = new PostRepository();
    const mediaRow = await postRepo.createMedia({
      uploader_id: payload.userId,
      media_type: result.mediaType,
      gcs_path: result.gcsPath,
      public_url: result.publicUrl,
      original_filename: result.originalFilename,
      mime_type: result.mimeType,
      file_size: result.fileSize,
    });

    logger.info(`Media uploaded by ${user.email}: ${mediaRow.id} (${result.mediaType})`);

    res.status(200).json({
      media: {
        id: mediaRow.id,
        mediaType: result.mediaType,
        publicUrl: result.publicUrl,
        originalFilename: result.originalFilename,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
      },
    });
  } catch (error: any) {
    logger.error('Media upload failed', { error: error.message, stack: error.stack });
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large (max 50 MB for videos, 10 MB for images)' });
      return;
    }
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

export default router;
