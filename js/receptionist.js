import { auth, db } from './firebase-config.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    doc, 
    updateDoc,
    getDoc,
    orderBy 
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import Logger from './logger.js';

console.log('Receptionist.js loading...', { db, auth });

auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? 'logged in' : 'logged out');
    
    if (!user || localStorage.getItem('userType') !== 'receptionist') {
        console.log('Redirecting to receptionist login');
        window.location.href = 'receptionist-login.html';
        return;
    }
    
    Logger.info('Receptionist dashboard loaded', { userId: user.uid });
    
    try {
        const receptionistDoc = await getDoc(doc(db, 'receptionists', user.uid));
        if (receptionistDoc.exists()) {
            document.getElementById('receptionistName').textContent = receptionistDoc.data().name;
        }
    } catch (error) {
        console.error('Error loading receptionist info:', error);
    }
    
    loadPatients();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.clear();
        Logger.info('Receptionist logged out');
        window.location.href = 'index.html';
    } catch (error) {
        Logger.error('Logout failed', { error: error.message });
        alert('Logout failed: ' + error.message);
    }
});

document.getElementById('addPatientBtn').addEventListener('click', () => {
    console.log('Add patient button clicked');
    document.getElementById('addPatientModal').classList.add('show');
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        console.log('Closing modal');
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    });
});

document.getElementById('addPatientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Add patient form submitted');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const patientsRef = collection(db, 'patients');
        console.log('Creating query...');
        
        const q = query(
            patientsRef,
            where('date', '==', today)
        );
        
        console.log('Getting documents...');
        const querySnapshot = await getDocs(q);
        const tokenNumber = querySnapshot.size + 1;
        
        console.log('Token number:', tokenNumber);
        
        const patientData = {
            name: document.getElementById('patientName').value,
            age: parseInt(document.getElementById('patientAge').value),
            gender: document.getElementById('patientGender').value,
            phone: document.getElementById('patientPhone').value,
            address: document.getElementById('patientAddress').value,
            symptoms: document.getElementById('symptoms').value,
            tokenNumber,
            date: today,
            status: 'pending',
            createdAt: new Date().toISOString(),
            createdBy: auth.currentUser.uid
        };
        
        console.log('Patient data:', patientData);
        console.log('Adding document to collection...', patientsRef);
        
        const docRef = await addDoc(patientsRef, patientData);
        
        Logger.info('Patient added', { tokenNumber, docId: docRef.id });
        console.log('Patient added successfully!', docRef.id);
        
        alert(`✅ Patient registered successfully!\n\nToken Number: ${tokenNumber}`);
        
        document.getElementById('addPatientModal').classList.remove('show');
        document.getElementById('addPatientForm').reset();
        
        loadPatients();
        
    } catch (error) {
        console.error('Error adding patient:', error);
        Logger.error('Error adding patient', { error: error.message, stack: error.stack });
        alert('❌ Error adding patient: ' + error.message);
    }
});

async function loadPatients() {
    try {
        console.log('Loading patients...');
        const today = new Date().toISOString().split('T')[0];
        
        const patientsRef = collection(db, 'patients');
        const q = query(
            patientsRef,
            where('date', '==', today),
            orderBy('tokenNumber', 'asc')
        );
        
        console.log('Executing query...');
        const querySnapshot = await getDocs(q);
        
        console.log('Got patients:', querySnapshot.size);
        
        const patientList = document.getElementById('patientList');
        patientList.innerHTML = '';
        
        let totalPatients = 0;
        let todayTokens = 0;
        let pendingBills = 0;
        
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            totalPatients++;
            todayTokens++;
            
            if (patient.status === 'completed' && !patient.paid) {
                pendingBills++;
            }
            
            const patientCard = createPatientCard(doc.id, patient);
            patientList.appendChild(patientCard);
        });
        
        document.getElementById('totalPatients').textContent = totalPatients;
        document.getElementById('todayTokens').textContent = todayTokens;
        document.getElementById('pendingBills').textContent = pendingBills;
        
        Logger.info('Patients loaded', { count: totalPatients });
        
    } catch (error) {
        console.error('Error loading patients:', error);
        Logger.error('Error loading patients', { error: error.message });
        alert('Error loading patients: ' + error.message);
    }
}

function createPatientCard(patientId, patient) {
    const card = document.createElement('div');
    card.className = 'patient-card';
    
    const statusClass = patient.status === 'completed' ? 'status-completed' : 'status-pending';
    const statusText = patient.status === 'completed' ? 'Completed' : 'Pending';
    
    card.innerHTML = `
        <div class="patient-token">${patient.tokenNumber}</div>
        <div class="patient-details">
            <h3>${patient.name}</h3>
            <p><strong>Age:</strong> ${patient.age} | <strong>Gender:</strong> ${patient.gender}</p>
            <p><strong>Phone:</strong> ${patient.phone}</p>
            <p><strong>Symptoms:</strong> ${patient.symptoms}</p>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="patient-actions">
            ${patient.status === 'completed' ? 
                `<button class="btn btn-primary btn-small" onclick="generateBill('${patientId}')">Generate Bill</button>` :
                `<span style="color: #718096;">Waiting for Doctor</span>`
            }
        </div>
    `;
    
    return card;
}

window.generateBill = async function(patientId) {
    try {
        console.log('Generating bill for patient:', patientId);
        
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        const patient = patientDoc.data();
        
        const billModal = document.getElementById('billModal');
        const billDetails = document.getElementById('billDetails');
        
        const registrationFee = 50;
        const medicineEstimate = 200;
        const consultationFee = patient.consultationFee || 500;
        const total = registrationFee + medicineEstimate + consultationFee;
        
        billDetails.innerHTML = `
            <div class="bill-header">
                <h2>🏥 Apollo Clinic Bill</h2>
                <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="margin: 20px 0;">
                <p><strong>Patient Name:</strong> ${patient.name}</p>
                <p><strong>Token Number:</strong> ${patient.tokenNumber}</p>
                <p><strong>Phone:</strong> ${patient.phone}</p>
            </div>
            
            <div class="bill-item">
                <span>Registration Fee</span>
                <span>₹${registrationFee}</span>
            </div>
            
            <div class="bill-item">
                <span>Consultation Fee</span>
                <span>₹${consultationFee}</span>
            </div>
            
            <div class="bill-item">
                <span>Medicine (Estimate)</span>
                <span>₹${medicineEstimate}</span>
            </div>
            
            <div class="bill-total">
                <span>Total Amount</span>
                <span>₹${total}</span>
            </div>
        `;
        
        billModal.classList.add('show');
        
        document.getElementById('printBill').onclick = () => {
            console.log('Printing bill');
            window.print();
        };
        
        document.getElementById('markPaid').onclick = async () => {
            try {
                console.log('Marking bill as paid');
                await updateDoc(doc(db, 'patients', patientId), {
                    paid: true,
                    totalBill: total,
                    paidAt: new Date().toISOString()
                });
                
                Logger.info('Bill marked as paid', { patientId });
                console.log('Bill marked as paid');
                
                alert('✅ Bill marked as paid!');
                billModal.classList.remove('show');
                loadPatients();
                
            } catch (error) {
                console.error('Error marking bill as paid:', error);
                Logger.error('Error marking bill as paid', { patientId, error: error.message });
                alert('❌ Error: ' + error.message);
            }
        };
        
    } catch (error) {
        console.error('Error generating bill:', error);
        Logger.error('Error generating bill', { error: error.message });
        alert('Error generating bill: ' + error.message);
    }
};

console.log('Receptionist.js loaded successfully');
