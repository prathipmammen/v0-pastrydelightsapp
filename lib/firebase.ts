import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBiRjzRFbFRbH31zYz_WdDL8IeB0OSTST8",
  authDomain: "pd-pastry-delights-e0f76.firebaseapp.com",
  projectId: "pd-pastry-delights-e0f76",
  storageBucket: "pd-pastry-delights-e0f76.firebasestorage.app",
  messagingSenderId: "164901690165",
  appId: "1:164901690165:web:f4d9fd5c4880634c69ca7c",
  measurementId: "G-B6ZDDXZS32",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
