import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

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

export async function signInWithGoogle() {
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
    
    // Check if user profile exists
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('Creating new user profile...');
      const newProfile = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        role: 'professional',
        visibility: 'passive',
        gdprConsent: false,
        consentDate: null,
        createdAt: Timestamp.now(),
        subscriptionTier: 'free',
        connectionCredits: 3,
      };
      try {
        await setDoc(userRef, newProfile);
        console.log('Profile created successfully');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }
    } else {
      console.log('User profile already exists');
    }
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
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  serverTimestamp
};
