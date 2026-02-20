import { Visibility } from '../enums/visibility.enum';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
  visibility: Visibility;
  externalRegistrationUrl?: string;
  isAllDay: boolean;
  registrationCount: number;
  userRsvpStatus?: string;
}
