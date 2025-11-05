import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js';

const firebaseConfig = {
    apiKey: "AIzaSyB7h6fUtoUMU2Gh--q4Jv0ydBZDnpcQTeM",
    authDomain: "clinic-management-system-d249e.firebaseapp.com",
    projectId: "clinic-management-system-d249e",
    storageBucket: "clinic-management-system-d249e.firebasestorage.app",
    messagingSenderId: "729565271769",
    appId: "1:729565271769:web:0b6258e295350f3ff4d0c8",
    measurementId: "G-TC50KTD533"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

console.log('Firebase initialized:', { app, auth, db });

export { auth, db, analytics, app };
