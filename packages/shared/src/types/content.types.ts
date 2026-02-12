export enum HomeSectionType {
  MISSION = 'MISSION',
  ABOUT = 'ABOUT',
  CONTACT = 'CONTACT',
}

export interface HomePageContent {
  id: string;
  sectionType: HomeSectionType;
  title?: string;
  content: string;
  imageUrl?: string;
  orderIndex?: number;
  isActive: boolean;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  description?: string;
  orderIndex?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Testimonial {
  id: string;
  authorName: string;
  authorRole?: string;
  content: string;
  imageUrl?: string;
  orderIndex?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHomeContentRequest {
  sectionType: HomeSectionType;
  title?: string;
  content?: string;
  imageUrl?: string;
}

export interface CreateSponsorRequest {
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  description?: string;
  orderIndex?: number;
}

export interface UpdateSponsorRequest {
  name?: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  orderIndex?: number;
  isActive?: boolean;
}

export interface CreateTestimonialRequest {
  authorName: string;
  authorRole?: string;
  content: string;
  imageUrl?: string;
  orderIndex?: number;
}

export interface UpdateTestimonialRequest {
  authorName?: string;
  authorRole?: string;
  content?: string;
  imageUrl?: string;
  orderIndex?: number;
  isActive?: boolean;
}
