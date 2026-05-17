// Firebase configuration and initialization
// Credentials are loaded from firebaseConfig.local.js (git-ignored)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebaseConfig.local';

// Validate that credentials are loaded
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_')) {
  console.warn('⚠️  Firebase configuration incomplete. Update firebaseConfig.local.js with your credentials.');
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
