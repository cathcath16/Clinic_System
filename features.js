// ===== PHASE 1: CORE FEATURES =====

// Dark Mode Management
function initDarkMode() {
    const darkModeBtn = document.getElementById('toggleDarkMode');
    const savedMode = localStorage.getItem('darkMode') === 'true';
    
    if (savedMode) {
        document.body.classList.add('dark-mode');
    }
    
    darkModeBtn.addEventListener('click', toggleDarkMode);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            toggleDarkMode();
        }
    });
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

// Quick Access Sidebar
function initQuickAccess() {
    const toggleNavBtn = document.getElementById('toggleNav');
    const sidebar = document.getElementById('quickAccessSidebar');
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    
    toggleNavBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleNavBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Quick action buttons
    document.getElementById('quickAddBtn').onclick = () => {
        document.getElementById('addNewBtn').click();
        sidebar.classList.remove('open');
    };

    document.getElementById('quickConsultBtn').onclick = () => {
        document.getElementById('openConsultBtn').click();
        sidebar.classList.remove('open');
    };

    document.getElementById('quickAppointmentBtn').onclick = () => {
        document.getElementById('openAppointmentBtn').click();
        sidebar.classList.remove('open');
    };

    document.getElementById('quickPrescriptionBtn').onclick = () => {
        document.getElementById('openRxBtn').click();
        sidebar.classList.remove('open');
    };

    document.getElementById('quickMedicationBtn').onclick = () => {
        document.getElementById('openMedBtn').click();
        sidebar.classList.remove('open');
    };

    document.getElementById('quickReportBtn').onclick = () => {
        showHealthReport();
        sidebar.classList.remove('open');
    };
}

// Calculate Health Statistics
function updateHealthStatistics() {
    if (!employees || employees.length === 0) return;

    const stats = {
        alerts: 0,
        appointments: appointments ? appointments.length : 0,
        medications: 0,
        healthy: 0
    };

    employees.forEach(emp => {
        // Count health alerts (hypertension, diabetes, etc.)
        const conditions = ['Hypertension', 'Diabetes Mellitus', 'Asthma'];
        if (conditions.some(c => emp.condition && emp.condition.includes(c))) {
            stats.alerts++;
        }

        // Count overdue checkups (older than 6 months or no consultation)
        const consults = Array.isArray(emp.consultations) ? emp.consultations : [];
        if (consults.length === 0) {
            stats.appointments++;
        } else {
            const lastConsult = consults.slice().sort((a, b) => new Date(b.date + ' ' + (b.time || '')).getTime() - new Date(a.date + ' ' + (a.time || '')).getTime())[0];
            if (lastConsult && lastConsult.date) {
                const monthsAgo = Math.floor((new Date() - new Date(lastConsult.date)) / (1000 * 60 * 60 * 24 * 30));
                if (monthsAgo > 6) {
                    stats.appointments++;
                }
            }
        }

        // Count employees with medications from consultations or medication tracker
        const hasConsultMedications = consults.some(c => Array.isArray(c.prescriptions) && c.prescriptions.length > 0);
        const hasTrackedMedications = Array.isArray(emp.currentMedications) && emp.currentMedications.length > 0;
        if (hasConsultMedications || hasTrackedMedications) {
            stats.medications++;
        }

        // Count healthy employees
        if (!emp.condition || emp.condition === 'None') {
            stats.healthy++;
        }
    });

    // Update UI
    document.getElementById('alertCount').textContent = stats.alerts;
    document.getElementById('appointmentCount').textContent = stats.appointments;
    document.getElementById('medicationCount').textContent = stats.medications;
    document.getElementById('healthyCount').textContent = stats.healthy;

    // Update recent employees list
    updateRecentEmployeesList();
}

// Update Recent Employees List
function updateRecentEmployeesList() {
    const recentList = document.getElementById('recentEmployeesList');
    const recent = employees.slice(0, 5);
    
    recentList.innerHTML = recent.map(emp => `
        <div class="recent-item" onclick="viewEmployee('${emp.id}')">
            <strong>${emp.name}</strong><br>
            <small>${emp.id}</small>
        </div>
    `).join('');
}

// Role-Based Access Control
function initRoleBasedAccess() {
    const roleSelect = document.getElementById('roleSelect');
    const savedRole = localStorage.getItem('userRole') || 'admin';
    
    roleSelect.value = savedRole;
    applyRoleBasedAccess(savedRole);
    
    roleSelect.addEventListener('change', (e) => {
        localStorage.setItem('userRole', e.target.value);
        applyRoleBasedAccess(e.target.value);
    });
}

function applyRoleBasedAccess(role) {
    const adminElements = document.querySelectorAll('[data-role="admin"]');
    const doctorElements = document.querySelectorAll('[data-role="doctor"]');
    const nurseElements = document.querySelectorAll('[data-role="nurse"]');
    
    adminElements.forEach(el => el.style.display = role === 'admin' ? 'block' : 'none');
    doctorElements.forEach(el => el.style.display = (role === 'admin' || role === 'doctor') ? 'block' : 'none');
    nurseElements.forEach(el => el.style.display = role !== '' ? 'block' : 'none');
}

// Keyboard Shortcuts
function initKeyboardShortcuts() {
    const shortcuts = [
        { key: 'N', description: 'New Profile', action: () => document.getElementById('addNewBtn').click() },
        { key: 'C', description: 'Consultation Form', action: () => document.getElementById('openConsultBtn').click() },
        { key: 'A', description: 'Appointment', action: () => document.getElementById('openAppointmentBtn').click() },
        { key: 'M', description: 'Medication', action: () => document.getElementById('openMedBtn').click() },
        { key: 'P', description: 'Prescription', action: () => document.getElementById('openRxBtn').click() },
        { key: 'E', description: 'Export', action: () => document.getElementById('exportBtn').click() },
        { key: 'S', description: 'Save', action: saveCurrentForm },
        { key: '?', description: 'Show Shortcuts', action: showKeyboardShortcuts }
    ];

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toUpperCase();
            const shortcut = shortcuts.find(s => s.key === key);
            if (shortcut) {
                e.preventDefault();
                shortcut.action();
            }
        } else if (e.key === '?') {
            e.preventDefault();
            showKeyboardShortcuts();
        }
    });
}

function saveCurrentForm() {
    const activeForm = Array.from(document.querySelectorAll('form')).find(form => {
        const modal = form.closest('.modal');
        return modal && window.getComputedStyle(modal).display !== 'none';
    });
    if (activeForm) {
        if (typeof activeForm.requestSubmit === 'function') {
            activeForm.requestSubmit();
        } else {
            activeForm.dispatchEvent(new Event('submit', { bubbles: true }));
        }
    }
}

function showKeyboardShortcuts() {
    const modal = document.getElementById('keyboardShortcutsModal') || createKeyboardShortcutsModal();
    modal.classList.add('open');
    document.addEventListener('click', (e) => {
        if (!modal.contains(e.target)) {
            modal.classList.remove('open');
        }
    });
}

function createKeyboardShortcutsModal() {
    const modal = document.createElement('div');
    modal.id = 'keyboardShortcutsModal';
    modal.className = 'keyboard-shortcuts-modal';
    modal.innerHTML = `
        <h2><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h2>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+N</span> New Profile</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+C</span> Consultation</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+A</span> Appointment</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+M</span> Medication</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+P</span> Prescription</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+E</span> Export</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+S</span> Save</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">Ctrl+D</span> Dark Mode</span>
        </div>
        <div class="keyboard-shortcut-item">
            <span><span class="keyboard-key">?</span> Show This</span>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

// Health Indicators - BMI & Status Badges
function getHealthStatus(emp) {
    if (!emp.age || !emp.height || !emp.weight) return 'unknown';
    
    const heightM = emp.height / 100;
    const bmi = emp.weight / (heightM * heightM);
    
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
}

function getHealthBadge(emp) {
    const status = getHealthStatus(emp);
    const statusClass = `bmi-${status}`;
    
    if (!emp.height || !emp.weight) {
        return `<span class="health-badge" style="background: #e5e7eb; color: #6b7280;">No Data</span>`;
    }
    
    const heightM = emp.height / 100;
    const bmi = (emp.weight / (heightM * heightM)).toFixed(1);
    
    return `<span class="health-badge ${statusClass}">BMI: ${bmi}</span>`;
}

function getHealthIndicator(emp) {
    let status = 'healthy';
    if (emp.condition && emp.condition !== 'None' && emp.condition !== '') {
        status = 'warning';
    }
    if (emp.age && emp.age > 60) {
        status = 'alert';
    }
    
    return `<span class="health-indicator ${status}" title="${emp.condition || 'Healthy'}"></span>`;
}

// Allergy Banner Display
function displayAllergyBanner(emp) {
    if (!emp.allergies || emp.allergies.length === 0) return '';
    return `<div class="allergy-banner"><i class="fas fa-exclamation-triangle"></i> Allergies: ${emp.allergies.join(', ')}</div>`;
}

// Audit Logging
const AuditLog = {
    async log(action, details) {
        try {
            const db = await dbPromise;
            const tx = db.transaction('auditLog', 'readwrite');
            const store = tx.objectStore('auditLog');
            
            const entry = {
                timestamp: new Date().toISOString(),
                action,
                details,
                user: localStorage.getItem('userRole') || 'unknown'
            };
            
            await store.add(entry);
            await tx.done;
        } catch (err) {
            console.warn('Audit log failed', err);
        }
    },

    async getLog(limit = 100) {
        try {
            const db = await dbPromise;
            const tx = db.transaction('auditLog', 'readonly');
            const store = tx.objectStore('auditLog');
            const all = await store.getAll();
            return all.slice(-limit).reverse();
        } catch (err) {
            return [];
        }
    }
};

// Health Report Generation
function showHealthReport() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Health Report</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="form-container" style="padding: 20px;">
                <h4>Health Summary</h4>
                <p>Total Employees: ${employees.length}</p>
                <p>With Health Conditions: ${employees.filter(e => e.condition && e.condition !== 'None').length}</p>
                <p>Overdue Checkups: ${employees.filter(e => !e.consultations || e.consultations.length === 0).length}</p>
                
                <h4 style="margin-top: 20px;">Top Conditions</h4>
                ${generateConditionStats()}
                
                <h4 style="margin-top: 20px;">Actions</h4>
                <button class="save-btn" onclick="printHealthReport()">Print Report</button>
                <button class="cancel-btn" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function generateConditionStats() {
    const conditions = {};
    employees.forEach(emp => {
        const cond = emp.condition || 'None';
        conditions[cond] = (conditions[cond] || 0) + 1;
    });
    
    return Object.entries(conditions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cond, count]) => `<p>${cond}: ${count}</p>`)
        .join('');
}

function printHealthReport() {
    window.print();
}

// ===== PHASE 2: APPOINTMENT & MEDICATION SUPPORT =====

// Initialize Appointments Storage
async function initAppointments() {
    try {
        const db = await dbPromise;
        if (!db.objectStoreNames.contains('appointments')) {
            // This should be handled in upgrade, but add fallback
        }
    } catch (err) {
        console.warn('Appointments initialization failed', err);
    }
}

// Initialize Medications Storage
async function initMedications() {
    try {
        const db = await dbPromise;
        if (!db.objectStoreNames.contains('medications')) {
            // This should be handled in upgrade
        }
    } catch (err) {
        console.warn('Medications initialization failed', err);
    }
}

// ===== PHASE 3: HEALTH TIMELINE =====

function showHealthTimeline(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp || !emp.consultations || emp.consultations.length === 0) {
        alert('No consultation history available');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 760px;">
            <div class="modal-header">
                <h3>Health Timeline - ${emp.name}</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="form-container" style="padding: 20px;">
                <div class="timeline-list" id="healthTimelineList"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => {
        drawHealthTimeline(emp);
    }, 50);
}

function drawHealthTimeline(emp) {
    const list = document.getElementById('healthTimelineList');
    if (!list) return;
    const sortedConsults = emp.consultations.slice().sort((a, b) => new Date(b.date + ' ' + (b.time || '')).getTime() - new Date(a.date + ' ' + (a.time || '')).getTime());
    list.innerHTML = sortedConsults.map(c => `
        <div class="timeline-entry">
            <div class="timeline-entry-header">
                <strong>${c.date || 'No date'} ${c.time || ''}</strong>
                <span>${c.consultCategory || c.consultOffice || 'Consultation'}</span>
            </div>
            <div class="timeline-entry-body">
                <div><strong>Complaint:</strong> ${c.chiefComplaint || 'None'}</div>
                <div><strong>Plan:</strong> ${c.plan || 'None'}</div>
                <div><strong>Vitals:</strong> BP ${c.bp || '-'} | HR ${c.hr || '-'} | RR ${c.rr || '-'} | Temp ${c.temp || '-'}</div>
            </div>
        </div>`).join('');
}

// ===== INITIALIZE ALL FEATURES =====

function initializeAllFeatures() {
    // Phase 1
    initDarkMode();
    initQuickAccess();
    initRoleBasedAccess();
    initKeyboardShortcuts();
    updateHealthStatistics();
    
    // Phase 2 & 3
    initAppointments();
    initMedications();
    
    // Update health stats when data changes
    window.addEventListener('dataUpdated', updateHealthStatistics);
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllFeatures);
} else {
    initializeAllFeatures();
}
