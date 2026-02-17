import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import { DriveFileGQL, DriveFileListGQL, DriveFolderInfoGQL } from '../types/Drive.type';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import * as driveService from '../../services/google-drive.service';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

@Resolver()
export class DriveResolver {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  private requireAuth(context: Context): string {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    return payload.userId;
  }

  private async requireAdmin(context: Context): Promise<string> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await this.userRepo.findById(payload.userId);

    if (!user || user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return payload.userId;
  }

  private async getUserRole(userId: string): Promise<string> {
    const user = await this.userRepo.findById(userId);
    return user?.role || Role.PARENT;
  }

  private mapFile(file: driveService.DriveFileInfo): DriveFileGQL {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      isFolder: file.mimeType === FOLDER_MIME,
      size: file.size || undefined,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      iconLink: file.iconLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
    };
  }

  /**
   * Determine which root folder a given folderId belongs to.
   * Returns 'members', 'leadership', or null if not a recognized folder.
   */
  private async getRootFolderType(folderId: string): Promise<'members' | 'leadership' | null> {
    const membersFolderId = env.GOOGLE_DRIVE_MEMBERS_FOLDER_ID;
    const leadershipFolderId = env.GOOGLE_DRIVE_LEADERSHIP_FOLDER_ID;

    // Direct match
    if (folderId === membersFolderId) return 'members';
    if (folderId === leadershipFolderId) return 'leadership';

    // Check parent chain (one level up)
    const metadata = await driveService.getFileMetadata(folderId);
    if (!metadata?.parents) return null;

    for (const parentId of metadata.parents) {
      if (parentId === membersFolderId) return 'members';
      if (parentId === leadershipFolderId) return 'leadership';
      // Recurse one more level for deeper subfolders
      const parentMeta = await driveService.getFileMetadata(parentId);
      if (parentMeta?.parents) {
        for (const grandparentId of parentMeta.parents) {
          if (grandparentId === membersFolderId) return 'members';
          if (grandparentId === leadershipFolderId) return 'leadership';
        }
      }
    }

    return null;
  }

  @Query(() => [DriveFolderInfoGQL])
  async driveFolders(
    @Ctx() context: Context
  ): Promise<DriveFolderInfoGQL[]> {
    const userId = this.requireAuth(context);
    const role = await this.getUserRole(userId);

    const folders: DriveFolderInfoGQL[] = [];

    if (env.GOOGLE_DRIVE_MEMBERS_FOLDER_ID) {
      folders.push({
        id: env.GOOGLE_DRIVE_MEMBERS_FOLDER_ID,
        name: 'Members Files',
        accessLevel: 'members',
      });
    }

    if (env.GOOGLE_DRIVE_LEADERSHIP_FOLDER_ID && (role === Role.ADULT_LEADER || role === Role.ADMIN)) {
      folders.push({
        id: env.GOOGLE_DRIVE_LEADERSHIP_FOLDER_ID,
        name: 'Leadership Files',
        accessLevel: 'leadership',
      });
    }

    return folders;
  }

  @Query(() => DriveFileListGQL)
  async driveFiles(
    @Arg('folderId') folderId: string,
    @Arg('pageToken', () => String, { nullable: true }) pageToken: string | undefined,
    @Arg('pageSize', () => Int, { nullable: true, defaultValue: 50 }) pageSize: number,
    @Ctx() context: Context
  ): Promise<DriveFileListGQL> {
    const userId = this.requireAuth(context);
    const role = await this.getUserRole(userId);

    // Determine which root folder this belongs to and enforce access
    const folderType = await this.getRootFolderType(folderId);

    if (!folderType) {
      throw new GraphQLError('Access denied: folder not in a recognized root', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    if (folderType === 'leadership' && role !== Role.ADULT_LEADER && role !== Role.ADMIN) {
      throw new GraphQLError('Leadership files require Adult Leader or Admin access', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const result = await driveService.listFiles(folderId, pageToken, pageSize);

    // Get folder name for breadcrumb
    let folderName: string | undefined;
    const membersFolderId = env.GOOGLE_DRIVE_MEMBERS_FOLDER_ID;
    const leadershipFolderId = env.GOOGLE_DRIVE_LEADERSHIP_FOLDER_ID;

    if (folderId === membersFolderId) {
      folderName = 'Members Files';
    } else if (folderId === leadershipFolderId) {
      folderName = 'Leadership Files';
    } else {
      const meta = await driveService.getFileMetadata(folderId);
      folderName = meta?.name || undefined;
    }

    return {
      files: result.files.map((f) => this.mapFile(f)),
      nextPageToken: result.nextPageToken || undefined,
      currentFolderId: folderId,
      currentFolderName: folderName,
    };
  }

  @Mutation(() => Boolean)
  async deleteDriveFile(
    @Arg('fileId') fileId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);

    const deleted = await driveService.deleteFile(fileId);
    if (!deleted) {
      throw new GraphQLError('Failed to delete file', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return true;
  }

  @Mutation(() => DriveFileGQL)
  async createDriveFolder(
    @Arg('folderName') folderName: string,
    @Arg('parentFolderId') parentFolderId: string,
    @Ctx() context: Context
  ): Promise<DriveFileGQL> {
    await this.requireAdmin(context);

    const folder = await driveService.createFolder(folderName, parentFolderId);
    if (!folder) {
      throw new GraphQLError('Failed to create folder', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return this.mapFile(folder);
  }
}
