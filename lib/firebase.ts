import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDL22PjaUc-fGpyS9fmVCZJAOFI20BMRRo",
  authDomain: "fastevergo.firebaseapp.com",
  projectId: "fastevergo",
  storageBucket: "fastevergo.firebasestorage.app",
  messagingSenderId: "580111714111",
  appId: "1:580111714111:web:fb4ee63aaa5b247846f58a",
  measurementId: "G-8DYEBG7JVC",
};

// Initialize Firebase (prevents re-initializing across hot reloads)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);