import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEujJWnPA3x_bWwfcOxvkyE259T7-fskM",
  authDomain: "riolebu-b932d.firebaseapp.com",
  projectId: "riolebu-b932d",
  storageBucket: "riolebu-b932d.firebasestorage.app",
  messagingSenderId: "298809741766",
  appId: "1:298809741766:web:e3873c89caa5cc89bfa2c7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
