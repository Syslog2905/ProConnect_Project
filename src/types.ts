import { Timestamp } from 'firebase/firestore';

export type UserRole = 'professional' | 'recruiter' | 'admin';
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
  createdAt: Timestamp;
}
