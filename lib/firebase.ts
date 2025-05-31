import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

// Check if Firebase API key is valid
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
if (!apiKey || !apiKey.startsWith("AIza")) {
  console.error("Invalid Firebase API key. It should start with 'AIza'.")
}

// Firebase config from your project
const firebaseConfig = {
  apiKey: "AIzaSyBiRjzRFbFRbH31zYz_WdDL8IeB0OSTST8",
  authDomain: "pd-pastry-delights-e0f76.firebaseapp.com",
  projectId: "pd-pastry-delights-e0f76",
  storageBucket: "pd-pastry-delights-e0f76.appspot.com",
  messagingSenderId: "164901690165",
  appId: "1:164901690165:web:f4d9fd5c4880634c69ca7c",
  measurementId: "G-B6ZDZXDS32",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Firebase Auth
export const auth = getAuth(app)

export default app
