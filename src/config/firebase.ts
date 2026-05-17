import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;
let firebaseConfig = {};

try {
  firebaseConfig = JSON.parse(firebaseConfigString || '{}');
} catch (e) {
  console.error("Failed to parse VITE_FIREBASE_CONFIG", e);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = import.meta.env.VITE_APP_ID || 'budget-tracker-app';
