import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { 
    doc, 
    setDoc 
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import Logger from './logger.js';

// Determine if we're on doctor or receptionist page
const isDoctor = window.location.pathname.includes('doctor');
const userType = isDoctor ? 'doctor' : 'receptionist';

console.log('Auth page loaded:', { isDoctor, userType, pathname: window.location.pathname });

// Get form elements
const loginForm = document.getElementById(`${userType}LoginForm`);
const signupForm = document.getElementById(`${userType}SignupForm`);
const toggleSignup = document.getElementById('toggleSignup');
const toggleLogin = document.getElementById('toggleLogin');
const messageDiv = document.getElementById('message');

console.log('Form elements:', { loginForm, signupForm, toggleSignup, toggleLogin, messageDiv });

// Toggle between login and signup
if (toggleSignup) {
    toggleSignup.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Toggling to signup form');
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        messageDiv.style.display = 'none';
    });
}

if (toggleLogin) {
    toggleLogin.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Toggling to login form');
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        messageDiv.style.display = 'none';
    });
}

// Show message
function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

// Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        console.log('Login attempt:', email);
        
        try {
            Logger.info(`Login attempt for ${userType}`, { email });
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Store user type in localStorage
            localStorage.setItem('userType', userType);
            localStorage.setItem('userId', userCredential.user.uid);
            localStorage.setItem('userName', userCredential.user.email);
            
            Logger.info(`Login successful for ${userType}`, { userId: userCredential.user.uid });
            
            showMessage('Login successful! Redirecting...', 'success');
            console.log('Login successful, redirecting to dashboard');
            
            setTimeout(() => {
                window.location.href = `${userType}-dashboard.html`;
            }, 1000);
            
        } catch (error) {
            Logger.error(`Login failed for ${userType}`, { email, error: error.message });
            console.error('Login error:', error);
            showMessage('❌ ' + error.message, 'error');
        }
    });
}

// Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        console.log('Signup attempt:', { name, email, userType });
        
        let additionalData = {};
        if (isDoctor) {
            additionalData.specialization = document.getElementById('specialization').value;
        }
        
        try {
            // Validate inputs
            if (!name || !email || !password) {
                throw new Error('Please fill all fields');
            }
            
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            Logger.info(`Signup attempt for ${userType}`, { email });
            console.log('Creating user account...');
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            console.log('User created, saving to Firestore...');
            
            // Store user data in Firestore
            await setDoc(doc(db, userType + 's', userCredential.user.uid), {
                uid: userCredential.user.uid,
                name,
                email,
                userType,
                ...additionalData,
                createdAt: new Date().toISOString()
            });
            
            Logger.info(`Signup successful for ${userType}`, { userId: userCredential.user.uid });
            console.log('User data saved to Firestore');
            
            showMessage('✅ Account created successfully! Switching to login...', 'success');
            
            setTimeout(() => {
                signupForm.reset();
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
                messageDiv.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            Logger.error(`Signup failed for ${userType}`, { email, error: error.message });
            console.error('Signup error:', error);
            showMessage('❌ ' + error.message, 'error');
        }
    });
}

console.log('Auth.js loaded successfully');
