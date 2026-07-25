// Import required Firebase v10 SDK modules directly from CDN
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

// =========================================================================
// 1. YOUR FIREBASE CONFIGURATION
// Replace the placeholder values below with your credentials from:
// Firebase Console -> Project Settings -> General -> Your Apps -> SDK setup
// =========================================================================
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// =========================================================================
// 2. INITIALIZE FIREBASE SERVICES
// =========================================================================
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Authentication
export const auth = getAuth(app);

// Collection Reference for Menu Items
export const menuCollectionRef = collection(db, "menu_items");

// =========================================================================
// 3. AUTHENTICATION HELPERS (FOR ADMIN LOGIN/LOGOUT)
// =========================================================================

/**
 * Log in admin using email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<UserCredential>}
 */
export const loginAdmin = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Log out the currently signed-in admin
 * @returns {Promise<void>}
 */
export const logoutAdmin = () => {
  return signOut(auth);
};

/**
 * Monitor admin authentication state (logged in or logged out)
 * @param {Function} callback - Function receiving (user) parameter
 */
export const onAdminAuthStateChange = (callback) => {
  onAuthStateChanged(auth, callback);
};

// Export Firestore operations for app.js usage
export { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
};
