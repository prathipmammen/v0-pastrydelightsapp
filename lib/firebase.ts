import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

// Firebase config from your project
const firebaseConfig = {
  apiKey: "AIzaSyBiJzRfBfRBbH31vz_WdLbIEbBOOST8T",
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

export default app
