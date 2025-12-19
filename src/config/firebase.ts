import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2-efaF0hfp9e6CbHQgjBMAwwZWIVsCMc",
    authDomain: "whatsapp-hackthon.firebaseapp.com",
    projectId: "whatsapp-hackthon",
    storageBucket: "whatsapp-hackthon.firebasestorage.app",
    messagingSenderId: "1002407301458",
    appId: "1:1002407301458:web:70f02d71c3c2e12d722a8b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
