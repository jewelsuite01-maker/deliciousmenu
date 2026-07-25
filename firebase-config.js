import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Replace with your Firebase console config values
const firebaseConfig = {
  apiKey: "AIzaSyDFpC-J6hXXZ6wZldG80O9xPg5uLIp_sLw",
  authDomain: "deliciousmenu-f41b4.firebaseapp.com",
  projectId: "deliciousmenu-f41b4",
  storageBucket: "deliciousmenu-f41b4.firebasestorage.app",
  messagingSenderId: "245351450123",
  appId: "1:245351450123:web:6ed6e426ac64bf07db290e"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const menuCollectionRef = collection(db, "menu_items");

export const loginAdmin = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutAdmin = () => signOut(auth);
export const onAdminAuthStateChange = (callback) => onAuthStateChanged(auth, callback);

export { doc, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch };
