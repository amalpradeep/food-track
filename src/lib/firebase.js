// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyALPuJRl3feDiFtKzsTszwDBXYGyZxAF5U',
  authDomain: 'foodtracker-9b80e.firebaseapp.com',
  projectId: 'foodtracker-9b80e',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
