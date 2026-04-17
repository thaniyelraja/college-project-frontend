import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser, getAdditionalUserInfo, sendEmailVerification } from "firebase/auth";

// Automatically mapped from user's provided configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3gR5KxEZo7iI3sC1bz4HF4xSSFrlNxTo",
  authDomain: "smart-trip-planner-ai.firebaseapp.com",
  projectId: "smart-trip-planner-ai",
  storageBucket: "smart-trip-planner-ai.firebasestorage.app",
  messagingSenderId: "741838660987",
  appId: "1:741838660987:web:5db5049f2e43acb89909de"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const yahooProvider = new OAuthProvider('yahoo.com');

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser, getAdditionalUserInfo, sendEmailVerification };
