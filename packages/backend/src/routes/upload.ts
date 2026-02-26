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

// Email attachment upload (admin-only, uploads to GCS)
router.post('/upload/email-attachment', async (req: Request, res: Response) => {
  try {
    // 1. Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // 2. Verify user exists and is admin
    const userRepo = new UserRepository();
    const user = await userRepo.findById(payload.userId);
    if (!user || user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // 3. Parse multipart (10 MB limit)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
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

    // 4. Upload to GCS under email-attachments prefix
    const ext = file.originalname.includes('.')
      ? file.originalname.substring(file.originalname.lastIndexOf('.'))
      : '';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const { randomUUID } = require('crypto');
    const gcsPath = `email-attachments/${year}/${month}/${randomUUID()}${ext}`;

    const result = await gcsService.uploadToPath(gcsPath, file.buffer, file.mimetype);

    logger.info(`Email attachment uploaded by ${user.email}: ${gcsPath}`);

    res.status(200).json({
      url: result.publicUrl,
      filename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
  } catch (error: any) {
    logger.error('Email attachment upload failed', { error: error.message });
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large (max 10 MB)' });
      return;
    }
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

// Profile photo upload (any authenticated user)
router.post('/upload/profile-photo', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    const userRepo = new UserRepository();
    const user = await userRepo.findById(payload.userId);
    if (!user || user.approval_status !== 'APPROVED') {
      res.status(403).json({ error: 'Account not approved' });
      return;
    }

    // Optional: admin can upload on behalf of another user
    const targetUserId = req.body?.userId && user.role === Role.ADMIN ? req.body.userId : payload.userId;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
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

    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ error: 'Only image files are allowed' });
      return;
    }

    const ext = file.originalname.includes('.')
      ? file.originalname.substring(file.originalname.lastIndexOf('.'))
      : '.jpg';
    const { randomUUID } = require('crypto');
    const gcsPath = `profile-photos/${targetUserId}/${randomUUID()}${ext}`;

    const result = await gcsService.uploadToPath(gcsPath, file.buffer, file.mimetype);

    // Update user record
    await userRepo.adminUpdate(targetUserId, { profile_photo_url: result.publicUrl });

    logger.info(`Profile photo uploaded for ${targetUserId} by ${user.email}`);

    res.status(200).json({
      url: result.publicUrl,
      filename: file.originalname,
    });
  } catch (error: any) {
    logger.error('Profile photo upload failed', { error: error.message });
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large (max 10 MB)' });
      return;
    }
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

// Horse photo upload (any authenticated user)
router.post('/upload/horse-photo', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    const userRepo = new UserRepository();
    const user = await userRepo.findById(payload.userId);
    if (!user || user.approval_status !== 'APPROVED') {
      res.status(403).json({ error: 'Account not approved' });
      return;
    }

    const targetUserId = req.body?.userId && user.role === Role.ADMIN ? req.body.userId : payload.userId;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
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

    if (!file.mimetype.startsWith('image/')) {
      res.status(400).json({ error: 'Only image files are allowed' });
      return;
    }

    const ext = file.originalname.includes('.')
      ? file.originalname.substring(file.originalname.lastIndexOf('.'))
      : '.jpg';
    const { randomUUID } = require('crypto');
    const gcsPath = `horse-photos/${targetUserId}/${randomUUID()}${ext}`;

    const result = await gcsService.uploadToPath(gcsPath, file.buffer, file.mimetype);

    // Update user record
    await userRepo.adminUpdate(targetUserId, { horse_photo_url: result.publicUrl });

    logger.info(`Horse photo uploaded for ${targetUserId} by ${user.email}`);

    res.status(200).json({
      url: result.publicUrl,
      filename: file.originalname,
    });
  } catch (error: any) {
    logger.error('Horse photo upload failed', { error: error.message });
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'File too large (max 10 MB)' });
      return;
    }
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

// Public proxy for Google Drive images (sponsors, etc.)
// Streams file content via service account so sharing settings don't matter.
router.get('/drive-image/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      res.status(400).json({ error: 'Invalid file ID' });
      return;
    }

    const result = await driveService.getFileStream(fileId);
    if (!result) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    result.stream.pipe(res);
  } catch (error: any) {
    logger.error('Drive image proxy failed', { error: error.message, fileId: req.params.fileId });
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

export default router;
