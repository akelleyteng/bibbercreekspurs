import { EventStatus, RegistrationStatus, Visibility } from '../enums/visibility.enum';

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  visibility: Visibility;
  googleCalendarId?: string;
  facebookEventId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface EventWithCreator extends Event {
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  registrationCount: number;
  userRegistrationStatus?: RegistrationStatus;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  status: RegistrationStatus;
  registeredAt: Date;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  visibility: Visibility;
  publishToGoogleCalendar?: boolean;
  publishToFacebook?: boolean;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  visibility?: Visibility;
}

export interface RegisterForEventRequest {
  eventId: string;
}

export interface EventAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  registrationStatus: RegistrationStatus;
  registeredAt: Date;
}
