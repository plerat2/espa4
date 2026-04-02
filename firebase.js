// firebase.js — Auth + Realtime Database (sense Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAAkZ6pTz9SbLovhGVddJNeLxGmwcqqlXA",
  authDomain: "cepacat26.firebaseapp.com",
  projectId: "cepacat26",
  databaseURL: "https://cepacat26-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "cepacat26.firebasestorage.app",
  messagingSenderId: "544298746696",
  appId: "1:544298746696:web:7e85453c1686b06634e97d",
  measurementId: "G-7W7XRVF02P"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);