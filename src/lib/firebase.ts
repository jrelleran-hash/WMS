"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBCU1XKyOh-jv5x754U1lu2FPmM7m1U9dg",
  authDomain: "coreflow-k1qy1.firebaseapp.com",
  projectId: "coreflow-k1qy1",
  storageBucket: "coreflow-k1qy1.appspot.com", // use appspot.com
  messagingSenderId: "313160709001",
  appId: "1:313160709001:web:0df3793635a5f3e77a2758",
  // measurementId optional
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { app };
