import { auth, db } from './firebase-config.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    getDoc
} from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';
import Logger from './logger.js';

console.log('Doctor.js loading...', { db, auth });

// Check authentication
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? 'logged in' : 'logged out');
    
    if (!user || localStorage.getItem('userType') !== 'doctor') {
        console.log('Redirecting to doctor login');
        window.location.href = 'doctor-login.html';
        return;
    }
    
    Logger.info('Doctor dashboard loaded', { userId: user.uid });
    
    // Load doctor info
    try {
        const doctorDoc = await getDoc(doc(db, 'doctors', user.uid));
        if (doctorDoc.exists()) {
            document.getElementById('doctorName').textContent = doctorDoc.data().name;
        }
    } catch (error) {
        console.error('Error loading doctor info:', error);
    }
    
    loadPatients();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        localStorage.clear();
        Logger.info('Doctor logged out');
        window.location.href = 'index.html';
    } catch (error) {
        Logger.error('Logout failed', { error: error.message });
        alert('Logout failed: ' + error.message);
    }
});

// Load patients - FIXED VERSION
async function loadPatients() {
    try {
        console.log('Loading patients for doctor...');
        const today = new Date().toISOString().split('T')[0];
        
        const patientsRef = collection(db, 'patients');
        const q = query(
            patientsRef,
            where('date', '==', today)
            // Removed orderBy - we'll sort in JavaScript
        );
        
        console.log('Executing query...');
        const querySnapshot = await getDocs(q);
        
        console.log('Got patients:', querySnapshot.size);
        
        const patientList = document.getElementById('patientList');
        patientList.innerHTML = '';
        
        let patientsToday = 0;
        let pendingCount = 0;
        let completedCount = 0;
        
        // Collect all patients
        const patients = [];
        querySnapshot.forEach((doc) => {
            const patient = doc.data();
            patients.push({ id: doc.id, ...patient });
            patientsToday++;
            
            if (patient.status === 'pending') {
                pendingCount++;
            } else if (patient.status === 'completed') {
                completedCount++;
            }
        });
        
        // Sort by token number in JavaScript
        patients.sort((a, b) => a.tokenNumber - b.tokenNumber);
        
        console.log('Sorted patients:', patients);
        
        // Add cards to DOM
        patients.forEach(patient => {
            const patientCard = createPatientCard(patient.id, patient);
            patientList.appendChild(patientCard);
        });
        
        // Update stats
        document.getElementById('patientsToday').textContent = patientsToday;
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('completedCount').textContent = completedCount;
        
        Logger.info('Patients loaded', { count: patientsToday });
        console.log('Patients loaded successfully for doctor');
        
    } catch (error) {
        console.error('Error loading patients:', error);
        Logger.error('Error loading patients', { error: error.message });
        alert('Error loading patients: ' + error.message);
    }
}

// Create patient card
function createPatientCard(patientId, patient) {
    const card = document.createElement('div');
    card.className = 'patient-card';
    
    const statusClass = patient.status === 'completed' ? 'status-completed' : 'status-pending';
    const statusText = patient.status === 'completed' ? 'Completed' : 'Pending';
    
    console.log('Creating card for patient:', patient.name, 'Token:', patient.tokenNumber);
    
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
            ${patient.status === 'pending' ? 
                `<button class="btn btn-primary btn-small" onclick="openPrescriptionModal('${patientId}')">Add Prescription</button>` :
                `<button class="btn btn-secondary btn-small" onclick="viewPrescription('${patientId}')">View Prescription</button>`
            }
        </div>
    `;
    
    return card;
}

// Open prescription modal
window.openPrescriptionModal = async function(patientId) {
    console.log('Opening prescription modal for patient:', patientId);
    
    try {
        const modal = document.getElementById('prescriptionModal');
        modal.classList.add('show');
        
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        const patient = patientDoc.data();
        
        console.log('Patient data:', patient);
        
        document.getElementById('patientInfo').innerHTML = `
            <h3>${patient.name}</h3>
            <p><strong>Token:</strong> ${patient.tokenNumber}</p>
            <p><strong>Age:</strong> ${patient.age} | <strong>Gender:</strong> ${patient.gender}</p>
            <p><strong>Symptoms:</strong> ${patient.symptoms}</p>
        `;
        
        const form = document.getElementById('prescriptionForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await savePrescription(patientId);
        };
        
    } catch (error) {
        console.error('Error opening prescription modal:', error);
        alert('Error: ' + error.message);
    }
};

// Save prescription
async function savePrescription(patientId) {
    try {
        console.log('Saving prescription for patient:', patientId);
        
        const diagnosis = document.getElementById('diagnosis').value;
        const prescription = document.getElementById('prescription').value;
        const notes = document.getElementById('notes').value;
        const consultationFee = document.getElementById('consultationFee').value;
        
        await updateDoc(doc(db, 'patients', patientId), {
            diagnosis,
            prescription,
            notes,
            consultationFee: parseFloat(consultationFee),
            status: 'completed',
            completedAt: new Date().toISOString()
        });
        
        Logger.info('Prescription saved', { patientId });
        console.log('Prescription saved successfully');
        
        alert('✅ Prescription saved successfully!');
        
        document.getElementById('prescriptionModal').classList.remove('show');
        document.getElementById('prescriptionForm').reset();
        
        loadPatients();
        
    } catch (error) {
        console.error('Error saving prescription:', error);
        Logger.error('Error saving prescription', { patientId, error: error.message });
        alert('❌ Error saving prescription: ' + error.message);
    }
}

// View prescription
window.viewPrescription = async function(patientId) {
    try {
        console.log('Viewing prescription for patient:', patientId);
        
        const patientDoc = await getDoc(doc(db, 'patients', patientId));
        const patient = patientDoc.data();
        
        alert(`
PATIENT: ${patient.name}
TOKEN: ${patient.tokenNumber}

DIAGNOSIS:
${patient.diagnosis || 'N/A'}

PRESCRIPTION:
${patient.prescription || 'N/A'}

NOTES:
${patient.notes || 'N/A'}

CONSULTATION FEE: ₹${patient.consultationFee || 'N/A'}
        `);
        
    } catch (error) {
        console.error('Error viewing prescription:', error);
        alert('Error: ' + error.message);
    }
};

// Close modal
document.querySelector('.close')?.addEventListener('click', () => {
    document.getElementById('prescriptionModal').classList.remove('show');
});

console.log('Doctor.js loaded successfully');
