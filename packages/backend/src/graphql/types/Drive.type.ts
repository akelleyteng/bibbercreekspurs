import { ObjectType, Field, ID } from 'type-graphql';

@ObjectType('DriveFile')
export class DriveFileGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  mimeType!: string;

  @Field()
  isFolder!: boolean;

  @Field({ nullable: true })
  size?: string;

  @Field({ nullable: true })
  webViewLink?: string;

  @Field({ nullable: true })
  webContentLink?: string;

  @Field({ nullable: true })
  iconLink?: string;

  @Field({ nullable: true })
  thumbnailLink?: string;

  @Field()
  createdTime!: string;

  @Field()
  modifiedTime!: string;
}

@ObjectType('DriveFileList')
export class DriveFileListGQL {
  @Field(() => [DriveFileGQL])
  files!: DriveFileGQL[];

  @Field({ nullable: true })
  nextPageToken?: string;

  @Field()
  currentFolderId!: string;

  @Field({ nullable: true })
  currentFolderName?: string;
}

@ObjectType('DriveFolderInfo')
export class DriveFolderInfoGQL {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  accessLevel!: string;
}
