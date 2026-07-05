import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType('PresentationReservationUser')
export class PresentationReservationUserGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field({ nullable: true })
  profilePhotoUrl?: string;
}

@ObjectType('PresentationReservationYouthMember')
export class PresentationReservationYouthMemberGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(() => ID)
  parentUserId!: string;
}

@ObjectType('PresentationFile')
export class PresentationFileGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  driveFileId!: string;

  @Field()
  driveFileName!: string;

  @Field({ nullable: true })
  driveFileUrl?: string;

  @Field()
  fileType!: string; // 'presentation' | 'image' | 'recording'

  @Field()
  createdAt!: string;
}

@ObjectType('PresentationReservation')
export class PresentationReservationGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  meetingId!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [PresentationFileGQL])
  files!: PresentationFileGQL[];

  // Exactly one of `user` or `youthMember` is populated.
  @Field(() => PresentationReservationUserGQL, { nullable: true })
  user?: PresentationReservationUserGQL;

  @Field(() => PresentationReservationYouthMemberGQL, { nullable: true })
  youthMember?: PresentationReservationYouthMemberGQL;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  // Only set when querying user's own presentations (joined with meeting)
  @Field({ nullable: true })
  googleEventId?: string;
}

@ObjectType('PresentationMeeting')
export class PresentationMeetingGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  googleEventId!: string;

  @Field(() => Int)
  totalSlots!: number;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => Int)
  slotsRemaining!: number;

  // Event info from Google Calendar
  @Field({ nullable: true })
  eventTitle?: string;

  @Field({ nullable: true })
  eventDate?: string;

  @Field({ nullable: true })
  eventLocation?: string;

  @Field(() => [PresentationReservationGQL])
  reservations!: PresentationReservationGQL[];

  @Field({ nullable: true })
  agendaDriveFileId?: string;

  @Field({ nullable: true })
  agendaDriveFileName?: string;

  @Field({ nullable: true })
  agendaDriveFileUrl?: string;

  @Field({ nullable: true })
  minutesDriveFileId?: string;

  @Field({ nullable: true })
  minutesDriveFileName?: string;

  @Field({ nullable: true })
  minutesDriveFileUrl?: string;

  @Field()
  createdAt!: string;
}
