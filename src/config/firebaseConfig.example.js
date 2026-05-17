// Firebase Configuration - EXAMPLE FILE
// Copy this file to firebaseConfig.local.js and add your real credentials
// This file should NOT be committed to version control

// For development, you can also set environment variables:
// EXPO_PUBLIC_FIREBASE_API_KEY
// EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
// EXPO_PUBLIC_FIREBASE_PROJECT_ID
// EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
// EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
// EXPO_PUBLIC_FIREBASE_APP_ID

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};
