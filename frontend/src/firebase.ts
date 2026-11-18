import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC24TeEt3KazwxGNLlahaH2OIN0eCK2P4U",
  authDomain: "medvisionrx-dec75.firebaseapp.com",
  projectId: "medvisionrx-dec75",
  storageBucket: "medvisionrx-dec75.firebasestorage.app",
  messagingSenderId: "76480649413",
  appId: "1:76480649413:web:42a874740fddbf1b5878ac",
  measurementId: "G-5630YMB5N9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;