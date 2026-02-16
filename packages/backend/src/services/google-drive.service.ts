import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Readable } from 'stream';

// Lazy-initialized Drive client — googleapis is loaded on first use
// to avoid ts-node processing its massive type definitions at startup.
// Uses service account auth (folders shared with the SA as editor).
let driveClient: any = null;

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
  const drive = getDriveClient();
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
  } catch (error) {
    logger.error('Failed to upload file to Google Drive', { error, fileName });
    return null;
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
