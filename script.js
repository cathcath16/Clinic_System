const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const officeFilter = document.getElementById("officeFilter");
const addModal = document.getElementById("addModal");
const addNewBtn = document.getElementById("addNewBtn") || document.getElementById("quickAddBtn");
const addForm = document.getElementById("addForm");
const ADD_FORM_DRAFT_KEY = 'clinic_system_addFormDraft';

function saveFormDraft(storageKey, form) {
    if (!form || !window.localStorage) return;
    try {
        const draft = { meta: { currentStep, editId: isEditMode ? editId : null }, fields: {} };
        form.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
            if (el.type === 'checkbox') {
                draft.fields[el.id] = el.checked;
            } else {
                draft.fields[el.id] = el.value;
            }
        });
        localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (err) {
        console.warn('Failed to save form draft', err);
    }
}

function loadFormDraft(storageKey, form, matchMeta = null) {
    if (!form || !window.localStorage) return null;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    try {
        const draft = JSON.parse(raw);
        if (matchMeta && !matchMeta(draft.meta)) return null;
        const fields = draft.fields || {};
        Object.entries(fields).forEach(([id, value]) => {
            const el = form.querySelector('#' + id);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.checked = !!value;
            } else {
                el.value = value != null ? value : '';
            }
        });
        if (draft.meta && typeof draft.meta.currentStep === 'number') {
            currentStep = draft.meta.currentStep;
            showStep(currentStep);
        }
        return draft;
    } catch (err) {
        console.warn('Failed to load form draft', err);
        return null;
    }
}

function clearFormDraft(storageKey) {
    if (!window.localStorage) return;
    localStorage.removeItem(storageKey);
}

let selectedCategoryFilter = 'All';

// IndexedDB setup
const dbPromise = idb.openDB('clinicDB', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('employees')) {
      db.createObjectStore('employees', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('consultations')) {
      db.createObjectStore('consultations', { keyPath: 'key' });
    }
    if (!db.objectStoreNames.contains('appointments')) {
      const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
      appointmentStore.createIndex('employeeId', 'employeeId');
      appointmentStore.createIndex('date', 'date');
    }
    if (!db.objectStoreNames.contains('medications')) {
      const medicationStore = db.createObjectStore('medications', { keyPath: 'id', autoIncrement: true });
      medicationStore.createIndex('employeeId', 'employeeId');
    }
    if (!db.objectStoreNames.contains('auditLog')) {
      const auditStore = db.createObjectStore('auditLog', { keyPath: 'id', autoIncrement: true });
      auditStore.createIndex('timestamp', 'timestamp');
      auditStore.createIndex('action', 'action');
    }
  }
});

function generateSampleEmployees(count = 200) {
    // Sample employee generation is disabled. Use final employee list instead.
    return [];
}

function isValidEmployee(emp) {
    if (!emp || typeof emp !== 'object') return false;
    const id = String(emp.id || '').trim();
    const name = String(emp.name || '').trim();
    const age = Number(emp.age);
    return id !== '' && id !== '0' && name !== '' && name !== '0' && !Number.isNaN(age) && age !== 0;
}

async function loadEmployees() {
    try {
        const db = await dbPromise;
        let tx = db.transaction('employees', 'readonly');
        let store = tx.objectStore('employees');
        const all = await store.getAll();
        if (all.length) {
            return all.filter(isValidEmployee);
        }

        const localData = localStorage.getItem('employees');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                if (Array.isArray(parsed)) {
                    const filtered = parsed.filter(isValidEmployee);
                    if (filtered.length) {
                        tx = db.transaction('employees', 'readwrite');
                        store = tx.objectStore('employees');
                        await store.clear();
                        for (const emp of filtered) {
                            await store.put(emp);
                        }
                        await tx.done;
                        return filtered;
                    }
                }
            } catch (err) {
                console.warn('Failed to migrate employees from localStorage', err);
            }
        }

        return [];
    } catch (err) {
        console.warn('Failed to load employees from IndexedDB', err);
        return [];
    }
}

async function saveEmployees() {
    try {
        const db = await dbPromise;
        const tx = db.transaction('employees', 'readwrite');
        const store = tx.objectStore('employees');
        await store.clear();
        for (const emp of employees) {
            await store.put(emp);
        }
        await tx.done;
    } catch (err) {
        console.warn('Failed to save employees to IndexedDB', err);
    }
}

async function loadConsultations() {
    try {
        const db = await dbPromise;
        const tx = db.transaction('consultations', 'readonly');
        const store = tx.objectStore('consultations');
        const item = await store.get('consultations');
        if (item && Array.isArray(item.data)) {
            return item.data;
        }

        const localData = localStorage.getItem('consultations');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                if (Array.isArray(parsed)) {
                    const writeTx = db.transaction('consultations', 'readwrite');
                    const writeStore = writeTx.objectStore('consultations');
                    await writeStore.put({ key: 'consultations', data: parsed });
                    await writeTx.done;
                    return parsed;
                }
            } catch (err) {
                console.warn('Failed to migrate consultations from localStorage', err);
            }
        }

        return [];
    } catch (err) {
        console.warn('Failed to load consultations from IndexedDB', err);
        return [];
    }
}

async function saveConsultations() {
    try {
        const db = await dbPromise;
        const tx = db.transaction('consultations', 'readwrite');
        const store = tx.objectStore('consultations');
        await store.put({ key: 'consultations', data: consultations });
        await tx.done;
    } catch (err) {
        console.warn('Failed to save consultations to IndexedDB', err);
    }
}

async function loadAppointments() {
    try {
        const db = await dbPromise;
        if (!db.objectStoreNames.contains('appointments')) {
            return [];
        }
        const tx = db.transaction('appointments', 'readonly');
        const store = tx.objectStore('appointments');
        return await store.getAll();
    } catch (err) {
        console.warn('Failed to load appointments from IndexedDB', err);
        return [];
    }
}

async function saveAppointments() {
    try {
        const db = await dbPromise;
        if (!db.objectStoreNames.contains('appointments')) return;
        const tx = db.transaction('appointments', 'readwrite');
        const store = tx.objectStore('appointments');
        const existing = await store.getAll();
        for (const item of existing) {
            await store.delete(item.id);
        }
        for (const appointment of appointments) {
            await store.put(appointment);
        }
        await tx.done;
    } catch (err) {
        console.warn('Failed to save appointments to IndexedDB', err);
    }
}

async function loadMedications() {
    try {
        const db = await dbPromise;
        if (!db.objectStoreNames.contains('medications')) {
            return [];
        }
        const tx = db.transaction('medications', 'readonly');
        const store = tx.objectStore('medications');
        return await store.getAll();
    } catch (err) {
        console.warn('Failed to load medications from IndexedDB', err);
        return [];
    }
}

async function saveMedications() {
    try {
        const db = await dbPromise;
        if (!db.objectStoreNames.contains('medications')) return;
        const tx = db.transaction('medications', 'readwrite');
        const store = tx.objectStore('medications');
        const existing = await store.getAll();
        for (const item of existing) {
            await store.delete(item.id);
        }
        for (const medication of medications) {
            await store.put(medication);
        }
        await tx.done;
    } catch (err) {
        console.warn('Failed to save medications to IndexedDB', err);
    }
}

function dispatchDataUpdated() {
    window.dispatchEvent(new Event('dataUpdated'));
}

let employees = [];
let consultations = [];
let appointments = [];
let medications = [];
let filteredEmployees = [];
let currentPage = 1;
const pageSize = 10;

function getNextEmployeeId() {
    return `EMP-${String(employees.length + 1).padStart(4, '0')}`;
}

function normalizeEmployeeIds() {
    employees.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        const cmp = nameA.localeCompare(nameB);
        if (cmp !== 0) return cmp;
        const na = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
        const nb = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
        return na - nb;
    });

    const idMap = {};
    employees.forEach((emp, index) => {
        const oldId = emp.id;
        const newId = `EMP-${String(index + 1).padStart(4, '0')}`;
        if (oldId !== newId) {
            emp.id = newId;
            idMap[oldId] = newId;
        }
    });

    if (Object.keys(idMap).length) {
        consultations.forEach(c => {
            if (c.employeeId && idMap[c.employeeId]) c.employeeId = idMap[c.employeeId];
        });
        employees.forEach(emp => {
            if (Array.isArray(emp.consultations)) {
                emp.consultations.forEach(c => {
                    if (c.employeeId && idMap[c.employeeId]) c.employeeId = idMap[c.employeeId];
                });
            }
        });
    }
}

function sortEmployeesByName(list) {
    return (Array.isArray(list) ? list.slice() : []).sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

function getEmployeesByCategory(category) {
    if (category === 'All') {
        return sortEmployeesByName(employees);
    }
    return sortEmployeesByName(employees.filter(emp => emp.category === category));
}

function buildCardTooltipHtml(category) {
    const list = getEmployeesByCategory(category);
    const title = category === 'All' ? 'All employees' : `${category} employees`;
    if (!list.length) {
        return `<strong>${title}</strong><span>No employees found.</span>`;
    }
    const lines = list.slice(0, 20).map((emp, index) => {
        const officeLabel = emp.office ? ` — ${emp.office}` : '';
        return `<span>${index + 1}. ${emp.name}${officeLabel}</span>`;
    }).join('');
    const more = list.length > 20 ? `<span>and ${list.length - 20} more...</span>` : '';
    return `<strong>${title} (${list.length})</strong>${lines}${more}`;
}

function applyCategoryCardFilter(category) {
    if (searchInput) searchInput.value = '';
    if (officeFilter) officeFilter.value = 'All';
    selectedCategoryFilter = category;
    filterData();
    currentPage = 1;
    renderTable(filteredEmployees);
}

function attachCardInteractions() {
    document.querySelectorAll('.card.clickable').forEach(card => {
        const category = card.dataset.category || 'All';
        const tooltip = card.querySelector('.card-tooltip');
        card.addEventListener('click', () => applyCategoryCardFilter(category));
        card.addEventListener('mouseenter', () => {
            if (!tooltip) return;
            tooltip.innerHTML = buildCardTooltipHtml(category);
            tooltip.classList.remove('hidden');
            tooltip.classList.add('visible');
        });
        card.addEventListener('mouseleave', () => {
            if (!tooltip) return;
            tooltip.classList.remove('visible');
            tooltip.classList.add('hidden');
        });
    });
}

function setNewEmployeeId() {
    normalizeEmployeeIds();
    sv('newId', getNextEmployeeId());
}

normalizeEmployeeIds();

function gv(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    return el.value || '';
}
function sv(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') { el.checked = !!val; }
    else { el.value = val || ''; }
}

function renderTable(data) {
    if (!tableBody) return;
    const total = data.length;
    const startIndex = (currentPage - 1) * pageSize;
    const pageData = data.slice(startIndex, startIndex + pageSize);

    tableBody.innerHTML = '';
    if (!data.length) {
        tableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#aaa;padding:30px;">No records found.</td></tr>';
        document.getElementById('paginationInfo').innerText = 'No records found.';
        document.getElementById('paginationPages').innerHTML = '';
        return;
    }

    let rowsHtml = '';
    pageData.forEach(emp => {
        const classStyle = (emp.class || '').replace(' ', '');
        rowsHtml += `
            <tr>
                <td style="color:#1f3a6d;font-weight:bold;">${emp.id || ''}</td>
                <td><strong>${emp.name || ''}</strong></td>
                <td>${emp.birthday || ''}</td>
                <td>${emp.contact || ''}</td>
                <td>${emp.religion || ''}</td>
                <td><span class="gender-tag ${emp.gender || ''}">${emp.gender || ''}</span></td>
                <td>${emp.age || ''}</td>
                <td>${emp.occupation || ''}</td>
                <td>${emp.office || ''}</td>
                <td>${emp.category || ''}</td>
                <td>${emp.civilStatus || ''}</td>
                <td><span class="class-tag ${classStyle}">${(emp.class || '').replace('Class ', '')}</span></td>
                <td>${emp.condition || 'None'}</td>
                <td>
                    <button class="action-btn edit-btn"   onclick="editEmployee('${emp.id}')">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            </tr>`;
    });
    tableBody.innerHTML = rowsHtml;

    renderPagination(total);
}

function renderPagination(totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginationPages = document.getElementById('paginationPages');
    const paginationInfo = document.getElementById('paginationInfo');

    if (totalItems === 0) {
        paginationInfo.innerText = 'No records found.';
        paginationPages.innerHTML = '';
        return;
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(totalItems, currentPage * pageSize);
    paginationInfo.innerText = `Showing ${start}â€“${end} of ${totalItems}`;

    let pagesHtml = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">â† Prev</button>`;
    for (let page = 1; page <= totalPages; page += 1) {
        pagesHtml += `<button class="page-btn ${page === currentPage ? 'active' : ''}" onclick="changePage(${page})">${page}</button>`;
    }
    pagesHtml += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next â†’</button>`;
    paginationPages.innerHTML = pagesHtml;
}

function changePage(page) {
    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable(filteredEmployees);
}

function populateOfficeFilter() {
    const newOfficeSelect = document.getElementById('newOffice');
    if (officeFilter && newOfficeSelect) {
        const options = Array.from(newOfficeSelect.options)
            .filter(opt => opt.value && opt.value !== "")
            .sort((a, b) => a.text.localeCompare(b.text))
            .map(opt => `<option value="${opt.value}">${opt.text}</option>`);
        officeFilter.innerHTML = '<option value="All">All Offices</option>' + options.join('');
    }
}

function filterData() {
    const text = searchInput.value.toLowerCase();
    const filter = officeFilter.value;
    filteredEmployees = sortEmployeesByName(employees.filter(emp => {
        const matchesText = [emp.name, emp.id, emp.contact, emp.religion, emp.occupation, emp.office, emp.civilStatus, emp.category]
            .some(v => (v || '').toLowerCase().includes(text));
        const matchesOffice = filter === 'All' || emp.office === filter;
        return matchesText && matchesOffice;
    }));
    currentPage = 1;
    renderTable(filteredEmployees);
    updateStats();
}

function updateStats() {
    const regularList = filteredEmployees.filter(e => e.category === 'Regular');
    const jobOrderList = filteredEmployees.filter(e => e.category === 'Job Order');
    const contractList = filteredEmployees.filter(e => e.category === 'Contract of Service');
    document.getElementById('count-total').innerText = filteredEmployees.length;
    document.getElementById('count-regular').innerText = regularList.length;
    document.getElementById('count-joborder').innerText = jobOrderList.length;
    document.getElementById('count-contract').innerText = contractList.length;
    document.getElementById('total-count').innerText = filteredEmployees.length;
    
    // Set names display - show "(none)" if empty, otherwise show employee names
    const regularNames = regularList.length > 0 
        ? regularList.slice(0, 5).map(e => e.name).join(', ') + (regularList.length > 5 ? '...' : '')
        : '(none)';
    const jobOrderNames = jobOrderList.length > 0 
        ? jobOrderList.slice(0, 5).map(e => e.name).join(', ') + (jobOrderList.length > 5 ? '...' : '')
        : '(none)';
    const contractNames = contractList.length > 0 
        ? contractList.slice(0, 5).map(e => e.name).join(', ') + (contractList.length > 5 ? '...' : '')
        : '(none)';
    
    document.getElementById('names-regular').innerText = regularNames;
    document.getElementById('names-joborder').innerText = jobOrderNames;
    document.getElementById('names-contract').innerText = contractNames;
}

let lastDeleted = null;
let undoTimeoutId = null;
function showUndoBar() {
    document.getElementById('undoBar').style.display = 'flex';
    if (undoTimeoutId) clearTimeout(undoTimeoutId);
    undoTimeoutId = setTimeout(hideUndoBar, 7000);
}
function hideUndoBar() {
    document.getElementById('undoBar').style.display = 'none';
    lastDeleted = null;
    if (undoTimeoutId) { clearTimeout(undoTimeoutId); undoTimeoutId = null; }
}
document.getElementById('undoBtn').onclick = async () => {
    if (!lastDeleted) return;
    employees.splice(lastDeleted.index, 0, lastDeleted.record);
    normalizeEmployeeIds();
    await saveEmployees(); filterData(); updateStats(); populateConsultEmployeeOptions(); hideUndoBar();
};

async function deleteEmployee(id) {
    if (!confirm('Delete this employee record?')) return;
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) return;
    
    const emp = employees[index];
    lastDeleted = { record: emp, index };
    employees.splice(index, 1);
    normalizeEmployeeIds();
    
    // Log audit trail
    if (typeof AuditLog !== 'undefined') {
        await AuditLog.log('EMPLOYEE_DELETE', { employeeId: id, employeeName: emp.name });
    }
    
    await saveEmployees();
    await saveConsultations();
    dispatchDataUpdated();
    filterData();
    updateStats();
    populateConsultEmployeeOptions();
    showUndoBar();
}

let currentStep = 0;
const steps = document.querySelectorAll('.step');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

function showStep(n) {
    steps.forEach((step, i) => step.classList.toggle('active', i === n));
    prevBtn.style.display = n === 0 ? 'none' : 'inline-block';
    nextBtn.style.display = n === steps.length - 1 ? 'none' : 'inline-block';
    submitBtn.style.display = n === steps.length - 1 ? 'inline-block' : 'none';
    updateStepIndicator(n);
}
function updateStepIndicator(n) {
    const ind = document.getElementById('stepIndicator');
    if (!ind) return;
    ind.innerHTML = Array.from(steps).map((_, i) =>
        `<span class="step-dot ${i === n ? 'active' : i < n ? 'done' : ''}">${i + 1}</span>`).join('');
}
function changeStep(delta) {
    const target = currentStep + delta;
    if (target < 0 || target >= steps.length) return;
    if (currentStep === 0 && delta > 0) {
        const req = [{ id: 'newId', label: 'Employee ID' }, { id: 'newName', label: 'Full Name' }, { id: 'newAge', label: 'Age' }];
        for (const f of req) {
            const el = document.getElementById(f.id);
            if (!el || !el.value.trim()) { el && el.focus(); alert(`Please fill in the required field: ${f.label}`); return; }
        }
    }
    currentStep = target; showStep(currentStep);
    const mc = addModal.querySelector('.wide-modal');
    if (mc) mc.scrollTop = 0;
}

let isEditMode = false;
let editId = null;

function openModalForNew() {
    isEditMode = false; editId = null;
    submitBtn.innerText = 'Save Health Profile';
    const restored = loadFormDraft(ADD_FORM_DRAFT_KEY, addForm);
    if (!restored) {
        addForm.reset();
        setNewEmployeeId();
        currentStep = 0; showStep(0);
    } else {
        if (!gv('newId')) setNewEmployeeId();
        showToast('Draft restored. You can continue filling the form.', 'green');
    }
    addModal.style.display = 'block';
}
function closeModal() { addModal.style.display = 'none'; }
addNewBtn.onclick = openModalForNew;
document.querySelector('#addModal .close').onclick = closeModal;
if (addForm) {
    addForm.addEventListener('input', () => saveFormDraft(ADD_FORM_DRAFT_KEY, addForm));
    addForm.addEventListener('change', () => saveFormDraft(ADD_FORM_DRAFT_KEY, addForm));
}

function setFormValues(emp) {
    sv('newId', emp.id); sv('newName', emp.name); sv('newBday', emp.birthday);
    sv('newAge', emp.age); sv('newGender', emp.gender); sv('newContact', emp.contact);
    sv('newReligion', emp.religion); sv('newOccupation', emp.occupation);
    sv('newCivilStatus', emp.civilStatus); sv('newClass', emp.class || 'Class A');
    sv('newCategory', emp.category); sv('newOffice', emp.office);
    sv('newAddress', emp.address); sv('newCondition', emp.condition);
    sv('emergencyName', emp.emergencyName); sv('emergencyRelationship', emp.emergencyRelationship);
    sv('emergencyAddress', emp.emergencyAddress); sv('emergencyContact', emp.emergencyContact);
    sv('newSmoking', emp.smoking); sv('newSmokingPack', emp.smokingPack);
    sv('newAlcohol', emp.alcohol); sv('newAlcoholDetails', emp.alcoholDetails);
    sv('newDrugs', emp.drugs); sv('newSexActivity', emp.sexuallyActive);
    sv('newSexPartners', emp.sexPartners); sv('newSexPartnerGender', emp.sexPartnerGender);
    sv('pmAllergy', emp.pmAllergy); sv('pmAllergyType', emp.pmAllergyType);
    sv('pmAsthma', emp.pmAsthma); sv('pmCancer', emp.pmCancer); sv('pmCoronary', emp.pmCoronary);
    sv('pmHypertension', emp.pmHypertension); sv('pmCongenital', emp.pmCongenital);
    sv('pmDiabetes', emp.pmDiabetes); sv('pmThyroid', emp.pmThyroid); sv('pmPeptic', emp.pmPeptic);
    sv('pmPCOS', emp.pmPCOS); sv('pmPsych', emp.pmPsych); sv('pmPsychType', emp.pmPsychType);
    sv('pmEpilepsy', emp.pmEpilepsy); sv('pmSkin', emp.pmSkin); sv('pmTB', emp.pmTB); sv('pmHepatitis', emp.pmHepatitis);
    sv('hospitalDiagnosis1', emp.hospitalDiagnosis1); sv('hospitalWhen1', emp.hospitalWhen1);
    sv('hospitalDiagnosis2', emp.hospitalDiagnosis2); sv('hospitalWhen2', emp.hospitalWhen2);
    sv('surgeryType1', emp.surgeryType1); sv('surgeryWhen1', emp.surgeryWhen1);
    sv('surgeryType2', emp.surgeryType2); sv('surgeryWhen2', emp.surgeryWhen2);
    sv('disabilitySpecify', emp.disabilitySpecify); sv('disabilityRegistered', emp.disabilityRegistered);
    sv('donateBlood', emp.donateBlood);
    sv('newFamilyHistoryMother', emp.familyHistoryMother); sv('newFamilyHistoryFather', emp.familyHistoryFather);
    sv('newbornImmunization', emp.newbornImmunization); sv('newCovidVax', emp.newCovidVax);
    sv('hpvDoses', emp.hpvDoses); sv('tetanusDoses', emp.tetanusDoses);
    sv('influenzaYear', emp.influenzaYear); sv('pneumococcalDoses', emp.pneumococcalDoses);
    sv('otherImmunizations', emp.otherImmunizations); sv('newPhysicalNotes', emp.physicalNotes);
    sv('covidBrand', emp.covidBrand); sv('covidDose1', emp.covidDose1); sv('covidDose2', emp.covidDose2);
    sv('covidBooster1', emp.covidBooster1); sv('covidBooster2', emp.covidBooster2);
    sv('covidUnvaccinatedReason', emp.covidUnvaccinatedReason);
    sv('maintenanceMedication', emp.maintenanceMedication); sv('obGynNotes', emp.obGynNotes);
    sv('menarche', emp.menarche); sv('lastMenstrualPeriod', emp.lastMenstrualPeriod);
    sv('periodDuration', emp.periodDuration); sv('intervalCycle', emp.intervalCycle);
    sv('padsPerDay', emp.padsPerDay); sv('onsetSexualIntercourse', emp.onsetSexualIntercourse);
    sv('birthControlMethod', emp.birthControlMethod); sv('menopausalStage', emp.menopausalStage);
    sv('menopausalAge', emp.menopausalAge); sv('pregnancyHistory', emp.pregnancyHistory);
    sv('pregnantNow', emp.pregnantNow); sv('pregnancyMonths', emp.pregnancyMonths);
    sv('prenatalCheckup', emp.prenatalCheckup); sv('prenatalWhere', emp.prenatalWhere);
    sv('pregnancyTestSubject', emp.pregnancyTestSubject); sv('pregnancyTestResult', emp.pregnancyTestResult);
    sv('gravida', emp.gravida); sv('para', emp.para); sv('term', emp.term);
    sv('abortion', emp.abortion); sv('liveBirth', emp.liveBirth);
    sv('deliveryType', emp.deliveryType); sv('deliveryComplications', emp.deliveryComplications);
    sv('familyPlanningType', emp.familyPlanningType); sv('familyPlanningYears', emp.familyPlanningYears);
    sv('neuroNormalThought', emp.neuroNormalThought); sv('neuroNormalEmotional', emp.neuroNormalEmotional);
    sv('neuroNormalPsych', emp.neuroNormalPsych); sv('neuroHowFeel', emp.neuroHowFeel); sv('neuroOthers', emp.neuroOthers);
    sv('heentAnictericSclerae', emp.heentAnictericSclerae); sv('heentPerla', emp.heentPerla);
    sv('heentAuralDischarge', emp.heentAuralDischarge); sv('heentIntactTympanic', emp.heentIntactTympanic);
    sv('heentNasalFlaring', emp.heentNasalFlaring); sv('heentNasalDischarge', emp.heentNasalDischarge);
    sv('heentTonsillopharyngealCongestion', emp.heentTonsillopharyngealCongestion);
    sv('heentHypertropicTonsils', emp.heentHypertropicTonsils);
    sv('heentPalpableMass', emp.heentPalpableMass); sv('heentExudates', emp.heentExudates);
    sv('respNormalBreathSounds', emp.respNormalBreathSounds); sv('respSymChestExpansion', emp.respSymChestExpansion);
    sv('respRetractions', emp.respRetractions); sv('respCracklesRates', emp.respCracklesRates);
    sv('respWheezing', emp.respWheezing); sv('respClearBreathSounds', emp.respClearBreathSounds);
    sv('cardioNormalHeartBeat', emp.cardioNormalHeartBeat); sv('cardioClubbing', emp.cardioClubbing);
    sv('cardioFingerDiscoloration', emp.cardioFingerDiscoloration); sv('cardioHeartMurmur', emp.cardioHeartMurmur);
    sv('cardioIrregularHeartBeat', emp.cardioIrregularHeartBeat); sv('cardioPalpitations', emp.cardioPalpitations);
    sv('cardioFluidVolumeExcess', emp.cardioFluidVolumeExcess); sv('cardioFatigueMobility', emp.cardioFatigueMobility);
    sv('giRegularBowel', emp.giRegularBowel); sv('giBowelPerDay', emp.giBowelPerDay);
    sv('giBorborygmi', emp.giBorborygmi); sv('giConstipation', emp.giConstipation);
    sv('giLooseBowel', emp.giLooseBowel); sv('giHyperacidity', emp.giHyperacidity);
    sv('urinaryFlankPain', emp.urinaryFlankPain); sv('urinaryPainful', emp.urinaryPainful);
    sv('urinaryFrequency', emp.urinaryFrequency); sv('urinaryAmountPerVoiding', emp.urinaryAmountPerVoiding);
    sv('integPallor', emp.integPallor); sv('integRashes', emp.integRashes); sv('integJaundice', emp.integJaundice);
    sv('integSkinTurgor', emp.integSkinTurgor); sv('integCyanosis', emp.integCyanosis);
    sv('extegGrossDeformity', emp.extegGrossDeformity); sv('extegNormalGait', emp.extegNormalGait);
    sv('extegNormalStrength', emp.extegNormalStrength); sv('extegOthers', emp.extegOthers);
    sv('assessmentOtherFindings', emp.assessmentOtherFindings);
    sv('appendixHeight', emp.appendixHeight); sv('appendixWeight', emp.appendixWeight);
    sv('appendixBP', emp.appendixBP); sv('appendixPulse', emp.appendixPulse);
    sv('appendixRespiration', emp.appendixRespiration); sv('appendixSpO2', emp.appendixSpO2);
    sv('appendixBMI', emp.appendixBMI); sv('appendixBMIClass', emp.appendixBMIClass);
    sv('appendixVisionCorrected', emp.appendixVisionCorrected); sv('appendixVisionUncorrected', emp.appendixVisionUncorrected);
    sv('appendixOD', emp.appendixOD); sv('appendixOS', emp.appendixOS);
    sv('appendixColorVision', emp.appendixColorVision); sv('appendixEarAD', emp.appendixEarAD); sv('appendixEarAS', emp.appendixEarAS);
    sv('appendixNormalSkin', emp.appendixNormalSkin); sv('appendixFindingsSkin', emp.appendixFindingsSkin);
    sv('appendixNormalHead', emp.appendixNormalHead); sv('appendixFindingsHead', emp.appendixFindingsHead);
    sv('appendixNormalEyes', emp.appendixNormalEyes); sv('appendixFindingsEyes', emp.appendixFindingsEyes);
    sv('appendixNormalPupils', emp.appendixNormalPupils); sv('appendixFindingsPupils', emp.appendixFindingsPupils);
    sv('appendixNormalEars', emp.appendixNormalEars); sv('appendixFindingsEars', emp.appendixFindingsEars);
    sv('appendixNormalMouth', emp.appendixNormalMouth); sv('appendixFindingsMouth', emp.appendixFindingsMouth);
    sv('appendixNormalNeck', emp.appendixNormalNeck); sv('appendixFindingsNeck', emp.appendixFindingsNeck);
    sv('appendixNormalChest', emp.appendixNormalChest); sv('appendixFindingsChest', emp.appendixFindingsChest);
    sv('appendixNormalLungs', emp.appendixNormalLungs); sv('appendixFindingsLungs', emp.appendixFindingsLungs);
    sv('appendixNormalHeart', emp.appendixNormalHeart); sv('appendixFindingsHeart', emp.appendixFindingsHeart);
    sv('appendixNormalBack', emp.appendixNormalBack); sv('appendixFindingsBack', emp.appendixFindingsBack);
    sv('appendixNormalGenitalia', emp.appendixNormalGenitalia); sv('appendixFindingsGenitalia', emp.appendixFindingsGenitalia);
    sv('appendixNormalAnus', emp.appendixNormalAnus); sv('appendixFindingsAnus', emp.appendixFindingsAnus);
    sv('appendixNormalExtremities', emp.appendixNormalExtremities); sv('appendixFindingsExtremities', emp.appendixFindingsExtremities);
    sv('appendixCBC', emp.appendixCBC); sv('appendixStool', emp.appendixStool);
    sv('appendixPregnancyTest', emp.appendixPregnancyTest); sv('appendixUrinalysis', emp.appendixUrinalysis);
    sv('appendixXray', emp.appendixXray); sv('appendixHepB', emp.appendixHepB);
    sv('appendixBloodType', emp.appendixBloodType); sv('appendixMMSE', emp.appendixMMSE);
    sv('appendixClassA', emp.appendixClassA); sv('appendixClassB', emp.appendixClassB); sv('appendixClassC', emp.appendixClassC);
    sv('appendixDiagnosis', emp.appendixDiagnosis); sv('appendixRemarks', emp.appendixRemarks);
    sv('appendixSchoolNurse', emp.appendixSchoolNurse); sv('appendixSchoolNurseLicense', emp.appendixSchoolNurseLicense);
    sv('appendixPhysician', emp.appendixPhysician); sv('appendixPhysicianLicense', emp.appendixPhysicianLicense);
    sv('appendixDateFiled', emp.appendixDateFiled); sv('appendixFileNo', emp.appendixFileNo); sv('appendixRecordedBy', emp.appendixRecordedBy);
}

function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    isEditMode = true; editId = id;
    addForm.reset(); setFormValues(emp);
    const restored = loadFormDraft(ADD_FORM_DRAFT_KEY, addForm, meta => meta && meta.editId === id);
    if (!restored) {
        currentStep = 0; showStep(0);
    } else {
        showToast('Draft restored for this record.', 'green');
    }
    submitBtn.innerText = 'Update Health Profile';
    addModal.style.display = 'block';
}

function collectFormValues(existingEmp) {
    return {
        consultations: existingEmp ? (existingEmp.consultations || []) : [],
        id: gv('newId'), name: gv('newName'), birthday: gv('newBday'),
        age: gv('newAge'), gender: gv('newGender'), contact: gv('newContact'),
        religion: gv('newReligion'), occupation: gv('newOccupation'),
        civilStatus: gv('newCivilStatus'), class: gv('newClass') || 'Class A',
        category: gv('newCategory'), office: gv('newOffice'),
        address: gv('newAddress'), condition: gv('newCondition'),
        emergencyName: gv('emergencyName'), emergencyRelationship: gv('emergencyRelationship'),
        emergencyAddress: gv('emergencyAddress'), emergencyContact: gv('emergencyContact'),
        smoking: gv('newSmoking'), smokingPack: gv('newSmokingPack'),
        alcohol: gv('newAlcohol'), alcoholDetails: gv('newAlcoholDetails'),
        drugs: gv('newDrugs'), sexuallyActive: gv('newSexActivity'),
        sexPartners: gv('newSexPartners'), sexPartnerGender: gv('newSexPartnerGender'),
        pmAllergy: gv('pmAllergy'), pmAllergyType: gv('pmAllergyType'),
        pmAsthma: gv('pmAsthma'), pmCancer: gv('pmCancer'), pmCoronary: gv('pmCoronary'),
        pmHypertension: gv('pmHypertension'), pmCongenital: gv('pmCongenital'),
        pmDiabetes: gv('pmDiabetes'), pmThyroid: gv('pmThyroid'), pmPeptic: gv('pmPeptic'),
        pmPCOS: gv('pmPCOS'), pmPsych: gv('pmPsych'), pmPsychType: gv('pmPsychType'),
        pmEpilepsy: gv('pmEpilepsy'), pmSkin: gv('pmSkin'), pmTB: gv('pmTB'), pmHepatitis: gv('pmHepatitis'),
        hospitalDiagnosis1: gv('hospitalDiagnosis1'), hospitalWhen1: gv('hospitalWhen1'),
        hospitalDiagnosis2: gv('hospitalDiagnosis2'), hospitalWhen2: gv('hospitalWhen2'),
        surgeryType1: gv('surgeryType1'), surgeryWhen1: gv('surgeryWhen1'),
        surgeryType2: gv('surgeryType2'), surgeryWhen2: gv('surgeryWhen2'),
        disabilitySpecify: gv('disabilitySpecify'), disabilityRegistered: gv('disabilityRegistered'),
        donateBlood: gv('donateBlood'),
        familyHistoryMother: gv('newFamilyHistoryMother'), familyHistoryFather: gv('newFamilyHistoryFather'),
        newbornImmunization: gv('newbornImmunization'), newCovidVax: gv('newCovidVax'),
        hpvDoses: gv('hpvDoses'), tetanusDoses: gv('tetanusDoses'),
        influenzaYear: gv('influenzaYear'), pneumococcalDoses: gv('pneumococcalDoses'),
        otherImmunizations: gv('otherImmunizations'), physicalNotes: gv('newPhysicalNotes'),
        covidBrand: gv('covidBrand'), covidDose1: gv('covidDose1'), covidDose2: gv('covidDose2'),
        covidBooster1: gv('covidBooster1'), covidBooster2: gv('covidBooster2'),
        covidUnvaccinatedReason: gv('covidUnvaccinatedReason'),
        maintenanceMedication: gv('maintenanceMedication'), obGynNotes: gv('obGynNotes'),
        menarche: gv('menarche'), lastMenstrualPeriod: gv('lastMenstrualPeriod'),
        periodDuration: gv('periodDuration'), intervalCycle: gv('intervalCycle'),
        padsPerDay: gv('padsPerDay'), onsetSexualIntercourse: gv('onsetSexualIntercourse'),
        birthControlMethod: gv('birthControlMethod'), menopausalStage: gv('menopausalStage'),
        menopausalAge: gv('menopausalAge'), pregnancyHistory: gv('pregnancyHistory'),
        pregnantNow: gv('pregnantNow'), pregnancyMonths: gv('pregnancyMonths'),
        prenatalCheckup: gv('prenatalCheckup'), prenatalWhere: gv('prenatalWhere'),
        pregnancyTestSubject: gv('pregnancyTestSubject'), pregnancyTestResult: gv('pregnancyTestResult'),
        gravida: gv('gravida'), para: gv('para'), term: gv('term'),
        abortion: gv('abortion'), liveBirth: gv('liveBirth'),
        deliveryType: gv('deliveryType'), deliveryComplications: gv('deliveryComplications'),
        familyPlanningType: gv('familyPlanningType'), familyPlanningYears: gv('familyPlanningYears'),
        neuroNormalThought: gv('neuroNormalThought'), neuroNormalEmotional: gv('neuroNormalEmotional'),
        neuroNormalPsych: gv('neuroNormalPsych'), neuroHowFeel: gv('neuroHowFeel'), neuroOthers: gv('neuroOthers'),
        heentAnictericSclerae: gv('heentAnictericSclerae'), heentPerla: gv('heentPerla'),
        heentAuralDischarge: gv('heentAuralDischarge'), heentIntactTympanic: gv('heentIntactTympanic'),
        heentNasalFlaring: gv('heentNasalFlaring'), heentNasalDischarge: gv('heentNasalDischarge'),
        heentTonsillopharyngealCongestion: gv('heentTonsillopharyngealCongestion'),
        heentHypertropicTonsils: gv('heentHypertropicTonsils'),
        heentPalpableMass: gv('heentPalpableMass'), heentExudates: gv('heentExudates'),
        respNormalBreathSounds: gv('respNormalBreathSounds'), respSymChestExpansion: gv('respSymChestExpansion'),
        respRetractions: gv('respRetractions'), respCracklesRates: gv('respCracklesRates'),
        respWheezing: gv('respWheezing'), respClearBreathSounds: gv('respClearBreathSounds'),
        cardioNormalHeartBeat: gv('cardioNormalHeartBeat'), cardioClubbing: gv('cardioClubbing'),
        cardioFingerDiscoloration: gv('cardioFingerDiscoloration'), cardioHeartMurmur: gv('cardioHeartMurmur'),
        cardioIrregularHeartBeat: gv('cardioIrregularHeartBeat'), cardioPalpitations: gv('cardioPalpitations'),
        cardioFluidVolumeExcess: gv('cardioFluidVolumeExcess'), cardioFatigueMobility: gv('cardioFatigueMobility'),
        giRegularBowel: gv('giRegularBowel'), giBowelPerDay: gv('giBowelPerDay'),
        giBorborygmi: gv('giBorborygmi'), giConstipation: gv('giConstipation'),
        giLooseBowel: gv('giLooseBowel'), giHyperacidity: gv('giHyperacidity'),
        urinaryFlankPain: gv('urinaryFlankPain'), urinaryPainful: gv('urinaryPainful'),
        urinaryFrequency: gv('urinaryFrequency'), urinaryAmountPerVoiding: gv('urinaryAmountPerVoiding'),
        integPallor: gv('integPallor'), integRashes: gv('integRashes'), integJaundice: gv('integJaundice'),
        integSkinTurgor: gv('integSkinTurgor'), integCyanosis: gv('integCyanosis'),
        extegGrossDeformity: gv('extegGrossDeformity'), extegNormalGait: gv('extegNormalGait'),
        extegNormalStrength: gv('extegNormalStrength'), extegOthers: gv('extegOthers'),
        assessmentOtherFindings: gv('assessmentOtherFindings'),
        appendixHeight: gv('appendixHeight'), appendixWeight: gv('appendixWeight'),
        appendixBP: gv('appendixBP'), appendixPulse: gv('appendixPulse'),
        appendixRespiration: gv('appendixRespiration'), appendixSpO2: gv('appendixSpO2'),
        appendixBMI: gv('appendixBMI'), appendixBMIClass: gv('appendixBMIClass'),
        appendixVisionCorrected: gv('appendixVisionCorrected'), appendixVisionUncorrected: gv('appendixVisionUncorrected'),
        appendixOD: gv('appendixOD'), appendixOS: gv('appendixOS'),
        appendixColorVision: gv('appendixColorVision'), appendixEarAD: gv('appendixEarAD'), appendixEarAS: gv('appendixEarAS'),
        appendixNormalSkin: gv('appendixNormalSkin'), appendixFindingsSkin: gv('appendixFindingsSkin'),
        appendixNormalHead: gv('appendixNormalHead'), appendixFindingsHead: gv('appendixFindingsHead'),
        appendixNormalEyes: gv('appendixNormalEyes'), appendixFindingsEyes: gv('appendixFindingsEyes'),
        appendixNormalPupils: gv('appendixNormalPupils'), appendixFindingsPupils: gv('appendixFindingsPupils'),
        appendixNormalEars: gv('appendixNormalEars'), appendixFindingsEars: gv('appendixFindingsEars'),
        appendixNormalMouth: gv('appendixNormalMouth'), appendixFindingsMouth: gv('appendixFindingsMouth'),
        appendixNormalNeck: gv('appendixNormalNeck'), appendixFindingsNeck: gv('appendixFindingsNeck'),
        appendixNormalChest: gv('appendixNormalChest'), appendixFindingsChest: gv('appendixFindingsChest'),
        appendixNormalLungs: gv('appendixNormalLungs'), appendixFindingsLungs: gv('appendixFindingsLungs'),
        appendixNormalHeart: gv('appendixNormalHeart'), appendixFindingsHeart: gv('appendixFindingsHeart'),
        appendixNormalBack: gv('appendixNormalBack'), appendixFindingsBack: gv('appendixFindingsBack'),
        appendixNormalGenitalia: gv('appendixNormalGenitalia'), appendixFindingsGenitalia: gv('appendixFindingsGenitalia'),
        appendixNormalAnus: gv('appendixNormalAnus'), appendixFindingsAnus: gv('appendixFindingsAnus'),
        appendixNormalExtremities: gv('appendixNormalExtremities'), appendixFindingsExtremities: gv('appendixFindingsExtremities'),
        appendixCBC: gv('appendixCBC'), appendixStool: gv('appendixStool'),
        appendixPregnancyTest: gv('appendixPregnancyTest'), appendixUrinalysis: gv('appendixUrinalysis'),
        appendixXray: gv('appendixXray'), appendixHepB: gv('appendixHepB'),
        appendixBloodType: gv('appendixBloodType'), appendixMMSE: gv('appendixMMSE'),
        appendixClassA: gv('appendixClassA'), appendixClassB: gv('appendixClassB'), appendixClassC: gv('appendixClassC'),
        appendixDiagnosis: gv('appendixDiagnosis'), appendixRemarks: gv('appendixRemarks'),
        appendixSchoolNurse: gv('appendixSchoolNurse'), appendixSchoolNurseLicense: gv('appendixSchoolNurseLicense'),
        appendixPhysician: gv('appendixPhysician'), appendixPhysicianLicense: gv('appendixPhysicianLicense'),
        appendixDateFiled: gv('appendixDateFiled'), appendixFileNo: gv('appendixFileNo'), appendixRecordedBy: gv('appendixRecordedBy'),
    };
}

addForm.onsubmit = async (e) => {
    e.preventDefault();

    const existingEmp = isEditMode ? employees.find(e => e.id === editId) : null;
    const employeeData = collectFormValues(existingEmp);

    clearFormDraft(ADD_FORM_DRAFT_KEY);

    if (isEditMode && editId) {
        const index = employees.findIndex(e => e.id === editId);
        if (index !== -1) employees[index] = employeeData; else employees.unshift(employeeData);
        showToast('Health profile updated successfully!', 'green');
        if (typeof AuditLog !== 'undefined') {
            await AuditLog.log('EMPLOYEE_UPDATE', { employeeId: editId, employeeName: employeeData.name });
        }
    } else {
        employees.unshift(employeeData);
        normalizeEmployeeIds();
        showToast('Health profile saved successfully!', 'green');
        if (typeof AuditLog !== 'undefined') {
            await AuditLog.log('EMPLOYEE_CREATE', { employeeId: employeeData.id, employeeName: employeeData.name });
        }
    }
    await saveEmployees();
    dispatchDataUpdated();
    filterData();
    updateStats();
    populateConsultEmployeeOptions();
    closeModal();
};

function showToast(msg, color = 'green') {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
            padding:12px 28px;border-radius:8px;font-weight:bold;font-size:1rem;
            z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:opacity 0.4s;`;
        document.body.appendChild(toast);
    }
    toast.style.background = color === 'green' ? '#2e7d32' : '#c62828';
    toast.style.color = '#fff'; toast.style.opacity = '1'; toast.innerText = msg;
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// --------------------------------------------------
function populateConsultEmployeeOptions() {
    const searchInput = document.getElementById('consultEmployeeSearch');
    const hiddenId = document.getElementById('consultEmployeeId');
    if (!searchInput || !hiddenId) return;
    searchInput.value = '';
    hiddenId.value = '';
    searchInput.oninput = () => {
        updateConsultEmployeeOptions();
        updateConsultEmployeeSelection();
    };
    searchInput.onchange = updateConsultEmployeeSelection;
    updateConsultEmployeeOptions();
}

function updateConsultEmployeeOptions() {
    const searchInput = document.getElementById('consultEmployeeSearch');
    const dataList = document.getElementById('consultEmployeeList');
    const resultsBox = document.getElementById('consultEmployeeResults');
    if (!searchInput || !dataList || !resultsBox) return;
    const query = (searchInput.value || '').trim().toLowerCase();
    const employeesToShow = sortEmployeesByName(employees).filter(emp => {
        if (!query) return true;
        return emp.name.toLowerCase().includes(query) || emp.id.toLowerCase().includes(query);
    });
    dataList.innerHTML = employeesToShow.map(emp => `<option value="${emp.name} (${emp.id})"></option>`).join('');
    renderConsultEmployeeSearchResults(employeesToShow.slice(0, 20));
}

function renderConsultEmployeeSearchResults(list) {
    const resultsBox = document.getElementById('consultEmployeeResults');
    if (!resultsBox) return;
    if (!list.length) {
        resultsBox.innerHTML = '<div class="result-item">No employees found.</div>';
        resultsBox.classList.remove('hidden');
        return;
    }
    resultsBox.classList.remove('hidden');
    resultsBox.innerHTML = list.map(emp => `
        <div class="result-item" data-id="${emp.id}" data-value="${emp.name} (${emp.id})">
            ${emp.name} <span style="color:#555;font-size:0.82rem;">(${emp.id})</span>
        </div>
    `).join('');
    resultsBox.querySelectorAll('.result-item').forEach(item => {
        item.onclick = () => {
            const value = item.dataset.value;
            const empId = item.dataset.id;
            const searchInput = document.getElementById('consultEmployeeSearch');
            const hiddenId = document.getElementById('consultEmployeeId');
            if (searchInput) searchInput.value = value;
            if (hiddenId) hiddenId.value = empId;
            const employee = employees.find(emp => emp.id === empId);
            if (employee) fillConsultEmployeeFields(employee);
            resultsBox.classList.add('hidden');
        };
    });
}

function updateConsultEmployeeSelection() {
    const searchInput = document.getElementById('consultEmployeeSearch');
    const hiddenId = document.getElementById('consultEmployeeId');
    if (!searchInput || !hiddenId) return;
    const exactValue = searchInput.value.trim();
    const selectedEmployee = employees.find(emp => `${emp.name} (${emp.id})` === exactValue);
    if (selectedEmployee) {
        hiddenId.value = selectedEmployee.id;
        fillConsultEmployeeFields(selectedEmployee);
    } else {
        hiddenId.value = '';
    }
}

function fillConsultEmployeeFields(emp) {
    const nameParts = emp.name.split(',').map(s => s.trim());
    document.getElementById('consultFamilyName').value = nameParts[0] || '';
    const restParts = (nameParts[1] || '').split(' ').filter(Boolean);
    document.getElementById('consultFirstName').value = restParts[0] || '';
    document.getElementById('consultMiddleName').value = restParts.slice(1).join(' ') || '';
    document.getElementById('consultSex').value = emp.gender || '';
    document.getElementById('consultCivilStatus').value = emp.civilStatus || '';
    document.getElementById('consultPhone').value = emp.contact || '';
    document.getElementById('consultAge').value = emp.age || '';
    document.getElementById('consultBday').value = emp.birthday || '';
    document.getElementById('consultAddress').value = emp.address || '';
    
    // Connect Category and Office
    const consultCategory = document.getElementById('consultCategory');
    const consultOffice = document.getElementById('consultOffice');
    if (consultCategory) consultCategory.value = emp.category || '';
    if (consultOffice) consultOffice.value = emp.office || '';
}

function renderConsultations() {
    const consultList = document.getElementById('consultList');
    if (!consultList) return;
    if (!consultations.length) { consultList.innerHTML = '<p>No consultation records saved.</p>'; return; }
    consultList.innerHTML = consultations.map(c => `
        <div class="consult-item">
            <div><strong>${c.familyName}, ${c.firstName} ${c.middleName || ''}</strong></div>
            <div style="font-size:0.85rem;color:#666;">${c.consultCategory || '-'} Â· ${c.consultOffice || '-'}</div>
            <div style="font-size:0.85rem;color:#1f3a6d;margin-top:4px;">${c.date || '-'} ${c.time || ''} Â· EmpID: ${c.employeeId || 'n/a'}</div>
            <div style="margin-top:8px;"><strong>Complaint:</strong> ${c.chiefComplaint || '-'}</div>
            <div><strong>Plan:</strong> ${c.plan || '-'}</div>
        </div>`).join('');
}

const openConsultBtn = document.getElementById('openConsultBtn');
const quickConsultBtn = document.getElementById('quickConsultBtn');
const consultModal = document.getElementById('consultModal');
const closeConsultModalBtn = document.getElementById('closeConsultModal');
const openRxBtn = document.getElementById('openRxBtn');
const quickPrescriptionBtn = document.getElementById('quickPrescriptionBtn');
const rxModal = document.getElementById('rxModal');
const closeRxModalBtn = document.getElementById('closeRxModal');
const printRxBtn = document.getElementById('printRxBtn');
const attachConsultOpen = () => {
    const searchInput = document.getElementById('consultEmployeeSearch');
    if (searchInput) searchInput.value = '';
    updateConsultEmployeeOptions();
    consultModal.style.display = 'block';
};
if (openConsultBtn) openConsultBtn.onclick = attachConsultOpen;
else if (quickConsultBtn) quickConsultBtn.onclick = attachConsultOpen;
if (closeConsultModalBtn) closeConsultModalBtn.onclick = () => { consultModal.style.display = 'none'; };



const attachRxOpen = () => {
    const searchInput = document.getElementById('rxEmployeeSearch');
    const hiddenId = document.getElementById('rxEmployeeId');
    if (searchInput) searchInput.value = '';
    if (hiddenId) hiddenId.value = '';
    document.getElementById('rxFullName').value = '';
    document.getElementById('rxAge').value = '';
    document.getElementById('rxGender').value = '';
    document.getElementById('rxAddress').value = '';
    document.getElementById('rxDoctorName').value = 'Dr. Val Acosta Clinic';
    document.getElementById('rxPrescribedOn').value = new Date().toISOString().slice(0, 16);
    document.getElementById('rxNote').value = '';
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`rxMedName${i}`).value = '';
        document.getElementById(`rxMedDetails${i}`).value = '';
    }
    const consultDateSelect = document.getElementById('rxConsultDate');
    if (consultDateSelect) {
        consultDateSelect.innerHTML = '<option value="">-- select consultation --</option>';
        consultDateSelect.disabled = true;
    }
    populateRxEmployeeOptions();
    renderPrescriptionPreview();
    rxModal.style.display = 'block';
};
if (openRxBtn) openRxBtn.onclick = attachRxOpen;
else if (quickPrescriptionBtn) quickPrescriptionBtn.onclick = attachRxOpen;
if (closeRxModalBtn) closeRxModalBtn.onclick = () => { if (rxModal) rxModal.style.display = 'none'; };

printRxBtn.onclick = async () => {
    // Get prescription data
    const employeeId = document.getElementById('rxEmployeeId').value;
    const consultDateValue = document.getElementById('rxConsultDate').value;

    // Gather prescription details
    const prescriptionData = {
        fullName: document.getElementById('rxFullName').value.trim(),
        age: document.getElementById('rxAge').value.trim(),
        gender: document.getElementById('rxGender').value.trim(),
        address: document.getElementById('rxAddress').value.trim(),
        consultCategory: document.getElementById('rxCategory').value.trim(),
        consultOffice: document.getElementById('rxOffice').value.trim(),
        prescribedOn: document.getElementById('rxPrescribedOn').value,
        medicines: [],
        note: document.getElementById('rxNote').value.trim(),
        printedAt: new Date().toISOString()
    };

    // Collect medicines
    for (let i = 1; i <= 3; i++) {
        const name = document.getElementById(`rxMedName${i}`).value.trim();
        const details = document.getElementById(`rxMedDetails${i}`).value.trim();
        if (name) {
            prescriptionData.medicines.push({ name, details });
        }
    }

    // Save to consultation if selected
    if (employeeId && consultDateValue) {
        const [date, time, idx] = consultDateValue.split('||');
        const employee = employees.find(e => e.id === employeeId);
        if (employee && Array.isArray(employee.consultations) && employee.consultations[idx]) {
            if (!employee.consultations[idx].prescriptions) {
                employee.consultations[idx].prescriptions = [];
            }
            employee.consultations[idx].prescriptions.push(prescriptionData);
            await saveEmployees();
            
            // Log audit trail
            if (typeof AuditLog !== 'undefined') {
                await AuditLog.log('PRESCRIPTION_CREATE', { employeeId: employeeId, prescribedOn: prescriptionData.prescribedOn });
            }
            
            showToast('Prescription saved to consultation!', 'green');
        }
    }

    // Proceed with printing
    renderPrescriptionPreview();
    const rxPrintArea = document.getElementById('rxPrintArea');
    if (!rxPrintArea) return;
    rxPrintArea.style.display = 'block';
    rxPrintArea.classList.add('print-active');
    const cleanupPrint = () => {
        rxPrintArea.classList.remove('print-active');
        rxPrintArea.style.display = 'none';
        window.onafterprint = null;
    };
    window.onafterprint = cleanupPrint;
    requestAnimationFrame(() => {
        setTimeout(() => {
            window.print();
            if (typeof window.onafterprint !== 'function') cleanupPrint();
        }, 150);
    });
};

function closeRxModal() {
    if (rxModal) rxModal.style.display = 'none';
}

function populateRxEmployeeOptions() {
    const searchInput = document.getElementById('rxEmployeeSearch');
    const hiddenId = document.getElementById('rxEmployeeId');
    if (!searchInput || !hiddenId) return;
    searchInput.value = '';
    hiddenId.value = '';
    searchInput.oninput = () => {
        updateRxEmployeeOptions();
        updateRxEmployeeSelection();
    };
    searchInput.onchange = updateRxEmployeeSelection;
    updateRxEmployeeOptions();
}

function updateRxEmployeeOptions() {
    const searchInput = document.getElementById('rxEmployeeSearch');
    const dataList = document.getElementById('rxEmployeeList');
    if (!searchInput || !dataList) return;
    const query = (searchInput.value || '').trim().toLowerCase();
    const employeesToShow = sortEmployeesByName(employees).filter(emp => {
        if (!query) return true;
        return emp.name.toLowerCase().includes(query) || emp.id.toLowerCase().includes(query);
    });
    dataList.innerHTML = employeesToShow.map(emp => `<option value="${emp.name} (${emp.id})"></option>`).join('');
}

function updateRxEmployeeSelection() {
    const searchInput = document.getElementById('rxEmployeeSearch');
    const hiddenId = document.getElementById('rxEmployeeId');
    if (!searchInput || !hiddenId) return;
    const exactValue = searchInput.value.trim();
    const selectedEmployee = employees.find(emp => `${emp.name} (${emp.id})` === exactValue);
    if (selectedEmployee) {
        hiddenId.value = selectedEmployee.id;
        fillRxEmployeeFields(selectedEmployee);
    } else {
        hiddenId.value = '';
    }
}

function fillRxEmployeeFields(emp) {
    document.getElementById('rxFullName').value = emp.name || '';
    document.getElementById('rxAge').value = emp.age || '';
    document.getElementById('rxGender').value = emp.gender || '';
    document.getElementById('rxAddress').value = emp.address || '';
    document.getElementById('rxCategory').value = emp.category || '';
    document.getElementById('rxOffice').value = emp.office || '';
    populateRxConsultationDates(emp.id);
}

function populateRxConsultationDates(employeeId) {
    const consultDateSelect = document.getElementById('rxConsultDate');
    if (!consultDateSelect) return;
    
    const emp = employees.find(e => e.id === employeeId);
    consultDateSelect.innerHTML = '<option value="">-- select consultation --</option>';
    consultDateSelect.disabled = true;
    
    if (!emp || !Array.isArray(emp.consultations) || !emp.consultations.length) {
        consultDateSelect.innerHTML = '<option value="">No consultations available</option>';
        return;
    }
    
    consultDateSelect.disabled = false;
    consultDateSelect.innerHTML += emp.consultations.map((c, idx) =>
        `<option value="${c.date || ''}||${c.time || ''}||${idx}">${c.date || 'No date'} ${c.time ? '- ' + c.time : ''}</option>`
    ).join('');
}

function updateRxEmployeeOptions() {
    const searchInput = document.getElementById('rxEmployeeSearch');
    const dataList = document.getElementById('rxEmployeeList');
    if (!searchInput || !dataList) return;
    const query = (searchInput.value || '').trim().toLowerCase();
    const employeesToShow = sortEmployeesByName(employees).filter(emp => {
        if (!query) return true;
        return emp.name.toLowerCase().includes(query) || emp.id.toLowerCase().includes(query);
    });
    dataList.innerHTML = employeesToShow.map(emp => `<option value="${emp.name} (${emp.id})"></option>`).join('');
    if (query && employeesToShow.length === 1) {
        const employee = employeesToShow[0];
        searchInput.value = `${employee.name} (${employee.id})`;
        document.getElementById('rxEmployeeId').value = employee.id;
        fillRxEmployeeFields(employee);
    }
}

function updateRxEmployeeSelection() {
    const searchInput = document.getElementById('rxEmployeeSearch');
    const hiddenId = document.getElementById('rxEmployeeId');
    if (!searchInput || !hiddenId) return;
    const exactValue = searchInput.value.trim();
    const selectedEmployee = employees.find(emp => `${emp.name} (${emp.id})` === exactValue);
    if (selectedEmployee) {
        hiddenId.value = selectedEmployee.id;
        fillRxEmployeeFields(selectedEmployee);
    } else {
        hiddenId.value = '';
        document.getElementById('rxConsultDate').innerHTML = '<option value="">-- select consultation --</option>';
        document.getElementById('rxConsultDate').disabled = true;
    }
}

function fillRxEmployeeFields(emp) {
    document.getElementById('rxFullName').value = emp.name || '';
    document.getElementById('rxAge').value = emp.age || '';
    document.getElementById('rxGender').value = emp.gender || '';
    document.getElementById('rxAddress').value = emp.address || '';
    
    // Connect Category and Office
    const rxCategory = document.getElementById('rxCategory');
    const rxOffice = document.getElementById('rxOffice');
    if (rxCategory) rxCategory.value = emp.category || '';
    if (rxOffice) rxOffice.value = emp.office || '';
    
    updateRxConsultationDates(emp);
    renderPrescriptionPreview();
}

function updateRxConsultationDates(employee) {
    const consultDateSelect = document.getElementById('rxConsultDate');
    if (!consultDateSelect) return;
    consultDateSelect.innerHTML = '<option value="">-- select consultation --</option>';
    const consultations = Array.isArray(employee.consultations) ? employee.consultations : [];
    if (!consultations.length) {
        consultDateSelect.disabled = true;
        return;
    }
    const sortedConsults = consultations.slice().sort((a, b) => new Date(b.date + ' ' + (b.time || '')).getTime() - new Date(a.date + ' ' + (a.time || '')).getTime());
    sortedConsults.forEach((c, idx) => {
        const label = `${c.date || 'No date'} ${c.time || ''}`.trim();
        const option = document.createElement('option');
        option.value = `${c.date || ''}||${c.time || ''}||${idx}`;
        option.textContent = label;
        consultDateSelect.appendChild(option);
    });
    consultDateSelect.disabled = false;
    consultDateSelect.onchange = () => {
        const value = consultDateSelect.value;
        if (!value) return;
        const [date, time, idx] = value.split('||');
        const consult = sortedConsults[Number(idx)];
        if (consult) {
            const prescribedOn = consult.date ? `${consult.date}T${(consult.time || '00:00')}` : new Date().toISOString().slice(0, 16);
            document.getElementById('rxPrescribedOn').value = prescribedOn;
            renderPrescriptionPreview();
        }
    };
}

function renderPrescriptionPreview() {
    const fullName = document.getElementById('rxFullName').value.trim() || '______________________';
    const age = document.getElementById('rxAge').value.trim() || '____';
    const gender = document.getElementById('rxGender').value.trim() || '___';
    const address = document.getElementById('rxAddress').value.trim() || '______________________';
    const prescribedOnValue = document.getElementById('rxPrescribedOn').value;
    const prescribedOn = formatPrescriptionDate(prescribedOnValue || new Date().toISOString().slice(0, 16));
    const clinicName = document.getElementById('rxDoctorName').value.trim() || 'Dr. Val Acosta Clinic';
    const note = document.getElementById('rxNote').value.trim();
    const meds = [];
    for (let i = 1; i <= 3; i++) {
        const name = document.getElementById(`rxMedName${i}`).value.trim();
        const details = document.getElementById(`rxMedDetails${i}`).value.trim();
        if (name) meds.push({ name, details });
    }
    const preview = document.getElementById('rxPrintArea');
    if (!preview) return;
    const medicationRows = meds.length ? meds.map(m => `
            <div class="prescription-item">
                <div class="rx-name">${m.name}</div>
                <div class="rx-details">${m.details || ''}</div>
            </div>
        `).join('') : '<div class="prescription-item"><div class="rx-name">No medicines entered</div></div>';
    const noteLines = note ? `<div class="prescription-note-text">${note}</div>` : '';
    preview.innerHTML = `
        <div class="prescription-page">
            <div class="prescription-header">
                <div class="prescription-doctor">
                    <div class="doctor-name">Val O. Acosta, MD</div>
                    <div class="doctor-title">General Practice</div>
                    <div class="doctor-location">Northern Bukidnon State College</div>
                    <div class="doctor-location">Health Services Office</div>
                    <div class="doctor-location">Kihare, Tankulan Manolo Fortich Bukidnon</div>
                </div>
                <div class="prescription-date">
                    <div><strong>Prescribed on:</strong> ${prescribedOn} PHT</div>
                </div>
            </div>
            <div class="prescription-patient">
                <div class="patient-field"><span>Patient:</span><span class="patient-line">${fullName !== '______________________' ? fullName : ''}</span></div>
                <div class="patient-field"><span>Age:</span><span class="patient-line">${age !== '____' ? age + ' years old' : ''}</span></div>
                <div class="patient-field"><span>Gender:</span><span class="patient-line">${gender !== '___' ? gender : ''}</span></div>
            </div>
            <div class="rx-logo">Rx</div>
            <div class="prescription-items">
                ${medicationRows}
                ${!meds.length ? Array.from({ length: 2 }).map(() => '<div class="prescription-line"></div>').join('') : ''}
            </div>
            <div class="prescription-note-section">
                <div class="prescription-note-label">Note:</div>
                <div class="prescription-note-lines">
                    ${noteLines || Array.from({ length: 4 }).map(() => '<div class="note-line"></div>').join('')}
                </div>
            </div>
            <div class="prescription-signature">
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="signature-text">
                        <div>Physician's Signature</div>
                        <div>PRC No.: 0154636</div>
                        <div>PTR No.: 6540309</div>
                    </div>
                </div>
           
    `;
}

function generatePrescriptionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 14; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function formatPrescriptionDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    return date.toLocaleString('en-US', options);
}

const consultForm = document.getElementById('consultationForm');
if (consultForm) {
    consultForm.onsubmit = async (e) => {
        e.preventDefault();
        const record = {
            consultCategory: gv('consultCategory'), 
            consultOffice: gv('consultOffice'),
            familyName: gv('consultFamilyName'),
            firstName: gv('consultFirstName'), middleName: gv('consultMiddleName'),
            sex: gv('consultSex'), civilStatus: gv('consultCivilStatus'),
            phone: gv('consultPhone'), age: gv('consultAge'), birthdate: gv('consultBday'),
            height: gv('consultHeight'), weight: gv('consultWeight'), address: gv('consultAddress'),
            date: gv('consultDate'), time: gv('consultTime'),
            bp: gv('consultBP'), hr: gv('consultHR'), rr: gv('consultRR'), temp: gv('consultTemp'),
            chiefComplaint: gv('consultComplaint'), plan: gv('consultPlan'), employeeId: gv('consultEmployeeId'),
        };
        const employee = employees.find(emp => emp.id === record.employeeId);
        if (employee) {
            if (!Array.isArray(employee.consultations)) employee.consultations = [];
            employee.consultations.unshift({
                date: record.date, time: record.time, chiefComplaint: record.chiefComplaint, plan: record.plan,
                consultCategory: record.consultCategory, 
                consultOffice: record.consultOffice,
                bp: record.bp, hr: record.hr, rr: record.rr, temp: record.temp,
                height: record.height, weight: record.weight, createdAt: new Date().toISOString()
            });
            await saveEmployees();
        }
        consultations.unshift(record);
        await saveConsultations(); 
        
        // Log audit trail
        if (typeof AuditLog !== 'undefined') {
            await AuditLog.log('CONSULTATION_CREATE', { employeeId: record.employeeId, date: record.date });
        }
        
        consultForm.reset();
        consultModal.style.display = 'none';
        dispatchDataUpdated();
        showToast('Consultation saved!', 'green');
    };
}

window.onclick = (event) => {
    if (event.target === consultModal) consultModal.style.display = 'none';
    if (event.target === rxModal) rxModal.style.display = 'none';
    if (event.target === addModal) addModal.style.display = 'none';
};

// Export Variables
// Export variables - to be initialized in DOMContentLoaded
let exportBtn, exportModal, closeExportModalBtn, cancelExportBtn, confirmExportBtn;
let exportEmployeeSearch, exportEmployeeList, exportEmployeeResults, exportEmployeeIdInput;
let exportTypeSelect, exportConsultDateSelect, exportConsultationDateGroup;
// Export Functions
function getExportEmployeeIdFromInput() {
    const value = (exportEmployeeSearch.value || '').trim();
    const idMatch = value.match(/\((EMP-\d{4})\)$/);
    if (idMatch) return idMatch[1];
    const exactMatch = employees.find(e => `${e.name} (${e.id})` === value);
    if (exactMatch) return exactMatch.id;
    const byId = employees.find(e => e.id === value);
    return byId ? byId.id : '';
}

function populateExportEmployeeOptions() {
    exportEmployeeSearch.value = '';
    exportEmployeeIdInput.value = '';
    exportEmployeeResults.innerHTML = '';
    exportEmployeeResults.classList.add('hidden');
    updateExportEmployeeListOptions();
    updateExportConsultationDates();
}

function updateExportEmployeeListOptions() {
    exportEmployeeList.innerHTML = sortEmployeesByName(employees)
        .map(emp => `<option value="${emp.name} (${emp.id})">`).join('');
}

function updateExportEmployeeSearch() {
    const query = (exportEmployeeSearch.value || '').toLowerCase().trim();
    if (!query) {
        exportEmployeeResults.innerHTML = '';
        exportEmployeeResults.classList.add('hidden');
        exportEmployeeIdInput.value = '';
        updateExportConsultationDates();
        return;
    }

    const matches = sortEmployeesByName(employees).filter(emp =>
        emp.name.toLowerCase().includes(query) || emp.id.toLowerCase().includes(query)
    ).slice(0, 10);

    if (!matches.length) {
        exportEmployeeResults.innerHTML = '<div class="search-result-item no-results">No matching employee found.</div>';
        exportEmployeeResults.classList.remove('hidden');
        exportEmployeeIdInput.value = '';
        updateExportConsultationDates();
        return;
    }

    exportEmployeeResults.innerHTML = matches.map(emp =>
        `<div class="search-result-item" data-id="${emp.id}">${emp.name} (${emp.id})</div>`
    ).join('');
    exportEmployeeResults.classList.remove('hidden');
}

function selectExportEmployeeResult(employeeId, displayText) {
    exportEmployeeIdInput.value = employeeId;
    exportEmployeeSearch.value = displayText;
    exportEmployeeResults.innerHTML = '';
    exportEmployeeResults.classList.add('hidden');
    updateExportConsultationDates();
}

function updateExportConsultationDates() {
    const employeeId = exportEmployeeIdInput.value;
    const emp = employees.find(e => e.id === employeeId);
    const showingConsultation = exportTypeSelect.value === 'consultation';

    exportConsultDateSelect.innerHTML = '<option value="">-- select consultation --</option>';
    exportConsultDateSelect.disabled = false;
    exportConsultationDateGroup.style.display = showingConsultation ? 'block' : 'none';

    if (!showingConsultation) {
        return;
    }
    if (!emp || !Array.isArray(emp.consultations) || !emp.consultations.length) {
        exportConsultDateSelect.innerHTML = '<option value="">No consultations available</option>';
        exportConsultDateSelect.disabled = true;
        return;
    }

    if (emp.consultations.length > 1) {
        exportConsultDateSelect.innerHTML += '<option value="-1">All consultations</option>';
    }
    exportConsultDateSelect.innerHTML += emp.consultations.map((c, idx) =>
        `<option value="${idx}">${c.date || 'No date'} ${c.time ? '- ' + c.time : ''}</option>`
    ).join('');
}

function toggleExportConsultationDateGroup() {
    if (exportTypeSelect.value === 'consultation') {
        exportConsultationDateGroup.style.display = 'block';
        updateExportConsultationDates();
    } else {
        exportConsultationDateGroup.style.display = 'none';
    }
}

function exportEmployeeProfile(emp) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('âŒ Popup blocked! Please allow popups for this site.', 'red');
        return;
    }
    const initials = (emp.name || ' ').split(',').map(s => s.trim()[0]).join('').slice(0, 2).toUpperCase();
    const currentDate = new Date();
    const reviewDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate());

    // STEP III: Personal/Social History
    const personalHistory = [];
    if (emp.smoking) personalHistory.push(`Smoking: ${emp.smoking}${emp.smokingPack ? ` (${emp.smokingPack})` : ''}`);
    if (emp.alcohol) personalHistory.push(`Alcohol: ${emp.alcohol}${emp.alcoholDetails ? ` (${emp.alcoholDetails})` : ''}`);
    if (emp.drugs) personalHistory.push(`Drugs: ${emp.drugs}`);
    if (emp.sexActivity) personalHistory.push(`Sexually Active: ${emp.sexActivity}`);
    if (emp.sexPartners) personalHistory.push(`Sexual Partners: ${emp.sexPartners}${emp.sexPartnerGender ? ` (${emp.sexPartnerGender})` : ''}`);

    const personalHistoryHtml = personalHistory.length > 0
        ? personalHistory.map(h => `<tr><td>${h}</td></tr>`).join('')
        : `<tr><td style="color:#666;">None reported</td></tr>`;

    // STEP IV: Past Medical History
    const medicalConditions = [];
    if (emp.pmAllergy) medicalConditions.push(`Allergy (${emp.pmAllergyType || 'unspecified'})`);
    if (emp.pmAsthma) medicalConditions.push('Asthma');
    if (emp.pmCancer) medicalConditions.push('Cancer');
    if (emp.pmCoronary) medicalConditions.push('Coronary Artery Disease');
    if (emp.pmHypertension) medicalConditions.push('Hypertension');
    if (emp.pmCongenital) medicalConditions.push('Congenital Heart Disorder');
    if (emp.pmDiabetes) medicalConditions.push('Diabetes Mellitus');
    if (emp.pmThyroid) medicalConditions.push('Thyroid Disease');
    if (emp.pmPeptic) medicalConditions.push('Peptic Ulcer');
    if (emp.pmPCOS) medicalConditions.push('PCOS');
    if (emp.pmPsych) medicalConditions.push(`Psychological Disorder (${emp.pmPsychType || 'unspecified'})`);
    if (emp.pmEpilepsy) medicalConditions.push('Epilepsy/Seizure Disorder');
    if (emp.pmSkin) medicalConditions.push('Skin Disorder');
    if (emp.pmTB) medicalConditions.push('Tuberculosis');
    if (emp.pmHepatitis) medicalConditions.push('Hepatitis');

    const medConditionsHtml = medicalConditions.length > 0
        ? medicalConditions.map(c => `<tr><td>${c}</td></tr>`).join('')
        : `<tr><td colspan="1" style="color:#666;">None reported</td></tr>`;

    // STEP V: Hospital/Surgical History
    const hospitalHistory = [];
    if (emp.hospitalDiagnosis1) hospitalHistory.push(`${emp.hospitalDiagnosis1}${emp.hospitalWhen1 ? ` (${emp.hospitalWhen1})` : ''}`);
    if (emp.hospitalDiagnosis2) hospitalHistory.push(`${emp.hospitalDiagnosis2}${emp.hospitalWhen2 ? ` (${emp.hospitalWhen2})` : ''}`);
    const surgeryHistory = [];
    if (emp.surgeryType1) surgeryHistory.push(`${emp.surgeryType1}${emp.surgeryWhen1 ? ` (${emp.surgeryWhen1})` : ''}`);
    if (emp.surgeryType2) surgeryHistory.push(`${emp.surgeryType2}${emp.surgeryWhen2 ? ` (${emp.surgeryWhen2})` : ''}`);

    const hospitalHtml = hospitalHistory.length > 0
        ? hospitalHistory.map(h => `<tr><td>${h}</td></tr>`).join('')
        : `<tr><td style="color:#666;">None reported</td></tr>`;
    const surgeryHtml = surgeryHistory.length > 0
        ? surgeryHistory.map(s => `<tr><td>${s}</td></tr>`).join('')
        : `<tr><td style="color:#666;">None reported</td></tr>`;

    // STEP VI: Immunizations
    const immunizations = [];
    if (emp.newbornImmunization) immunizations.push(`Newborn: ${emp.newbornImmunization}`);
    if (emp.newCovidVax) immunizations.push(`COVID-19: ${emp.newCovidVax}`);
    if (emp.hpvDoses) immunizations.push(`HPV: ${emp.hpvDoses} doses`);
    if (emp.tetanusDoses) immunizations.push(`Tetanus Toxoid: ${emp.tetanusDoses} doses`);
    if (emp.influenzaYear) immunizations.push(`Influenza Year: ${emp.influenzaYear}`);
    if (emp.pneumococcalDoses) immunizations.push(`Pneumococcal: ${emp.pneumococcalDoses} doses`);
    if (emp.otherImmunizations) immunizations.push(`Other: ${emp.otherImmunizations}`);

    const immunizationsHtml = immunizations.length > 0
        ? immunizations.map(i => `<tr><td>${i}</td></tr>`).join('')
        : `<tr><td style="color:#666;">None reported</td></tr>`;

    // STEP VII: Medications & OB-GYNE
    const mainMedication = emp.maintenanceMedication || 'â€”';
    const obGynNotes = emp.obGynNotes || 'â€”';
    const pregnancyHistory = emp.pregnancyHistory || 'â€”';
    const pregnancyStatus = emp.pregnantNow ? `${emp.pregnantNow}${emp.pregnancyMonths ? ` (${emp.pregnancyMonths} months)` : ''}` : 'â€”';
    const familyPlanning = emp.familyPlanningType ? `${emp.familyPlanningType}${emp.familyPlanningYears ? ` (${emp.familyPlanningYears} years)` : ''}` : 'â€”';
    const otherFindings = emp.assessmentOtherFindings || 'â€”';
    const physicalNotes = emp.newPhysicalNotes || 'â€”';

    const yesNo = (value) => value ? 'Yes' : 'No';
    const kvRow = (label, value) => `<div class="kv-row"><span class="kv-key">${label}</span><span class="kv-val">${value}</span></div>`;

    const headToToeHtml = `
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">VIII. Head to Toe Assessment</span>
            </div>
            <div class="panel-body">
              <div style="font-size:12px; font-weight:600; margin-bottom:0.75rem;">Neurological Assessment</div>
              ${kvRow('Normal thought processes', yesNo(emp.neuroNormalThought))}
              ${kvRow('Normal emotional status', yesNo(emp.neuroNormalEmotional))}
              ${kvRow('Normal psychological status', yesNo(emp.neuroNormalPsych))}
              ${kvRow('How do you feel right now', emp.neuroHowFeel || 'â€”')}
              ${kvRow('Other neurological findings', emp.neuroOthers || 'â€”')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">HEENT Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Anicteric sclerae', yesNo(emp.heentAnictericSclerae))}
              ${kvRow('PERLA', yesNo(emp.heentPerla))}
              ${kvRow('Aural discharge', yesNo(emp.heentAuralDischarge))}
              ${kvRow('Intact tympanic membrane', yesNo(emp.heentIntactTympanic))}
              ${kvRow('Nasal flaring', yesNo(emp.heentNasalFlaring))}
              ${kvRow('Nasal discharge', yesNo(emp.heentNasalDischarge))}
              ${kvRow('Tonsillopharyngeal congestion', yesNo(emp.heentTonsillopharyngealCongestion))}
              ${kvRow('Hypertropic tonsils', yesNo(emp.heentHypertropicTonsils))}
              ${kvRow('Palpable mass', yesNo(emp.heentPalpableMass))}
              ${kvRow('Exudates', yesNo(emp.heentExudates))}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">Respiratory Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Normal breath sounds', yesNo(emp.respNormalBreathSounds))}
              ${kvRow('Symmetrical chest expansion', yesNo(emp.respSymChestExpansion))}
              ${kvRow('Retractions', yesNo(emp.respRetractions))}
              ${kvRow('Crackles / rates', yesNo(emp.respCracklesRates))}
              ${kvRow('Wheezing', yesNo(emp.respWheezing))}
              ${kvRow('Clear breath sounds', yesNo(emp.respClearBreathSounds))}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">Cardiovascular Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Normal heartbeat', yesNo(emp.cardioNormalHeartBeat))}
              ${kvRow('Clubbing of fingers', yesNo(emp.cardioClubbing))}
              ${kvRow('Finger discoloration', yesNo(emp.cardioFingerDiscoloration))}
              ${kvRow('Heart murmur', yesNo(emp.cardioHeartMurmur))}
              ${kvRow('Irregular heartbeat', yesNo(emp.cardioIrregularHeartBeat))}
              ${kvRow('Palpitations', yesNo(emp.cardioPalpitations))}
              ${kvRow('Fluid volume excess', yesNo(emp.cardioFluidVolumeExcess))}
              ${kvRow('Fatigue on mobility', yesNo(emp.cardioFatigueMobility))}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">Gastrointestinal Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Regular bowel movement', yesNo(emp.giRegularBowel))}
              ${kvRow('Bowel movements per day', emp.giBowelPerDay || 'â€”')}
              ${kvRow('Borborygmi', emp.giBorborygmi || 'â€”')}
              ${kvRow('Constipation', yesNo(emp.giConstipation))}
              ${kvRow('Loose bowel movement', yesNo(emp.giLooseBowel))}
              ${kvRow('Hyperacidity', yesNo(emp.giHyperacidity))}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">Urinary Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Flank pain', yesNo(emp.urinaryFlankPain))}
              ${kvRow('Painful urination', yesNo(emp.urinaryPainful))}
              ${kvRow('Urination frequency', emp.urinaryFrequency || 'â€”')}
              ${kvRow('Amount per voiding', emp.urinaryAmountPerVoiding || 'â€”')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">Integumentary Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Pallor', yesNo(emp.integPallor))}
              ${kvRow('Rashes', yesNo(emp.integRashes))}
              ${kvRow('Jaundice', yesNo(emp.integJaundice))}
              ${kvRow('Skin turgor', yesNo(emp.integSkinTurgor))}
              ${kvRow('Cyanosis', yesNo(emp.integCyanosis))}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">Extremities Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Gross deformity', yesNo(emp.extegGrossDeformity))}
              ${kvRow('Normal gait', yesNo(emp.extegNormalGait))}
              ${kvRow('Normal strength', yesNo(emp.extegNormalStrength))}
              ${kvRow('Other extremities findings', emp.extegOthers || 'â€”')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">Other Pertinent Findings Upon Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Other pertinent findings', otherFindings)}
            </div>
          </div>
    `;

    const appendixScreeningHtml = `
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#7F77DD;"></div>
              <span class="panel-title">IX. Appendix A â€” Physical Examination Form</span>
            </div>
            <div class="panel-body">
              <div style="font-size:12px; font-weight:600; margin-bottom:0.75rem;">Physical Screening</div>
              ${kvRow('Height', emp.appendixHeight ? `${emp.appendixHeight} cm` : 'â€”')}
              ${kvRow('Weight', emp.appendixWeight ? `${emp.appendixWeight} kg` : 'â€”')}
              ${kvRow('Blood pressure', emp.appendixBP || 'â€”')}
              ${kvRow('Pulse rate', emp.appendixPulse || 'â€”')}
              ${kvRow('Respiration', emp.appendixRespiration || 'â€”')}
              ${kvRow('SpO2', emp.appendixSpO2 || 'â€”')}
              ${kvRow('BMI', emp.appendixBMI || 'â€”')}
              ${kvRow('BMI class', emp.appendixBMIClass || 'â€”')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#7F77DD;"></div>
              <span class="panel-title">Visual Acuity</span>
            </div>
            <div class="panel-body">
              ${kvRow('Vision corrected', yesNo(emp.appendixVisionCorrected))}
              ${kvRow('Vision uncorrected', yesNo(emp.appendixVisionUncorrected))}
              ${kvRow('Right vision (OD)', emp.appendixOD || 'â€”')}
              ${kvRow('Left vision (OS)', emp.appendixOS || 'â€”')}
              ${kvRow('Color vision', emp.appendixColorVision || 'â€”')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#7F77DD;"></div>
              <span class="panel-title">Physical Examination</span>
            </div>
            <div class="panel-body">
              ${kvRow('Skin', emp.appendixNormalSkin || 'â€”')}
              ${kvRow('Skin findings', emp.appendixFindingsSkin || 'â€”')}
              ${kvRow('Head / Neck / Scalp', emp.appendixNormalHead || 'â€”')}
              ${kvRow('Head findings', emp.appendixFindingsHead || 'â€”')}
              ${kvRow('Eyes (External)', emp.appendixNormalEyes || 'â€”')}
              ${kvRow('Eyes findings', emp.appendixFindingsEyes || 'â€”')}
              ${kvRow('Pupils', emp.appendixNormalPupils || 'â€”')}
              ${kvRow('Pupils findings', emp.appendixFindingsPupils || 'â€”')}
              ${kvRow('Ears / Nose / Sinuses', emp.appendixNormalEars || 'â€”')}
              ${kvRow('Ears / Nose / Sinuses findings', emp.appendixFindingsEars || 'â€”')}
              ${kvRow('Mouth / Throat', emp.appendixNormalMouth || 'â€”')}
              ${kvRow('Mouth findings', emp.appendixFindingsMouth || 'â€”')}
              ${kvRow('Neck / Lymph / Thyroid', emp.appendixNormalNeck || 'â€”')}
              ${kvRow('Neck findings', emp.appendixFindingsNeck || 'â€”')}
              ${kvRow('Chest / Breast / Axilla', emp.appendixNormalChest || 'â€”')}
              ${kvRow('Chest findings', emp.appendixFindingsChest || 'â€”')}
              ${kvRow('Lungs', emp.appendixNormalLungs || 'â€”')}
              ${kvRow('Lungs findings', emp.appendixFindingsLungs || 'â€”')}
              ${kvRow('Heart & Valvular', emp.appendixNormalHeart || 'â€”')}
              ${kvRow('Heart findings', emp.appendixFindingsHeart || 'â€”')}
              ${kvRow('Back & Abdomen', emp.appendixNormalBack || 'â€”')}
              ${kvRow('Back / Abdomen findings', emp.appendixFindingsBack || 'â€”')}
              ${kvRow('Genitalia', emp.appendixNormalGenitalia || 'â€”')}
              ${kvRow('Genitalia findings', emp.appendixFindingsGenitalia || 'â€”')}
              ${kvRow('Anus / Rectum', emp.appendixNormalAnus || 'â€”')}
              ${kvRow('Anus / Rectum findings', emp.appendixFindingsAnus || 'â€”')}
              ${kvRow('Extremities', emp.appendixNormalExtremities || 'â€”')}
              ${kvRow('Extremities findings', emp.appendixFindingsExtremities || 'â€”')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#7F77DD;"></div>
              <span class="panel-title">Ancillary Examinations</span>
            </div>
            <div class="panel-body">
              ${kvRow('Complete Blood Count', emp.appendixCBC || 'â€”')}
              ${kvRow('Fecalysis / Stool', emp.appendixStool || 'â€”')}
              ${kvRow('Pregnancy Test', emp.appendixPregnancyTest || 'â€”')}
              ${kvRow('Urinalysis', emp.appendixUrinalysis || 'â€”')}
              ${kvRow('Chest X-Ray', emp.appendixXray || 'â€”')}
              ${kvRow('Hep B (HBsAg)', emp.appendixHepB || 'â€”')}
              ${kvRow('Blood Type', emp.appendixBloodType || 'â€”')}
              ${kvRow('MMSE Score', emp.appendixMMSE || 'â€”')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#7F77DD;"></div>
              <span class="panel-title">Employee Classification</span>
            </div>
            <div class="panel-body">
              ${kvRow('Class A â€” FIT for any work', yesNo(emp.appendixClassA))}
              ${kvRow('Class B â€” Corrective defects', yesNo(emp.appendixClassB))}
              ${kvRow('Class C â€” Limited duty', yesNo(emp.appendixClassC))}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#7F77DD;"></div>
              <span class="panel-title">Evaluating Personnel Remarks</span>
            </div>
            <div class="panel-body">
              ${kvRow('Diagnosis', emp.appendixDiagnosis || 'â€”')}
              ${kvRow('Remarks', emp.appendixRemarks || 'â€”')}
              ${kvRow('School Nurse', emp.appendixSchoolNurse || 'â€”')}
              ${kvRow('Nurse License No.', emp.appendixSchoolNurseLicense || 'â€”')}
              ${kvRow('School Physician', emp.appendixPhysician || 'â€”')}
              ${kvRow('Physician License No.', emp.appendixPhysicianLicense || 'â€”')}
              ${kvRow('Date Filed', emp.appendixDateFiled || 'â€”')}
              ${kvRow('File No.', emp.appendixFileNo || 'â€”')}
              ${kvRow('Recorded By', emp.appendixRecordedBy || 'â€”')}
            </div>
          </div>
    `;

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${emp.name} â€” Medical Record</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
            <style>
              *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
              :root {
                --color-text-primary: #1a1a1a;
                --color-text-secondary: #6b6b6b;
                --color-text-tertiary: #9b9b9b;
                --color-background-primary: #ffffff;
                --color-background-secondary: #f7f6f3;
                --color-border-primary: rgba(0,0,0,0.4);
                --color-border-secondary: rgba(0,0,0,0.3);
                --color-border-tertiary: rgba(0,0,0,0.15);
                --border-radius-md: 8px;
                --border-radius-lg: 12px;
              }
              body {
                font-family: 'IBM Plex Sans', sans-serif;
                color: var(--color-text-primary);
                background: #f0ede8;
                padding: 2rem;
              }
              .doc {
                max-width: 780px;
                margin: 0 auto;
                background: #fff;
                border-radius: 16px;
                padding: 2.5rem 2rem;
                border: 0.5px solid rgba(0,0,0,0.12);
              }
              .top-bar {
                display: flex;
                justify-content: space-between;
                align-items: stretch;
                margin-bottom: 1.75rem;
                gap: 1rem;
              }
              .brand-name {
                font-family: 'Playfair Display', serif;
                font-size: 26px;
                font-weight: 400;
                letter-spacing: -0.5px;
                color: var(--color-text-primary);
                line-height: 1;
              }
              .brand-sub {
                font-size: 11px;
                letter-spacing: 0.12em;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                margin-top: 6px;
              }
              .record-stamp {
                text-align: right;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: flex-end;
              }
              .stamp-num { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
              .stamp-meta { font-size: 11px; color: var(--color-text-secondary); line-height: 1.9; text-align: right; }
              .confidential-pill {
                display: inline-block;
                background: #FCEBEB;
                color: #A32D2D;
                font-size: 10px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                font-weight: 500;
                padding: 3px 10px;
                border-radius: 999px;
                margin-top: 6px;
              }
              .divider { height: 1px; background: var(--color-border-primary); margin-bottom: 1.5rem; }
              .hero {
                display: grid;
                grid-template-columns: auto 1fr auto;
                gap: 1.25rem;
                align-items: center;
                padding: 1.25rem;
                background: var(--color-background-secondary);
                border-radius: var(--border-radius-lg);
                border: 0.5px solid var(--color-border-tertiary);
                margin-bottom: 1rem;
              }
              .avatar-ring {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #E1F5EE;
                border: 2px solid #1D9E75;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Playfair Display', serif;
                font-size: 20px;
                color: #085041;
                flex-shrink: 0;
              }
              .emp-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 400; line-height: 1.2; margin-bottom: 4px; }
              .emp-role { font-size: 12px; color: var(--color-text-secondary); line-height: 1.6; }
              .vitals-grid {
                display: grid;
                grid-template-columns: repeat(3, auto);
                border-left: 0.5px solid var(--color-border-secondary);
                padding-left: 1.25rem;
              }
              .vital { padding: 4px 12px; border-right: 0.5px solid var(--color-border-tertiary); text-align: center; }
              .vital:last-child { border-right: none; }
              .vital-label { font-size: 10px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; }
              .vital-val { font-size: 14px; font-weight: 500; margin-top: 2px; }
              .alert-strip {
                background: #FAEEDA;
                border: 0.5px solid #FAC775;
                border-radius: var(--border-radius-md);
                padding: 9px 14px;
                font-size: 12px;
                color: #633806;
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 1.5rem;
              }
              .alert-icon {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #EF9F27;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-size: 11px;
                color: #412402;
                font-weight: 500;
              }
              .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
              .panel {
                background: var(--color-background-primary);
                border: 0.5px solid var(--color-border-tertiary);
                border-radius: var(--border-radius-lg);
                overflow: hidden;
                margin-bottom: 1rem;
                page-break-inside: avoid;
                break-inside: avoid;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .panel-head {
                padding: 8px 14px;
                border-bottom: 0.5px solid var(--color-border-tertiary);
                display: flex;
                align-items: center;
                gap: 8px;
                background: var(--color-background-secondary);
              }
              .panel-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
              .panel-title {
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.09em;
                color: var(--color-text-secondary);
              }
              .panel-body { padding: 12px 14px; }
              .kv-row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                padding: 5px 0;
                border-bottom: 0.5px solid var(--color-border-tertiary);
                gap: 8px;
              }
              .kv-row:last-child { border-bottom: none; }
              .kv-key { font-size: 12px; color: var(--color-text-secondary); flex-shrink: 0; }
              .kv-val { font-size: 12px; font-weight: 500; text-align: right; }
              .pv-section-title {
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: var(--color-text-primary);
              }
              .pv-grid {
                display: grid;
                gap: 0.65rem 1rem;
                margin-top: 0.25rem;
              }
              .pv-grid.col1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
              .pv-grid.col2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              .pv-grid.col3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
              .pv-field {
                display: grid;
                gap: 0.15rem;
                padding: 0.8rem 0.9rem;
                border: 0.5px solid var(--color-border-primary);
                border-radius: 0.45rem;
                background: var(--color-background-secondary);
              }
              .pv-field-label {
                font-size: 11px;
                color: var(--color-text-secondary);
              }
              .pv-field-value {
                font-size: 12px;
                font-weight: 500;
                color: var(--color-text-primary);
              }
              .mini-table { width: 100%; border-collapse: collapse; }
              .mini-table th {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--color-text-secondary);
                font-weight: 500;
                padding: 0 0 6px;
                border-bottom: 0.5px solid var(--color-border-secondary);
                text-align: left;
              }
              .mini-table td {
                font-size: 12px;
                padding: 6px 0;
                border-bottom: 0.5px solid var(--color-border-tertiary);
              }
              .mini-table tr:last-child td { border-bottom: none; }
              .badge {
                display: inline-block;
                font-size: 10px;
                font-weight: 500;
                padding: 2px 7px;
                border-radius: 999px;
              }
              .badge-amber { background: #FAEEDA; color: #633806; }
              .sig-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                margin-top: 1.75rem;
                padding-top: 1rem;
                border-top: 0.5px solid var(--color-border-secondary);
              }
              .sig-line-draw { height: 36px; border-bottom: 0.5px solid var(--color-border-primary); }
              .sig-label { font-size: 11px; color: var(--color-text-secondary); margin-top: 5px; }
              .footer-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 1.5rem;
                padding-top: 0.75rem;
                border-top: 0.5px solid var(--color-border-tertiary);
                font-size: 10px;
                color: var(--color-text-tertiary);
              }
              @media print {
                body { background: white; padding: 0; }
                .doc { border: none; border-radius: 0; padding: 1.5rem; }
              }
            </style>
        </head>
        <body>
        <div class="doc">
          <div class="top-bar">
            <div>
              <div class="brand-name">NBSC Clinic</div>
              <div class="brand-sub">Employee Medical Information Record</div>
            </div>
            <div class="record-stamp">
              <div class="stamp-num">${emp.id}</div>
              <div class="stamp-meta">Date issued: ${currentDate.toLocaleDateString('en-PH')}<br>Next review: ${reviewDate.toLocaleDateString('en-PH')}</div>
              <span class="confidential-pill">Confidential</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="hero">
            <div class="avatar-ring">${initials}</div>
            <div>
              <div class="emp-name">${emp.name || 'N/A'}</div>
              <div class="emp-role">${emp.occupation || 'N/A'} &nbsp;Â·&nbsp; Classification: ${(emp.class || '').replace('Class ', '')}<br>${emp.id} &nbsp;Â·&nbsp; Contact: ${emp.contact || 'N/A'}</div>
            </div>
            <div class="vitals-grid">
              <div class="vital"><div class="vital-label">DOB</div><div class="vital-val">${emp.birthday ? new Date(emp.birthday).toLocaleDateString('en-PH') : 'N/A'}</div></div>
              <div class="vital"><div class="vital-label">Age</div><div class="vital-val">${emp.age || 'N/A'}</div></div>
              <div class="vital"><div class="vital-label">Gender</div><div class="vital-val">${emp.gender || 'N/A'}</div></div>
            </div>
          </div>
          ${emp.condition && emp.condition !== 'None' ? `<div class="alert-strip"><div class="alert-icon">!</div><span>Medical Alert â€” ${emp.condition}. Inform all medical personnel before any treatment or procedure.</span></div>` : ''}
          <div class="grid-2">
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#378ADD;"></div>
                <span class="panel-title">I. Personal Details</span>
              </div>
              <div class="panel-body">
                <div class="kv-row"><span class="kv-key">Gender</span><span class="kv-val">${emp.gender || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Civil Status</span><span class="kv-val">${emp.civilStatus || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Religion</span><span class="kv-val">${emp.religion || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Mobile</span><span class="kv-val">${emp.contact || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Address</span><span class="kv-val">${emp.address || 'â€”'}</span></div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#D4537E;"></div>
                <span class="panel-title">II. Emergency Contact</span>
              </div>
              <div class="panel-body">
                <div class="kv-row"><span class="kv-key">Name</span><span class="kv-val">${emp.emergencyName || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Relationship</span><span class="kv-val">${emp.emergencyRelationship || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Mobile</span><span class="kv-val">${emp.emergencyContact || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Address</span><span class="kv-val">${emp.emergencyAddress || 'â€”'}</span></div>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#EF9F27;"></div>
              <span class="panel-title">III. Personal / Social History</span>
            </div>
            <div class="panel-body">
              <table class="mini-table">
                <tbody>${personalHistoryHtml}</tbody>
              </table>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#EF9F27;"></div>
              <span class="panel-title">IV. Past Medical History</span>
            </div>
            <div class="panel-body">
              <table class="mini-table">
                <thead><tr><th>Condition</th></tr></thead>
                <tbody>${medConditionsHtml}</tbody>
              </table>
            </div>
          </div>
          <div class="grid-2">
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#D4537E;"></div>
                <span class="panel-title">V. Hospital Admissions</span>
              </div>
              <div class="panel-body">
                <table class="mini-table">
                  <tbody>${hospitalHtml}</tbody>
                </table>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#D4537E;"></div>
                <span class="panel-title">V. Surgical History</span>
              </div>
              <div class="panel-body">
                <table class="mini-table">
                  <tbody>${surgeryHtml}</tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#1D9E75;"></div>
              <span class="panel-title">V. Disability &amp; OB-GYNE</span>
            </div>
            <div class="panel-body">
              <div class="kv-row"><span class="kv-key">Disability</span><span class="kv-val">${emp.disabilitySpecify || 'â€”'}</span></div>
              <div class="kv-row"><span class="kv-key">Registered</span><span class="kv-val">${emp.disabilityRegistered || 'â€”'}</span></div>
              <div class="kv-row"><span class="kv-key">Donate Blood</span><span class="kv-val">${emp.donateBlood || 'â€”'}</span></div>
              <div class="kv-row"><span class="kv-key">OB-GYNE Notes</span><span class="kv-val">${obGynNotes}</span></div>
            </div>
          </div>
          <div class="grid-2">
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#5DCAA5;"></div>
                <span class="panel-title">VI. Family History</span>
              </div>
              <div class="panel-body">
                <div class="kv-row"><span class="kv-key">Mother's Side</span><span class="kv-val">${emp.familyHistoryMother || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Father's Side</span><span class="kv-val">${emp.familyHistoryFather || 'â€”'}</span></div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#7F77DD;"></div>
                <span class="panel-title">VI. Immunizations</span>
              </div>
              <div class="panel-body">
                <table class="mini-table">
                  <tbody>${immunizationsHtml}</tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#378ADD;"></div>
              <span class="panel-title">VII. Maintenance Medication & OB-GYNE</span>
            </div>
            <div class="panel-body">
              <div class="kv-row"><span class="kv-key">Medication</span><span class="kv-val">${mainMedication}</span></div>
              <div class="kv-row"><span class="kv-key">OB/GYNE Notes</span><span class="kv-val">${obGynNotes}</span></div>
              <div class="kv-row"><span class="kv-key">Pregnancy History</span><span class="kv-val">${pregnancyHistory}</span></div>
              <div class="kv-row"><span class="kv-key">Pregnant Now</span><span class="kv-val">${pregnancyStatus}</span></div>
              <div class="kv-row"><span class="kv-key">Family Planning</span><span class="kv-val">${familyPlanning}</span></div>
              <div class="kv-row"><span class="kv-key">Other Findings</span><span class="kv-val">${physicalNotes}</span></div>
            </div>
          </div>
          ${headToToeHtml}
          ${appendixScreeningHtml}
          <div class="sig-section">
            <div>
              <div class="sig-line-draw"></div>
              <div class="sig-label">Examining Physician &nbsp;/&nbsp; Date &nbsp;/&nbsp; License no.</div>
            </div>
            <div>
              <div class="sig-line-draw"></div>
              <div class="sig-label">HR Officer &nbsp;/&nbsp; Date</div>
            </div>
          </div>
          <div class="footer-bar">
            <span>This document is strictly confidential. Unauthorized disclosure is prohibited.</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
        </body>
        </html>`;
    try {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            if (printWindow && !printWindow.closed) {
                printWindow.print();
            }
        }, 250);
    } catch (err) {
        console.error('Export error:', err);
        showToast('âŒ Error exporting profile. Please try again.', 'red');
        printWindow.close();
    }
}

function exportEmployeeConsultations(emp, consultIndex) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('âŒ Popup blocked! Please allow popups for this site.', 'red');
        return;
    }
    const initials = (emp.name || ' ').split(',').map(s => s.trim()[0]).join('').slice(0, 2).toUpperCase();
    const currentDate = new Date();

    let consultationsData = (emp.consultations || []);
    if (consultIndex !== undefined && consultIndex !== null && consultIndex !== '' && String(consultIndex) !== '-1') {
        const index = Number(consultIndex);
        if (!Number.isNaN(index) && index >= 0 && index < consultationsData.length) {
            consultationsData = [consultationsData[index]];
        }
    }
    const consultationsHtml = consultationsData.length > 0
        ? consultationsData.map(c => `
            <div class="panel" style="margin-bottom:1rem; page-break-inside: avoid; break-inside: avoid;">
              <div class="panel-head">
                <div class="panel-dot" style="background:#5DCAA5;"></div>
                <span class="panel-title">Consultation â€” ${c.date || 'N/A'} @ ${c.time || 'N/A'}</span>
              </div>
              <div class="panel-body">
                <div class="kv-row"><span class="kv-key">Date</span><span class="kv-val">${c.date || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Time</span><span class="kv-val">${c.time || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Type</span><span class="kv-val">${c.consultType || c.type || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Blood Pressure</span><span class="kv-val">${c.bp || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Heart Rate</span><span class="kv-val">${c.hr || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Respiratory Rate</span><span class="kv-val">${c.rr || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Temperature</span><span class="kv-val">${c.temp || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Height</span><span class="kv-val">${c.height || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Weight</span><span class="kv-val">${c.weight || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Chief Complaint</span><span class="kv-val">${c.chiefComplaint || 'â€”'}</span></div>
                <div class="kv-row"><span class="kv-key">Treatment/Plan</span><span class="kv-val">${c.plan || 'â€”'}</span></div>
              </div>
            </div>`).join('')
        : `<div class="panel" style="margin-bottom:1rem;"><div class="panel-body"><p style="color:#666; text-align:center;">No consultations recorded.</p></div></div>`;

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${emp.name} â€” Consultation Record</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
            <style>
              *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
              :root {
                --color-text-primary: #1a1a1a;
                --color-text-secondary: #6b6b6b;
                --color-text-tertiary: #9b9b9b;
                --color-background-primary: #ffffff;
                --color-background-secondary: #f7f6f3;
                --color-border-primary: rgba(0,0,0,0.4);
                --color-border-secondary: rgba(0,0,0,0.3);
                --color-border-tertiary: rgba(0,0,0,0.15);
                --border-radius-md: 8px;
                --border-radius-lg: 12px;
              }
              body {
                font-family: 'IBM Plex Sans', sans-serif;
                color: var(--color-text-primary);
                background: #f0ede8;
                padding: 2rem;
              }
              .doc {
                max-width: 780px;
                margin: 0 auto;
                background: #fff;
                border-radius: 16px;
                padding: 2.5rem 2rem;
                border: 0.5px solid rgba(0,0,0,0.12);
              }
              .top-bar {
                display: flex;
                justify-content: space-between;
                align-items: stretch;
                margin-bottom: 1.75rem;
                gap: 1rem;
              }
              .brand-name {
                font-family: 'Playfair Display', serif;
                font-size: 26px;
                font-weight: 400;
                letter-spacing: -0.5px;
                color: var(--color-text-primary);
                line-height: 1;
              }
              .brand-sub {
                font-size: 11px;
                letter-spacing: 0.12em;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                margin-top: 6px;
              }
              .record-stamp {
                text-align: right;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: flex-end;
              }
              .stamp-num { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
              .stamp-meta { font-size: 11px; color: var(--color-text-secondary); line-height: 1.9; text-align: right; }
              .confidential-pill {
                display: inline-block;
                background: #FCEBEB;
                color: #A32D2D;
                font-size: 10px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                font-weight: 500;
                padding: 3px 10px;
                border-radius: 999px;
                margin-top: 6px;
              }
              .divider { height: 1px; background: var(--color-border-primary); margin-bottom: 1.5rem; }
              .hero {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 1.25rem;
                align-items: center;
                padding: 1.25rem;
                background: var(--color-background-secondary);
                border-radius: var(--border-radius-lg);
                border: 0.5px solid var(--color-border-tertiary);
                margin-bottom: 1rem;
              }
              .avatar-ring {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #E1F5EE;
                border: 2px solid #1D9E75;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Playfair Display', serif;
                font-size: 20px;
                color: #085041;
                flex-shrink: 0;
              }
              .emp-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 400; line-height: 1.2; margin-bottom: 4px; }
              .emp-role { font-size: 12px; color: var(--color-text-secondary); line-height: 1.6; }
              .panel {
                background: var(--color-background-primary);
                border: 0.5px solid var(--color-border-tertiary);
                border-radius: var(--border-radius-lg);
                overflow: hidden;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .panel-head {
                padding: 8px 14px;
                border-bottom: 0.5px solid var(--color-border-tertiary);
                display: flex;
                align-items: center;
                gap: 8px;
                background: var(--color-background-secondary);
              }
              .panel-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
              .panel-title {
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.09em;
                color: var(--color-text-secondary);
              }
              .panel-body { padding: 12px 14px; }
              .kv-row {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                padding: 5px 0;
                border-bottom: 0.5px solid var(--color-border-tertiary);
                gap: 8px;
              }
              .kv-row:last-child { border-bottom: none; }
              .kv-key { font-size: 12px; color: var(--color-text-secondary); flex-shrink: 0; }
              .kv-val { font-size: 12px; font-weight: 500; text-align: right; }
              .sig-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                margin-top: 1.75rem;
                padding-top: 1rem;
                border-top: 0.5px solid var(--color-border-secondary);
              }
              .sig-line-draw { height: 36px; border-bottom: 0.5px solid var(--color-border-primary); }
              .sig-label { font-size: 11px; color: var(--color-text-secondary); margin-top: 5px; }
              .footer-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 1.5rem;
                padding-top: 0.75rem;
                border-top: 0.5px solid var(--color-border-tertiary);
                font-size: 10px;
                color: var(--color-text-tertiary);
              }
              @media print {
                body { background: white; padding: 0; }
                .doc { border: none; border-radius: 0; padding: 1.5rem; }
              }
            </style>
        </head>
        <body>
        <div class="doc">
          <div class="top-bar">
            <div>
              <div class="brand-name">NBSC Clinic</div>
              <div class="brand-sub">Consultation Record</div>
            </div>
            <div class="record-stamp">
              <div class="stamp-num">${emp.id}</div>
              <div class="stamp-meta">Exported: ${currentDate.toLocaleDateString('en-PH')}</div>
              <span class="confidential-pill">Confidential</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="hero">
            <div class="avatar-ring">${initials}</div>
            <div>
              <div class="emp-name">${emp.name || 'N/A'}</div>
              <div class="emp-role">${emp.occupation || 'N/A'} &nbsp;Â·&nbsp; ${emp.id}<br>Contact: ${emp.contact || 'N/A'}</div>
            </div>
          </div>
          <div>
            ${consultationsHtml}
          </div>
          <div class="sig-section">
            <div>
              <div class="sig-line-draw"></div>
              <div class="sig-label">Attending Physician &nbsp;/&nbsp; Date &nbsp;/&nbsp; License no.</div>
            </div>
            <div>
              <div class="sig-line-draw"></div>
              <div class="sig-label">HR Officer &nbsp;/&nbsp; Date</div>
            </div>
          </div>
          <div class="footer-bar">
            <span>This document is strictly confidential. Unauthorized disclosure is prohibited.</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
        </body>
        </html>`;
    try {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            if (printWindow && !printWindow.closed) {
                printWindow.print();
            }
        }, 250);
    } catch (err) {
        console.error('Export error:', err);
        showToast('âŒ Error exporting consultation. Please try again.', 'red');
        printWindow.close();
    }
}

function exportSelectedEmployee() {
    const selectedId = exportEmployeeIdInput.value;
    const exportType = exportTypeSelect.value;
    if (!selectedId) {
        alert('Please select an employee before exporting.');
        return;
    }
    const emp = employees.find(e => e.id === selectedId);
    if (!emp) {
        alert('Selected employee not found.');
        return;
    }
    if (exportType === 'consultation') {
        const selectedConsultIndex = exportConsultDateSelect.value;
        if (selectedConsultIndex === '') {
            alert('Please select a consultation date before exporting.');
            return;
        }
        exportEmployeeConsultations(emp, selectedConsultIndex);
    } else {
        exportEmployeeProfile(emp);
    }
    closeExportModal();
}

function openExportModal() {
    populateExportEmployeeOptions();
    exportTypeSelect.value = 'profile';
    exportConsultDateSelect.value = '';
    toggleExportConsultationDateGroup();
    exportModal.style.display = 'flex';
}

function closeExportModal() {
    exportModal.style.display = 'none';
}

// Export event handlers will be set up in DOMContentLoaded





// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    // Clear all persisted clinic data so the app starts at zero employees
    try {
        const db = await dbPromise;
        const tx = db.transaction(['employees', 'consultations', 'appointments', 'medications'], 'readwrite');
        await Promise.all([
            tx.objectStore('employees').clear(),
            tx.objectStore('consultations').clear(),
            tx.objectStore('appointments').clear(),
            tx.objectStore('medications').clear()
        ]);
        await tx.done;
    } catch (err) {
        console.warn('Could not clear persisted clinic data', err);
    }

    localStorage.removeItem('employees');
    localStorage.removeItem('consultations');
    
    // Load data from IndexedDB
    employees = await loadEmployees();
    consultations = await loadConsultations();
    appointments = await loadAppointments();
    medications = await loadMedications();
    
    // Log app startup
    if (typeof AuditLog !== 'undefined') {
        await AuditLog.log('APP_START', { timestamp: new Date().toISOString() });
    }

    // Initialize export variables now that DOM is ready
    exportBtn = document.getElementById('exportBtn') || document.getElementById('quickExportBtn');
    exportModal = document.getElementById('exportModal');
    closeExportModalBtn = document.getElementById('closeExportModal');
    cancelExportBtn = document.getElementById('cancelExportBtn');
    confirmExportBtn = document.getElementById('confirmExportBtn');
    exportEmployeeSearch = document.getElementById('exportEmployeeSearch');
    exportEmployeeList = document.getElementById('exportEmployeeList');
    exportEmployeeResults = document.getElementById('exportEmployeeResults');
    exportEmployeeIdInput = document.getElementById('exportEmployeeId');
    exportTypeSelect = document.getElementById('exportTypeSelect');
    exportConsultDateSelect = document.getElementById('exportConsultDateSelect');
    exportConsultationDateGroup = document.getElementById('exportConsultationDateGroup');

    // Migration: Connect existing employees to sample offices/categories if missing
    let modified = false;
    employees.forEach(emp => {
        if (!emp.category) {
            emp.category = ['Regular', 'Job Order', 'Contract of Service'][Math.floor(Math.random() * 3)];
            modified = true;
        }
        if (!emp.office) {
            const sampleOffices = [
                'Office of the College President',
                'Human Resource Management and Development Office',
                'Legal Office',
                'Health Services Office',
                'Registar and Record Office',
                'Institute for Teacher Education',
                'Institute for Computer Studies',
                'Institute for Business Management'
            ];
            emp.office = sampleOffices[Math.floor(Math.random() * sampleOffices.length)];
            modified = true;
        }
    });
    if (modified) await saveEmployees();

    populateOfficeFilter();

    // Explicitly reset filters to 'All' to show everyone on load
    if (officeFilter) officeFilter.value = 'All';
    selectedCategoryFilter = 'All';
    if (searchInput) searchInput.value = '';
    
    filteredEmployees = employees;
    filterData();
    updateStats();
    attachCardInteractions();
    if (typeof populateConsultEmployeeOptions === 'function') {
        populateConsultEmployeeOptions();
    }
    if (typeof populateRxEmployeeOptions === 'function') {
        populateRxEmployeeOptions();
    }
    showStep(0);
    window.dispatchEvent(new Event('dataUpdated'));

    if (searchInput) searchInput.addEventListener('input', filterData);
    if (officeFilter) officeFilter.addEventListener('change', filterData);

    // Setup export event handlers
    if (exportBtn) exportBtn.onclick = openExportModal;
    if (closeExportModalBtn) closeExportModalBtn.onclick = closeExportModal;
    if (cancelExportBtn) cancelExportBtn.onclick = closeExportModal;
    if (confirmExportBtn) confirmExportBtn.onclick = exportSelectedEmployee;

    if (exportTypeSelect) {
        exportTypeSelect.onchange = () => {
            toggleExportConsultationDateGroup();
        };
    }

    if (exportEmployeeSearch) {
        exportEmployeeSearch.addEventListener('input', updateExportEmployeeSearch);
        exportEmployeeSearch.addEventListener('blur', () => {
            const employeeId = getExportEmployeeIdFromInput();
            exportEmployeeIdInput.value = employeeId;
            updateExportConsultationDates();
        });
    }

    if (exportEmployeeResults) {
        exportEmployeeResults.addEventListener('click', (event) => {
            const item = event.target.closest('.search-result-item');
            if (!item || !item.dataset.id) return;
            selectExportEmployeeResult(item.dataset.id, item.textContent.trim());
        });
    }

    if (exportModal) {
        exportModal.addEventListener('click', (event) => {
            if (event.target === exportModal) {
                closeExportModal();
            }
        });
    }

    // Add event listeners for prescription medicine inputs to update preview
    for (let i = 1; i <= 3; i++) {
        const nameInput = document.getElementById(`rxMedName${i}`);
        const detailsInput = document.getElementById(`rxMedDetails${i}`);
        const prescribedOnInput = document.getElementById('rxPrescribedOn');
        const noteInput = document.getElementById('rxNote');
        
        if (nameInput) nameInput.addEventListener('input', renderPrescriptionPreview);
        if (detailsInput) detailsInput.addEventListener('input', renderPrescriptionPreview);
    }
    if (document.getElementById('rxPrescribedOn')) {
        document.getElementById('rxPrescribedOn').addEventListener('change', renderPrescriptionPreview);
    }
    if (document.getElementById('rxNote')) {
        document.getElementById('rxNote').addEventListener('input', renderPrescriptionPreview);
    }
});

