export enum CommunicationEmailType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  CLUB_UPDATE = 'CLUB_UPDATE',
  MEETING_CANCELLED = 'MEETING_CANCELLED',
  EVENT_REMINDER = 'EVENT_REMINDER',
  VOLUNTEER_REQUEST = 'VOLUNTEER_REQUEST',
  FUNDRAISER = 'FUNDRAISER',
  OTHER = 'OTHER',
}

export const COMMUNICATION_EMAIL_TYPE_LABELS: Record<CommunicationEmailType, string> = {
  [CommunicationEmailType.ANNOUNCEMENT]: 'Announcement',
  [CommunicationEmailType.CLUB_UPDATE]: 'Club Update / Reminder',
  [CommunicationEmailType.MEETING_CANCELLED]: 'Meeting Cancelled',
  [CommunicationEmailType.EVENT_REMINDER]: 'Event Reminder',
  [CommunicationEmailType.VOLUNTEER_REQUEST]: 'Volunteer Request',
  [CommunicationEmailType.FUNDRAISER]: 'Fundraiser',
  [CommunicationEmailType.OTHER]: 'Other',
};

export enum RecipientGroup {
  ALL_MEMBERS = 'ALL_MEMBERS',
  YOUTH_MEMBERS = 'YOUTH_MEMBERS',
  ADULT_LEADERS = 'ADULT_LEADERS',
  PARENTS = 'PARENTS',
  OFFICERS = 'OFFICERS',
}

export const RECIPIENT_GROUP_LABELS: Record<RecipientGroup, string> = {
  [RecipientGroup.ALL_MEMBERS]: 'All Members',
  [RecipientGroup.YOUTH_MEMBERS]: 'Youth Members',
  [RecipientGroup.ADULT_LEADERS]: 'Adult Leaders',
  [RecipientGroup.PARENTS]: 'Parents',
  [RecipientGroup.OFFICERS]: 'Officers',
};
