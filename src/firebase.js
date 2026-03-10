import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBzrOOf9hBzS5P5kcrOr-4FQyb52C2ODmg",
  authDomain: "league-of-crests.firebaseapp.com",
  projectId: "league-of-crests",
  storageBucket: "league-of-crests.firebasestorage.app",
  messagingSenderId: "861669589858",
  appId: "1:861669589858:web:2c51a036dbc5117dd4223b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const storage = {
  get: async (key) => {
    try {
      const snap = await getDoc(doc(db, "appData", key));
      if (snap.exists()) return { value: snap.data().value };
      // Firestore doc doesn't exist — fall back to localStorage
      const local = localStorage.getItem(key);
      return local ? { value: local } : null;
    } catch (e) {
      const local = localStorage.getItem(key);
      return local ? { value: local } : null;
    }
  },
  set: async (key, value) => {
    try {
      await setDoc(doc(db, "appData", key), { value });
      localStorage.setItem(key, value);
    } catch (e) {
      localStorage.setItem(key, value);
    }
  },
  remove: async (key) => {
    try { await deleteDoc(doc(db, "appData", key)); } catch (e) {}
    localStorage.removeItem(key);
  },
};
