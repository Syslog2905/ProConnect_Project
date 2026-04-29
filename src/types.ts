import { Timestamp } from 'firebase/firestore';

export type UserRole = 'professional' | 'recruiter' | 'employer' | 'admin';
export type VisibilityMode = 'active' | 'passive' | 'hidden';
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  headline?: string;
  bio?: string;
  skills?: string[];
  role: UserRole;
  visibility: VisibilityMode;
  gdprConsent: boolean;
  consentDate: Timestamp | null;
  createdAt: Timestamp;
  subscriptionTier?: 'free' | 'pro';
  connectionCredits?: number;
  isFeatured?: boolean;
  featuredUntil?: Timestamp | null;
  isFoundingMember?: boolean;
  referralCode?: string;
  referredBy?: string;
  photoURL?: string;
  linkedinURL?: string;
  cvURL?: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface Connection {
  id: string;
  fromUid: string;
  toUid: string;
  status: ConnectionStatus;
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  senderUid: string;
  receiverUid: string;
  content: string;
  attachments?: Attachment[];
  createdAt: Timestamp;
}

export interface JobPost {
  id: string;
  recruiterUid: string;
  title: string;
  company: string;
  location: string;
  industry: string;
  category: string;
  description: string;
  requirements: string[];
  salaryRange?: string;
  type: 'full-time' | 'part-time' | 'contract' | 'freelance';
  status: 'active' | 'closed';
  createdAt: Timestamp;
  isFeatured?: boolean;
  isFoundingMember?: boolean;
}
