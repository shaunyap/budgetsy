import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAavx7Ma7zyXCZ089er2eTdnmA0mIdQKQI",
  authDomain: "budget-tracker-fe7a8.firebaseapp.com",
  projectId: "budget-tracker-fe7a8",
  storageBucket: "budget-tracker-fe7a8.firebasestorage.app",
  messagingSenderId: "746791281833",
  appId: "1:746791281833:web:66c284a3ea10ba4ef8f5b8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = 'budget-tracker-app';
