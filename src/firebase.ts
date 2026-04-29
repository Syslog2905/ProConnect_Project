import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  Timestamp,
  getDocFromServer,
  serverTimestamp,
  or,
  and
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

import { UserRole } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Shared Login Helper
let isSigningIn = false;

export async function createProfile(user: any, role: UserRole = 'professional', referredBy?: string, displayNameOverride?: string) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    console.log('Creating new user profile for role:', role);
    
    // Check for founding member status if employer
    let isFoundingMember = false;
    if (role === 'employer') {
      try {
        console.log('Checking employer count for founding member status...');
        const employersQuery = query(
          collection(db, 'users'), 
          where('role', '==', 'employer'),
          where('visibility', '==', 'active')
        );
        const employersSnap = await getDocs(employersQuery);
        console.log('Current employer count:', employersSnap.size);
        if (employersSnap.size < 100) {
          isFoundingMember = true;
        }
      } catch (err) {
        console.error('Error checking employer count:', err);
        isFoundingMember = true; 
      }
    }

    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newProfile: any = {
      uid: user.uid,
      displayName: displayNameOverride || user.displayName || 'New User',
      email: user.email || 'no-email@talentfabric.com',
      photoURL: user.photoURL || null,
      role: role,
      visibility: role === 'professional' ? 'passive' : 'active',
      gdprConsent: true,
      consentDate: Timestamp.now(),
      createdAt: Timestamp.now(),
      subscriptionTier: isFoundingMember ? 'pro' : 'free',
      connectionCredits: role === 'professional' ? 3 : 10,
      isFoundingMember,
      referralCode
    };

    if (referredBy) {
      newProfile.referredBy = referredBy;
    }

    console.log('Attempting to save profile to Firestore:', JSON.stringify(newProfile));
    try {
      await setDoc(userRef, newProfile);
      await syncPublicProfile(newProfile);
      console.log('Profile created successfully');
      return newProfile;
    } catch (err: any) {
      console.error('Failed to save profile to Firestore. Error Code:', err.code, 'Message:', err.message);
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }
  } else {
    console.log('User profile already exists, ensuring public profile sync...');
    const existingProfile = userSnap.data();
    await syncPublicProfile(existingProfile as any);
    return existingProfile;
  }
}

async function syncPublicProfile(profile: any) {
  try {
    const publicRef = doc(db, 'public_profiles', profile.uid);
    await setDoc(publicRef, {
      uid: profile.uid,
      displayName: profile.displayName,
      headline: profile.headline || '',
      bio: profile.bio || '',
      skills: profile.skills || [],
      photoURL: profile.photoURL || null,
      linkedinURL: profile.linkedinURL || null,
      role: profile.role,
      visibility: profile.visibility,
      isFeatured: profile.isFeatured || false,
      isFoundingMember: profile.isFoundingMember || false,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('Public profile synced successfully');
  } catch (err) {
    console.error('Error syncing public profile:', err);
  }
}

export async function signInWithGoogle(role: UserRole = 'professional', referredBy?: string) {
  if (isSigningIn) {
    console.log('Login already in progress, ignoring request');
    return;
  }
  
  isSigningIn = true;
  console.log('Starting login process...');
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log('User signed in:', user.uid);
    
    await createProfile(user, role, referredBy);
    return user;
  } catch (err: any) {
    if (err.code === 'auth/cancelled-popup-request') {
      console.log('Popup request was cancelled by a newer request. This is expected if multiple login attempts were made.');
      return;
    }
    if (err.code === 'auth/popup-closed-by-user') {
      console.log('User closed the login popup.');
      return;
    }
    console.error('Login failed:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export { 
  signInWithPopup, 
  signOut, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  Timestamp,
  serverTimestamp,
  or,
  and,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
};
