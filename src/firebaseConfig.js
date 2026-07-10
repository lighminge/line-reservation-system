import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBTAycM2PAyE4afO4QvgUCA89qaL3a41As",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "line-reservation-system-4bd5c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "line-reservation-system-4bd5c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "line-reservation-system-4bd5c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "331480299639",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:331480299639:web:af13ad0ce3f830aca82e72",
  measurementId: "G-0HBMK7D071"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
