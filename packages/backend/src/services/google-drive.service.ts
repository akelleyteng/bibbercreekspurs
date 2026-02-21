import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Readable } from 'stream';

// Lazy-initialized Drive clients — googleapis is loaded on first use
// to avoid ts-node processing its massive type definitions at startup.
//
// Two clients:
// 1. Service account client — for reads, listing, deleting, folder creation (metadata-only ops)
// 2. OAuth2 client — for file uploads (service accounts lack storage quota).
//    Uses the Gmail OAuth2 app credentials with a Drive-scoped refresh token.
let driveClient: any = null;
let driveUploadClient: any = null;

function getDriveClient(): any {
  if (!env.GOOGLE_DRIVE_MEMBERS_FOLDER_ID && !env.GOOGLE_DRIVE_LEADERSHIP_FOLDER_ID) {
    return null;
  }

  if (!driveClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    driveClient = google.drive({ version: 'v3', auth });
  }

  return driveClient;
}

/**
 * Get an OAuth2-authenticated Drive client for uploads.
 * Service accounts can't upload (no storage quota), so we use the
 * app account's OAuth2 credentials. Reuses the Gmail OAuth2 app
 * (GMAIL_CLIENT_ID/SECRET) with a Drive-scoped refresh token.
 */
function getDriveUploadClient(): any {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID || env.GMAIL_CLIENT_ID;
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET || env.GMAIL_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_DRIVE_OWNER_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    logger.warn('Drive upload OAuth2 credentials not configured — falling back to service account');
    return getDriveClient();
  }

  if (!driveUploadClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { google } = require('googleapis');
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    driveUploadClient = google.drive({ version: 'v3', auth: oauth2 });
  }

  return driveUploadClient;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  iconLink: string | null;
  thumbnailLink: string | null;
  createdTime: string;
  modifiedTime: string;
  parents: string[] | null;
}

const FILE_FIELDS = 'id, name, mimeType, size, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime, parents';

function mapFileResponse(file: any): DriveFileInfo {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size || null,
    webViewLink: file.webViewLink || null,
    webContentLink: file.webContentLink || null,
    iconLink: file.iconLink || null,
    thumbnailLink: file.thumbnailLink || null,
    createdTime: file.createdTime || '',
    modifiedTime: file.modifiedTime || '',
    parents: file.parents || null,
  };
}

/**
 * List files in a Google Drive folder. Returns files sorted folders-first, then alphabetical.
 */
export async function listFiles(
  folderId: string,
  pageToken?: string,
  pageSize: number = 50
): Promise<{ files: DriveFileInfo[]; nextPageToken: string | null }> {
  const drive = getDriveClient();
  if (!drive) return { files: [], nextPageToken: null };

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken, files(${FILE_FIELDS})`,
      pageSize: Math.min(pageSize, 100),
      pageToken: pageToken || undefined,
      orderBy: 'folder, name',
    });

    const files = (response.data.files || []).map(mapFileResponse);
    const nextPage = response.data.nextPageToken || null;

    return { files, nextPageToken: nextPage };
  } catch (error) {
    logger.error('Failed to list Google Drive files', { error, folderId });
    return { files: [], nextPageToken: null };
  }
}

/**
 * Get metadata for a single file or folder.
 */
export async function getFileMetadata(fileId: string): Promise<DriveFileInfo | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const response = await drive.files.get({
      fileId,
      fields: FILE_FIELDS,
    });

    return mapFileResponse(response.data);
  } catch (error) {
    logger.error('Failed to get Google Drive file metadata', { error, fileId });
    return null;
  }
}

/**
 * Upload a file to Google Drive. Returns file metadata on success.
 */
export async function uploadFile(
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer,
  folderId: string
): Promise<DriveFileInfo | null> {
  const drive = getDriveUploadClient();
  if (!drive) return null;

  try {
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: FILE_FIELDS,
    });

    logger.info(`File uploaded to Google Drive: ${response.data.name} (${response.data.id})`);
    return mapFileResponse(response.data);
  } catch (error: any) {
    logger.error('Failed to upload file to Google Drive', {
      fileName,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorResponse: error?.response?.data,
    });
    throw error;
  }
}

/**
 * Delete a file or folder from Google Drive.
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  const drive = getDriveClient();
  if (!drive) return false;

  try {
    await drive.files.delete({ fileId });
    logger.info(`Google Drive file deleted: ${fileId}`);
    return true;
  } catch (error) {
    logger.error('Failed to delete Google Drive file', { error, fileId });
    return false;
  }
}

/**
 * Create a subfolder in Google Drive.
 */
export async function createFolder(
  folderName: string,
  parentFolderId: string
): Promise<DriveFileInfo | null> {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: FILE_FIELDS,
    });

    logger.info(`Google Drive folder created: ${response.data.name} (${response.data.id})`);
    return mapFileResponse(response.data);
  } catch (error) {
    logger.error('Failed to create Google Drive folder', { error, folderName });
    return null;
  }
}

/**
 * Determine which root folder a given folderId belongs to.
 * Walks up the parent chain (up to 2 levels) to find a recognized root folder.
 * Returns 'members', 'leadership', or null if not recognized.
 */
export async function getRootFolderType(folderId: string): Promise<'members' | 'leadership' | null> {
  const membersFolderId = env.GOOGLE_DRIVE_MEMBERS_FOLDER_ID;
  const leadershipFolderId = env.GOOGLE_DRIVE_LEADERSHIP_FOLDER_ID;

  // Direct match
  if (folderId === membersFolderId) return 'members';
  if (folderId === leadershipFolderId) return 'leadership';

  // Check parent chain (one level up)
  const metadata = await getFileMetadata(folderId);
  if (!metadata?.parents) return null;

  for (const parentId of metadata.parents) {
    if (parentId === membersFolderId) return 'members';
    if (parentId === leadershipFolderId) return 'leadership';
    // Recurse one more level for deeper subfolders
    const parentMeta = await getFileMetadata(parentId);
    if (parentMeta?.parents) {
      for (const grandparentId of parentMeta.parents) {
        if (grandparentId === membersFolderId) return 'members';
        if (grandparentId === leadershipFolderId) return 'leadership';
      }
    }
  }

  return null;
}
