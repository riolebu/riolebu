// Firebase Configuration for Rio Lebu
const firebaseConfig = {
  apiKey: "AIzaSyAEujJWnPA3x_bWwfcOxvkyE259T7-fskM",
  authDomain: "riolebu-b932d.firebaseapp.com",
  projectId: "riolebu-b932d",
  storageBucket: "riolebu-b932d.firebasestorage.app",
  messagingSenderId: "298809741766",
  appId: "1:298809741766:web:e3873c89caa5cc89bfa2c7"
};

// Initialize Firebase (Compat Version)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// Make them global since we are not in a module anymore
window.db = db;
window.storage = storage;
