import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Real configuration automatically provisioned for this applet
const firebaseConfig = {
  apiKey: "AIzaSyAyHbipA3S6F8Te3fAetaac6Zn_qKC7Quc",
  authDomain: "yachty-simplicity-msjh2.firebaseapp.com",
  projectId: "yachty-simplicity-msjh2",
  storageBucket: "yachty-simplicity-msjh2.firebasestorage.app",
  messagingSenderId: "727959746142",
  appId: "1:727959746142:web:b4831243727843a98066cf"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom databaseId from config
export const db = getFirestore(app, "ai-studio-7bfc3cd6-21d1-4cb8-8846-554d95f85266");
