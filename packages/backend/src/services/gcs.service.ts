import { env } from '../config/env';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import * as path from 'path';

// Lazy-initialized storage client — loaded on first use
// to avoid processing the GCS SDK at startup.
let storageClient: any = null;

function getStorage(): any {
  if (!storageClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require('@google-cloud/storage');
    storageClient = new Storage({
      projectId: env.GCP_PROJECT_ID || undefined,
    });
  }
  return storageClient;
}

function getBucket() {
  const bucketName = env.GCP_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error('GCP_STORAGE_BUCKET not configured');
  }
  return getStorage().bucket(bucketName);
}

export const MEDIA_CONSTRAINTS = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
  },
  video: {
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
  },
  maxPerPost: 4,
};

export type MediaType = 'image' | 'video';

export interface UploadResult {
  gcsPath: string;
  publicUrl: string;
  mediaType: MediaType;
  mimeType: string;
  fileSize: number;
  originalFilename: string;
}

export function getMediaType(mimeType: string): MediaType | null {
  if (MEDIA_CONSTRAINTS.image.mimeTypes.includes(mimeType)) return 'image';
  if (MEDIA_CONSTRAINTS.video.mimeTypes.includes(mimeType)) return 'video';
  return null;
}

export function validateMediaFile(
  mimeType: string,
  fileSize: number
): { valid: true; mediaType: MediaType } | { valid: false; error: string } {
  const mediaType = getMediaType(mimeType);
  if (!mediaType) {
    return { valid: false, error: `Unsupported file type: ${mimeType}` };
  }
  const constraints = MEDIA_CONSTRAINTS[mediaType];
  if (fileSize > constraints.maxSizeBytes) {
    const maxMB = constraints.maxSizeBytes / (1024 * 1024);
    return { valid: false, error: `${mediaType} files must be under ${maxMB} MB` };
  }
  return { valid: true, mediaType };
}

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

/**
 * Upload a buffer to GCS under the social-feed prefix.
 * Path format: social-feed/YYYY/MM/<uuid>.<ext>
 */
export async function uploadMedia(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadResult> {
  const validation = validateMediaFile(mimeType, fileBuffer.length);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = path.extname(originalFilename).toLowerCase() || EXTENSION_MAP[mimeType] || '';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = randomUUID();
  const gcsPath = `social-feed/${year}/${month}/${uuid}${ext}`;

  const bucket = getBucket();
  const file = bucket.file(gcsPath);

  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000',
    },
    resumable: false,
  });

  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${env.GCP_STORAGE_BUCKET}/${gcsPath}`;

  logger.info(`Media uploaded to GCS: ${gcsPath} (${fileBuffer.length} bytes)`);

  return {
    gcsPath,
    publicUrl,
    mediaType: validation.mediaType,
    mimeType,
    fileSize: fileBuffer.length,
    originalFilename,
  };
}

/**
 * Delete a file from GCS by its path.
 */
export async function deleteMedia(gcsPath: string): Promise<boolean> {
  try {
    const bucket = getBucket();
    await bucket.file(gcsPath).delete();
    logger.info(`Media deleted from GCS: ${gcsPath}`);
    return true;
  } catch (error: any) {
    if (error.code === 404) {
      logger.warn(`GCS file not found (already deleted?): ${gcsPath}`);
      return true;
    }
    logger.error('Failed to delete GCS media', { gcsPath, error: error.message });
    return false;
  }
}
