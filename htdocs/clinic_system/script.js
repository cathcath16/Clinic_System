const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const occupationFilter = document.getElementById("occupationFilter");
const addModal = document.getElementById("addModal");
const addNewBtn = document.getElementById("addNewBtn");
const addForm = document.getElementById("addForm");

function generateSampleEmployees(count = 200) {
    const lastNames  = ['Aguirre','Bautista','Cruz','Dela Cruz','Enriquez','Flores','Garcia','Herrera','Ibarra','Jimenez','Lopez','Martinez','Nunez','Ortega','Perez','Quinto','Reyes','Santos','Torres','Urbano','Velasco','Wang','Xavier','Yap','Zamora'];
    const firstNames = ['Aaron','Bea','Carlos','Diana','Ethan','Faith','Gabriel','Hannah','Ian','Jade','Kevin','Liam','Mia','Noah','Olivia','Paul','Quinn','Rafael','Sara','Tina','Victor','Wendy','Xena','Yvonne','Zane'];
    const middleNames = ['A.','B.','C.','D.','E.','F.','G.','H.','I.','J.','K.','L.','M.','N.','O.','P.','Q.','R.','S.','T.'];
    const occupations = ['Teacher','Clerk','Security Guard','Nurse','Janitor','Cashier','Counselor','Librarian','Coach','Secretary'];
    const religions   = ['Catholic','Christian','Iglesia','Islam','None'];
    const civilStatuses = ['Single','Married','Separated','Widow/Widower'];
    const classes     = ['Class A','Class B','Class C'];
    const genders     = ['Male','Female'];
    const conditions  = ['None', 'Asthma', 'Hypertension', 'Diabetes Mellitus', 'None', 'Allergy'];
    const sample = [];
    for (let i = 1; i <= count; i++) {
        const last   = lastNames[(i - 1) % lastNames.length];
        const first  = firstNames[(i - 1) % firstNames.length];
        const middle = middleNames[(i - 1) % middleNames.length];
        const gender = genders[i % genders.length];
        const classType = classes[i % classes.length];
        const year  = 1965 + (i % 35);
        const month = String((i % 12) + 1).padStart(2, '0');
        const day   = String((i % 27) + 1).padStart(2, '0');
        sample.push({
            id: `EMP-${String(i).padStart(4, '0')}`,
            name: `${last}, ${first} ${middle}`,
            birthday: `${year}-${month}-${day}`,
            contact: `+63 9${String(100000000 + i).slice(1)}`,
            religion: religions[i % religions.length],
            gender, age: 22 + (i % 36),
            occupation: occupations[i % occupations.length],
            civilStatus: civilStatuses[i % civilStatuses.length],
            class: classType,
            condition: conditions[i % conditions.length],
            address: `Sample St., Brgy. ${((i % 50) + 1)}, City`,
            emergencyName: `${first} Emergency`,
            emergencyRelationship: civilStatuses[i % civilStatuses.length],
            emergencyAddress: `Sample St., Brgy. ${(i % 50) + 1}, City`,
            emergencyContact: `+63 9${String(200000000 + i).slice(1)}`,
            smoking: 'No', alcohol: 'No', drugs: 'No', consultations: []
        });
    }
    return sample;
}

function loadEmployees() {
    try {
        const ds = localStorage.getItem('employees');
        if (ds) { const p = JSON.parse(ds); if (Array.isArray(p) && p.length) return p; }
    } catch (err) { console.warn('Failed to load employees', err); }
    return generateSampleEmployees(200);
}
function saveEmployees() { localStorage.setItem('employees', JSON.stringify(employees)); }
function loadConsultations() {
    try { const ds = localStorage.getItem('consultations'); if (ds) return JSON.parse(ds); }
    catch (err) { console.warn('Failed to load consultations', err); }
    return [];
}
function saveConsultations() { localStorage.setItem('consultations', JSON.stringify(consultations)); }

let employees     = loadEmployees();
let consultations = loadConsultations();
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
    const total = data.length;
    const startIndex = (currentPage - 1) * pageSize;
    const pageData = data.slice(startIndex, startIndex + pageSize);

    tableBody.innerHTML = '';
    if (!data.length) {
        tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#aaa;padding:30px;">No records found.</td></tr>';
        document.getElementById('paginationInfo').innerText = 'No records found.';
        document.getElementById('paginationPages').innerHTML = '';
        return;
    }

    pageData.forEach(emp => {
        const classStyle = (emp.class || '').replace(' ', '');
        tableBody.innerHTML += `
            <tr>
                <td style="color:#1f3a6d;font-weight:bold;">${emp.id}</td>
                <td><strong>${emp.name}</strong></td>
                <td>${emp.birthday || ''}</td>
                <td>${emp.contact || ''}</td>
                <td>${emp.religion || ''}</td>
                <td><span class="gender-tag ${emp.gender}">${emp.gender}</span></td>
                <td>${emp.age}</td>
                <td>${emp.occupation || ''}</td>
                <td>${emp.civilStatus || ''}</td>
                <td><span class="class-tag ${classStyle}">${(emp.class || '').replace('Class ', '')}</span></td>
                <td>${emp.condition || 'None'}</td>
                <td>
                    <button class="action-btn edit-btn"   onclick="editEmployee('${emp.id}')">Edit</button>
                    <button class="action-btn view-btn"   onclick="viewEmployee('${emp.id}')">View</button>
                    <button class="action-btn delete-btn" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            </tr>`;
    });

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
    paginationInfo.innerText = `Showing ${start}–${end} of ${totalItems}`;

    let pagesHtml = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">← Prev</button>`;
    for (let page = 1; page <= totalPages; page += 1) {
        pagesHtml += `<button class="page-btn ${page === currentPage ? 'active' : ''}" onclick="changePage(${page})">${page}</button>`;
    }
    pagesHtml += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next →</button>`;
    paginationPages.innerHTML = pagesHtml;
}

function changePage(page) {
    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable(filteredEmployees);
}

function populateOccupationFilter() {
    const occupationSet = new Set(employees.map(emp => emp.occupation).filter(Boolean));
    const occupations = [...occupationSet].sort();
    occupationFilter.innerHTML = '<option value="All">Sort by</option>' +
        occupations.map(occ => `<option value="${occ}">${occ}</option>`).join('');
}

function filterData() {
    const text   = searchInput.value.toLowerCase();
    const filter = occupationFilter.value;
    filteredEmployees = sortEmployeesByName(employees.filter(emp => {
        const matchesText = [emp.name, emp.id, emp.contact, emp.religion, emp.occupation, emp.civilStatus]
            .some(v => (v || '').toLowerCase().includes(text));
        const matchesOccupation = filter === 'All' || emp.occupation === filter;
        return matchesText && matchesOccupation;
    }));
    currentPage = 1;
    renderTable(filteredEmployees);
}

function updateStats() {
    const classAList = employees.filter(e => e.class === 'Class A');
    const classBList = employees.filter(e => e.class === 'Class B');
    const classCList = employees.filter(e => e.class === 'Class C');
    document.getElementById('count-total').innerText = employees.length;
    document.getElementById('count-a').innerText     = classAList.length;
    document.getElementById('count-b').innerText     = classBList.length;
    document.getElementById('count-c').innerText     = classCList.length;
    document.getElementById('total-count').innerText = employees.length;
    document.getElementById('names-a').innerText = classAList.slice(0,5).map(e => e.name).join(', ') + (classAList.length > 5 ? '...' : '') || 'No records';
    document.getElementById('names-b').innerText = classBList.slice(0,5).map(e => e.name).join(', ') + (classBList.length > 5 ? '...' : '') || 'No records';
    document.getElementById('names-c').innerText = classCList.slice(0,5).map(e => e.name).join(', ') + (classCList.length > 5 ? '...' : '') || 'No records';
}

let lastDeleted   = null;
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
document.getElementById('undoBtn').onclick = () => {
    if (!lastDeleted) return;
    employees.splice(lastDeleted.index, 0, lastDeleted.record);
    normalizeEmployeeIds();
    saveEmployees(); renderTable(employees); updateStats(); populateConsultEmployeeOptions(); hideUndoBar();
};

function deleteEmployee(id) {
    if (!confirm('Delete this employee record?')) return;
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) return;
    lastDeleted = { record: employees[index], index };
    employees.splice(index, 1);
    normalizeEmployeeIds();
    saveEmployees();
    saveConsultations();
    renderTable(employees);
    updateStats();
    populateConsultEmployeeOptions();
    showUndoBar();
}

let currentStep = 0;
const steps     = document.querySelectorAll('.step');
const prevBtn   = document.getElementById('prevBtn');
const nextBtn   = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');

function showStep(n) {
    steps.forEach((step, i) => step.classList.toggle('active', i === n));
    prevBtn.style.display   = n === 0 ? 'none' : 'inline-block';
    nextBtn.style.display   = n === steps.length - 1 ? 'none' : 'inline-block';
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
let editId     = null;

function openModalForNew() {
    isEditMode = false; editId = null;
    addForm.reset(); setNewEmployeeId(); submitBtn.innerText = 'Save Health Profile';
    currentStep = 0; showStep(0); addModal.style.display = 'block';
}
function closeModal() { addModal.style.display = 'none'; }
addNewBtn.onclick = openModalForNew;
document.querySelector('#addModal .close').onclick = closeModal;

function setFormValues(emp) {
    sv('newId', emp.id); sv('newName', emp.name); sv('newBday', emp.birthday);
    sv('newAge', emp.age); sv('newGender', emp.gender); sv('newContact', emp.contact);
    sv('newReligion', emp.religion); sv('newOccupation', emp.occupation);
    sv('newCivilStatus', emp.civilStatus); sv('newClass', emp.class || 'Class A');
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
    submitBtn.innerText = 'Update Health Profile';
    currentStep = 0; showStep(0); addModal.style.display = 'block';
}

function collectFormValues(existingEmp) {
    return {
        consultations: existingEmp ? (existingEmp.consultations || []) : [],
        id: gv('newId'), name: gv('newName'), birthday: gv('newBday'),
        age: gv('newAge'), gender: gv('newGender'), contact: gv('newContact'),
        religion: gv('newReligion'), occupation: gv('newOccupation'),
        civilStatus: gv('newCivilStatus'), class: gv('newClass') || 'Class A',
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

addForm.onsubmit = (e) => {
    e.preventDefault();
    const idVal = gv('newId').trim(), nameVal = gv('newName').trim(), ageVal = gv('newAge').trim();
    if (!idVal || !nameVal || !ageVal) {
        alert('Please fill in the required fields: Employee ID, Full Name, and Age.');
        currentStep = 0; showStep(0); return;
    }
    if (!isEditMode) {
        const dup = employees.find(e => e.id === idVal);
        if (dup) {
            alert(`Employee ID "${idVal}" already exists.`);
            currentStep = 0; showStep(0); document.getElementById('newId').focus(); return;
        }
    }
    const existingEmp = isEditMode ? employees.find(e => e.id === editId) : null;
    const newEmp = collectFormValues(existingEmp);
    if (isEditMode && editId) {
        const index = employees.findIndex(e => e.id === editId);
        if (index !== -1) employees[index] = newEmp; else employees.unshift(newEmp);
        showToast('Health profile updated successfully!', 'green');
    } else {
        employees.unshift(newEmp);
        normalizeEmployeeIds();
        showToast('Health profile saved successfully!', 'green');
    }
    saveEmployees(); renderTable(employees); updateStats(); populateConsultEmployeeOptions(); closeModal();
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

// ─────────────────────────────────────────
// SHARED PROFILE STYLES (injected once per view render)
// ─────────────────────────────────────────
const PROFILE_CSS = `<style>
.pv-wrap{font-family:'Segoe UI',sans-serif;color:#1f3a6d;padding:4px 0 20px;}
.pv-header{display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #1f3a6d;}
.pv-avatar{width:54px;height:54px;border-radius:50%;background:#dce8f8;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#1f3a6d;flex-shrink:0;}
.pv-hname{font-size:1.25rem;font-weight:700;color:#1f3a6d;margin:0 0 2px;}
.pv-hid{font-size:0.8rem;color:#6b82a8;margin:0;}
.pv-hclass{margin-left:auto;font-size:0.75rem;font-weight:700;padding:5px 14px;border-radius:20px;white-space:nowrap;}
.pv-hclass.A{background:#e8f5e9;color:#2e7d32;}
.pv-hclass.B{background:#fff3e0;color:#e65100;}
.pv-hclass.C{background:#ffebee;color:#c62828;}
.pv-section{margin-bottom:28px;}
.pv-section-title{font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1f3a6d;border-bottom:2px solid #1f3a6d;padding-bottom:6px;margin-bottom:16px;}
.pv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0 14px;}
.pv-grid.col2{grid-template-columns:repeat(2,1fr);}
.pv-grid.col1{grid-template-columns:1fr;}
.pv-field{border-left:3px solid #dce8f8;padding:9px 12px;margin-bottom:10px;border-radius:0 5px 5px 0;background:#f7faff;}
.pv-field.span2{grid-column:span 2;}
.pv-field.span3{grid-column:span 3;}
.pv-label{font-size:0.65rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#6b82a8;margin:0 0 3px;}
.pv-value{font-size:0.87rem;font-weight:500;color:#1f3a6d;margin:0;word-break:break-word;}
.pv-value.empty{color:#b8c8dd;font-style:italic;font-weight:400;}
.pv-value.yes{color:#2e7d32;}
.pv-value.no{color:#b8c8dd;font-weight:400;}
.pv-subsection{font-size:0.68rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#6b82a8;margin:18px 0 8px;padding-bottom:4px;border-bottom:1px solid #e0eaf5;}
.pv-cbgroup{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.pv-cbtag{font-size:0.74rem;padding:3px 11px;border-radius:20px;font-weight:600;background:#e8f5e9;color:#2e7d32;}
.pv-empty-note{font-size:0.84rem;color:#b8c8dd;margin:0 0 12px;}
.pv-flags{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:4px;}
.pv-flag{font-size:0.74rem;padding:3px 12px;border-radius:20px;font-weight:600;}
.pv-flag.warn{background:#fff3e0;color:#e65100;}
.pv-flag.danger{background:#ffebee;color:#c62828;}
.pv-flag.info{background:#e3f2fd;color:#1565c0;}
.pv-consult-row{border-left:3px solid #dce8f8;background:#f7faff;padding:10px 14px;border-radius:0 6px 6px 0;margin-bottom:8px;cursor:pointer;width:100%;text-align:left;border-top:none;border-right:none;border-bottom:none;font-family:inherit;}
.pv-consult-row:hover{background:#eaf0fb;border-left-color:#1f3a6d;}
.pv-consult-date{font-size:0.75rem;color:#6b82a8;margin:0 0 2px;}
.pv-consult-complaint{font-size:0.87rem;color:#1f3a6d;font-weight:500;margin:0;}
.pv-vitals-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;}
.pv-vital{background:#edf3ff;border-radius:7px;padding:10px 12px;text-align:center;}
.pv-vital-label{font-size:0.63rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#6b82a8;margin:0 0 4px;}
.pv-vital-val{font-size:1.05rem;font-weight:700;color:#1f3a6d;margin:0;}
.pv-class-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.pv-class-pill{font-size:0.8rem;padding:5px 16px;border-radius:20px;font-weight:600;}
.pv-class-pill.on-A{background:#e8f5e9;color:#2e7d32;}
.pv-class-pill.on-B{background:#fff3e0;color:#e65100;}
.pv-class-pill.on-C{background:#ffebee;color:#c62828;}
.pv-class-pill.off{background:#f3f5f7;color:#b8c8dd;}
</style>`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function pvField(label, value, spanClass) {
    const hasVal = value !== null && value !== undefined && String(value).trim() !== '';
    const span   = spanClass ? ` ${spanClass}` : '';
    return `<div class="pv-field${span}">
        <p class="pv-label">${label}</p>
        <p class="pv-value${hasVal ? '' : ' empty'}">${hasVal ? value : '—'}</p>
    </div>`;
}
function pvCbField(label, value, spanClass) {
    const on = !!value;
    const span = spanClass ? ` ${spanClass}` : '';
    return `<div class="pv-field${span}">
        <p class="pv-label">${label}</p>
        <p class="pv-value ${on ? 'yes' : 'no'}">${on ? '✓ Yes' : '✗ No'}</p>
    </div>`;
}
function pvSection(title, html) {
    return `<div class="pv-section"><p class="pv-section-title">${title}</p>${html}</div>`;
}
function pvGrid(cols, fields) {
    const cls = cols === 2 ? 'col2' : cols === 1 ? 'col1' : '';
    return `<div class="pv-grid ${cls}">${fields}</div>`;
}
function pvCheckedGroup(items) {
    const active = items.filter(i => !!i.val);
    if (!active.length) return `<p class="pv-empty-note">None checked</p>`;
    return `<div class="pv-cbgroup">${active.map(i => `<span class="pv-cbtag">✓ ${i.name}</span>`).join('')}</div>`;
}
function peField(label, isNormal, findings) {
    const parts = [(isNormal ? '[Normal]' : ''), (findings || '')].filter(Boolean);
    return pvField(label, parts.join(' ').trim() || null);
}

// ─────────────────────────────────────────
// VIEW EMPLOYEE
// ─────────────────────────────────────────
let currentViewEmployeeId = null;

function viewEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    currentViewEmployeeId = id;
    renderBasicView(emp);
    renderFullProfileView(emp);
    toggleView('basic');
    document.getElementById('viewModal').style.display = 'block';
}

function toggleView(type) {
    const basicContent = document.getElementById('basicViewContent');
    const fullContent  = document.getElementById('fullViewContent');
    const basicBtn     = document.getElementById('basicViewBtn');
    const fullBtn      = document.getElementById('fullViewBtn');
    if (type === 'basic') {
        basicContent.style.display = 'block'; fullContent.style.display = 'none';
        basicBtn.classList.add('active'); fullBtn.classList.remove('active');
    } else {
        basicContent.style.display = 'none'; fullContent.style.display = 'block';
        basicBtn.classList.remove('active'); fullBtn.classList.add('active');
    }
}

// ─────────────────────────────────────────
// BASIC VIEW
// ─────────────────────────────────────────
function renderBasicView(emp) {
    const initials = (emp.name || ' ').split(',').map(s => s.trim()[0]).join('').slice(0,2).toUpperCase();
    const classKey = (emp.class || '').replace('Class ', '');
    const flags = [
        emp.pmHypertension && { label: 'Hypertension', cls: 'warn' },
        emp.pmDiabetes     && { label: 'Diabetes',     cls: 'warn' },
        emp.pmAsthma       && { label: 'Asthma',       cls: 'info' },
        emp.pmTB           && { label: 'TB',            cls: 'danger' },
        emp.pmHepatitis    && { label: 'Hepatitis',     cls: 'danger' },
        emp.pmCancer       && { label: 'Cancer',        cls: 'danger' },
    ].filter(Boolean);

    document.getElementById('basicViewContent').innerHTML = `
        ${PROFILE_CSS}
        <div class="pv-wrap">
            <div class="pv-header">
                <div class="pv-avatar">${initials}</div>
                <div>
                    <p class="pv-hname">${emp.name}</p>
                    <p class="pv-hid">EMP ID: ${emp.id}&nbsp;&nbsp;·&nbsp;&nbsp;${emp.occupation || 'No occupation'}</p>
                </div>
                <span class="pv-hclass ${classKey}">${emp.class || 'Unclassified'}</span>
            </div>

            ${pvSection('Personal Info',
                pvGrid(3, `
                    ${pvField('Birthday', emp.birthday)}
                    ${pvField('Age', emp.age)}
                    ${pvField('Gender', emp.gender)}
                    ${pvField('Civil Status', emp.civilStatus)}
                    ${pvField('Contact', emp.contact)}
                    ${pvField('Religion', emp.religion)}
                    ${pvField('Home Address', emp.address, 'span3')}
                `)
            )}

            ${pvSection('Emergency & Lifestyle',
                pvGrid(3, `
                    ${pvField('Emergency Contact', emp.emergencyName ? `${emp.emergencyName} — ${emp.emergencyContact || '-'}` : null, 'span2')}
                    ${pvField('Relationship', emp.emergencyRelationship)}
                    ${pvField('Smoking', [emp.smoking, emp.smokingPack ? `(${emp.smokingPack})` : ''].filter(Boolean).join(' '))}
                    ${pvField('Alcohol',  [emp.alcohol,  emp.alcoholDetails ? `(${emp.alcoholDetails})` : ''].filter(Boolean).join(' '))}
                    ${pvField('Drugs', emp.drugs)}
                `)
            )}

            ${flags.length ? `
                <div class="pv-section">
                    <p class="pv-section-title">Medical History Flags</p>
                    <div class="pv-flags">
                        ${flags.map(f => `<span class="pv-flag ${f.cls}">${f.label}</span>`).join('')}
                    </div>
                </div>` : ''}

            <div class="pv-section">
                <p class="pv-section-title">Consultation History</p>
                ${emp.consultations && emp.consultations.length
                    ? emp.consultations.map((c, idx) => `
                        <button class="pv-consult-row" onclick="openConsultationDetail('${emp.id}', ${idx})">
                            <p class="pv-consult-date">${c.date || '-'} ${c.time || ''}</p>
                            <p class="pv-consult-complaint">${c.chiefComplaint || 'No complaint recorded'}</p>
                        </button>`).join('')
                    : `<p class="pv-empty-note">No consultations recorded.</p>`}
            </div>
        </div>`;
}

// ─────────────────────────────────────────
// FULL PROFILE VIEW — ALL 9 STEPS
// ─────────────────────────────────────────
function renderFullProfileView(emp) {
    document.getElementById('fullViewContent').innerHTML = `
        ${PROFILE_CSS}
        <div class="pv-wrap">

            ${pvSection('I. Personal Profile',
                pvGrid(3, `
                    ${pvField('Employee ID', emp.id)}
                    ${pvField('Full Name', emp.name)}
                    ${pvField('Birthday', emp.birthday)}
                    ${pvField('Age', emp.age)}
                    ${pvField('Gender', emp.gender)}
                    ${pvField('Contact Number', emp.contact)}
                    ${pvField('Religion', emp.religion)}
                    ${pvField('Occupation', emp.occupation)}
                    ${pvField('Civil Status', emp.civilStatus)}
                    ${pvField('Classification', emp.class)}
                    ${pvField('Home Address', emp.address, 'span2')}
                `)
            )}

            ${pvSection('II. In Case of Emergency',
                pvGrid(3, `
                    ${pvField('Complete Name', emp.emergencyName)}
                    ${pvField('Relationship', emp.emergencyRelationship)}
                    ${pvField('Contact Number', emp.emergencyContact)}
                    ${pvField('Address', emp.emergencyAddress, 'span3')}
                `)
            )}

            ${pvSection('III. Personal / Social History',
                pvGrid(3, `
                    ${pvField('Smoking', emp.smoking)}
                    ${pvField('Pack/Day or Years', emp.smokingPack)}
                    ${pvField('Alcohol Drinking', emp.alcohol)}
                    ${pvField('Type / Frequency', emp.alcoholDetails)}
                    ${pvField('Illegal Drug Use', emp.drugs)}
                    ${pvField('Sexually Active', emp.sexuallyActive)}
                    ${pvField('No. of Partners This Year', emp.sexPartners)}
                    ${pvField('Partners Gender', emp.sexPartnerGender)}
                `)
            )}

            <div class="pv-section">
                <p class="pv-section-title">IV. Past Medical History</p>
                ${pvGrid(3, `
                    ${pvCbField('Allergy', emp.pmAllergy)}
                    ${pvField('Allergy Type', emp.pmAllergyType)}
                    ${pvCbField('Asthma', emp.pmAsthma)}
                    ${pvCbField('Cancer', emp.pmCancer)}
                    ${pvCbField('Coronary Artery Disease', emp.pmCoronary)}
                    ${pvCbField('Hypertension / Elevated BP', emp.pmHypertension)}
                    ${pvCbField('Congenital Heart Disorder', emp.pmCongenital)}
                    ${pvCbField('Diabetes Mellitus', emp.pmDiabetes)}
                    ${pvCbField('Thyroid Disease', emp.pmThyroid)}
                    ${pvCbField('Peptic Ulcer', emp.pmPeptic)}
                    ${pvCbField('PCOS', emp.pmPCOS)}
                    ${pvCbField('Psychological Disorder', emp.pmPsych)}
                    ${pvField('Psychological Type', emp.pmPsychType)}
                    ${pvCbField('Epilepsy / Seizure', emp.pmEpilepsy)}
                    ${pvCbField('Skin Disorder', emp.pmSkin)}
                    ${pvCbField('Tuberculosis', emp.pmTB)}
                    ${pvCbField('Hepatitis', emp.pmHepatitis)}
                `)}
            </div>

            ${pvSection('V. Hospital Admission / Surgical History / Disability',
                pvGrid(3, `
                    ${pvField('Hospital Diagnosis 1', emp.hospitalDiagnosis1)}
                    ${pvField('When', emp.hospitalWhen1)}
                    <div></div>
                    ${pvField('Hospital Diagnosis 2', emp.hospitalDiagnosis2)}
                    ${pvField('When', emp.hospitalWhen2)}
                    <div></div>
                    ${pvField('Past Surgery 1', emp.surgeryType1)}
                    ${pvField('When', emp.surgeryWhen1)}
                    <div></div>
                    ${pvField('Past Surgery 2', emp.surgeryType2)}
                    ${pvField('When', emp.surgeryWhen2)}
                    <div></div>
                    ${pvField('Disability', emp.disabilitySpecify)}
                    ${pvField('Registration Status', emp.disabilityRegistered)}
                    ${pvField('Willing to Donate Blood', emp.donateBlood)}
                `)
            )}

            ${pvSection('VI. Family History & Immunization',
                pvGrid(2, `
                    ${pvField('Mother Side History', emp.familyHistoryMother)}
                    ${pvField('Father Side History', emp.familyHistoryFather)}
                `) +
                pvGrid(3, `
                    ${pvField('Newborn Immunization', emp.newbornImmunization)}
                    ${pvField('COVID-19 Vaccinated', emp.newCovidVax)}
                    ${pvField('HPV Doses', emp.hpvDoses)}
                    ${pvField('Tetanus Toxoid Doses', emp.tetanusDoses)}
                    ${pvField('Influenza / Flu Year', emp.influenzaYear)}
                    ${pvField('Pneumococcal Doses', emp.pneumococcalDoses)}
                    ${pvField('Other Immunizations', emp.otherImmunizations, 'span3')}
                    ${pvField('Physical Notes', emp.physicalNotes, 'span3')}
                    ${pvField('COVID Brand', emp.covidBrand)}
                    ${pvField('Dose 1', emp.covidDose1)}
                    ${pvField('Dose 2', emp.covidDose2)}
                    ${pvField('Booster 1', emp.covidBooster1)}
                    ${pvField('Booster 2', emp.covidBooster2)}
                    ${pvField('Unvaccinated Reason', emp.covidUnvaccinatedReason)}
                `)
            )}

            ${pvSection('VII. Maintenance Medication & OB/GYNE',
                pvGrid(3, `
                    ${pvField('Maintenance Medication', emp.maintenanceMedication, 'span3')}
                    ${pvField('OB/GYNE Notes', emp.obGynNotes, 'span3')}
                    ${pvField('Menarche', emp.menarche)}
                    ${pvField('Last Menstrual Period', emp.lastMenstrualPeriod)}
                    ${pvField('Period / Duration', emp.periodDuration)}
                    ${pvField('Interval / Cycle', emp.intervalCycle)}
                    ${pvField('Pads Per Day', emp.padsPerDay)}
                    ${pvField('Onset of Sexual Intercourse', emp.onsetSexualIntercourse)}
                    ${pvField('Birth Control Method', emp.birthControlMethod)}
                    ${pvField('Menopausal Stage', emp.menopausalStage)}
                    ${pvField('Menopausal Age', emp.menopausalAge)}
                    <div></div>
                    ${pvField('Pregnancy History', emp.pregnancyHistory, 'span3')}
                    ${pvField('Pregnant Now', emp.pregnantNow)}
                    ${pvField('How Many Months', emp.pregnancyMonths)}
                    ${pvField('Pre-natal Check-up', emp.prenatalCheckup)}
                    ${pvField('Pre-natal Location', emp.prenatalWhere)}
                    ${pvField('Pregnancy Test Subject', emp.pregnancyTestSubject)}
                    ${pvField('Test Result', emp.pregnancyTestResult)}
                    ${pvField('Gravida', emp.gravida)}
                    ${pvField('Para', emp.para)}
                    ${pvField('Term', emp.term)}
                    ${pvField('Abortion', emp.abortion)}
                    ${pvField('Live Birth', emp.liveBirth)}
                    ${pvField('Type of Delivery', emp.deliveryType)}
                    ${pvField('Complications', emp.deliveryComplications)}
                    <div></div>
                    ${pvField('Family Planning Type', emp.familyPlanningType)}
                    ${pvField('No. of Years', emp.familyPlanningYears)}
                `)
            )}

            <div class="pv-section">
                <p class="pv-section-title">VIII. Head to Toe Assessment</p>

                <p class="pv-subsection">Neurological</p>
                ${pvCheckedGroup([
                    { name: 'Normal thought processes',    val: emp.neuroNormalThought },
                    { name: 'Normal emotional status',     val: emp.neuroNormalEmotional },
                    { name: 'Normal psychological status', val: emp.neuroNormalPsych },
                ])}
                ${pvGrid(3, `${pvField('How do you feel?', emp.neuroHowFeel)} ${pvField('Others', emp.neuroOthers)}`)}

                <p class="pv-subsection">HEENT</p>
                ${pvCheckedGroup([
                    { name: 'Anicteric Sclerae',             val: emp.heentAnictericSclerae },
                    { name: 'PERLA',                         val: emp.heentPerla },
                    { name: 'Aural Discharge',               val: emp.heentAuralDischarge },
                    { name: 'Intact Tympanic Membrane',      val: emp.heentIntactTympanic },
                    { name: 'Nasal Flaring',                 val: emp.heentNasalFlaring },
                    { name: 'Nasal Discharge',               val: emp.heentNasalDischarge },
                    { name: 'Tonsillopharyngeal Congestion', val: emp.heentTonsillopharyngealCongestion },
                    { name: 'Hypertrophic Tonsils',          val: emp.heentHypertropicTonsils },
                    { name: 'Palpable Mass',                 val: emp.heentPalpableMass },
                    { name: 'Exudates',                      val: emp.heentExudates },
                ])}

                <p class="pv-subsection">Respiratory</p>
                ${pvCheckedGroup([
                    { name: 'Normal Breath Sounds',        val: emp.respNormalBreathSounds },
                    { name: 'Symmetrical Chest Expansion', val: emp.respSymChestExpansion },
                    { name: 'Retractions',                 val: emp.respRetractions },
                    { name: 'Crackles/Rales',              val: emp.respCracklesRates },
                    { name: 'Wheezing',                    val: emp.respWheezing },
                    { name: 'Clear Breath Sounds',         val: emp.respClearBreathSounds },
                ])}

                <p class="pv-subsection">Cardiovascular</p>
                ${pvCheckedGroup([
                    { name: 'Normal Heartbeat',     val: emp.cardioNormalHeartBeat },
                    { name: 'Clubbing of Fingers',  val: emp.cardioClubbing },
                    { name: 'Finger Discoloration', val: emp.cardioFingerDiscoloration },
                    { name: 'Heart Murmur',         val: emp.cardioHeartMurmur },
                    { name: 'Irregular Heartbeat',  val: emp.cardioIrregularHeartBeat },
                    { name: 'Palpitations',         val: emp.cardioPalpitations },
                    { name: 'Fluid Volume Excess',  val: emp.cardioFluidVolumeExcess },
                    { name: 'Fatigue on Mobility',  val: emp.cardioFatigueMobility },
                ])}

                <p class="pv-subsection">Gastrointestinal</p>
                ${pvCheckedGroup([
                    { name: 'Regular Bowel Movement', val: emp.giRegularBowel },
                    { name: 'Constipation',           val: emp.giConstipation },
                    { name: 'Loose Bowel Movement',   val: emp.giLooseBowel },
                    { name: 'Hyperacidity',           val: emp.giHyperacidity },
                ])}
                ${pvGrid(3, `${pvField('Bowel per day', emp.giBowelPerDay)} ${pvField('Borborygmi', emp.giBorborygmi)}`)}

                <p class="pv-subsection">Urinary</p>
                ${pvCheckedGroup([
                    { name: 'Flank Pain',        val: emp.urinaryFlankPain },
                    { name: 'Painful Urination', val: emp.urinaryPainful },
                ])}
                ${pvGrid(3, `${pvField('Urination per day', emp.urinaryFrequency)} ${pvField('Amount per voiding', emp.urinaryAmountPerVoiding)}`)}

                <p class="pv-subsection">Integumentary</p>
                ${pvCheckedGroup([
                    { name: 'Pallor',           val: emp.integPallor },
                    { name: 'Rashes',           val: emp.integRashes },
                    { name: 'Jaundice',         val: emp.integJaundice },
                    { name: 'Good Skin Turgor', val: emp.integSkinTurgor },
                    { name: 'Cyanosis',         val: emp.integCyanosis },
                ])}

                <p class="pv-subsection">Extremities</p>
                ${pvCheckedGroup([
                    { name: 'Gross Deformity', val: emp.extegGrossDeformity },
                    { name: 'Normal Gait',     val: emp.extegNormalGait },
                    { name: 'Normal Strength', val: emp.extegNormalStrength },
                ])}
                ${pvGrid(3, `${pvField('Others', emp.extegOthers)}`)}
                ${pvGrid(1, `${pvField('Other Pertinent Findings', emp.assessmentOtherFindings)}`)}
            </div>

            <div class="pv-section">
                <p class="pv-section-title">IX. Physical Examination — Appendix A</p>
                <div class="pv-vitals-row">
                    ${[['Height','appendixHeight','cm'],['Weight','appendixWeight','kg'],
                       ['Blood Pressure','appendixBP',''],['Pulse Rate','appendixPulse','bpm'],
                       ['Respiration','appendixRespiration',''],['SpO2','appendixSpO2','%'],
                       ['BMI','appendixBMI',''],['BMI Class','appendixBMIClass','']
                      ].map(([lbl, key, unit]) => `
                        <div class="pv-vital">
                            <p class="pv-vital-label">${lbl}</p>
                            <p class="pv-vital-val">${emp[key] ? emp[key] + (unit ? ' ' + unit : '') : '—'}</p>
                        </div>`).join('')}
                </div>

                ${pvGrid(3, `
                    ${pvCbField('Vision Corrected', emp.appendixVisionCorrected)}
                    ${pvCbField('Vision Uncorrected', emp.appendixVisionUncorrected)}
                    <div></div>
                    ${pvField('Right Eye (OD)', emp.appendixOD)}
                    ${pvField('Left Eye (OS)', emp.appendixOS)}
                    ${pvField('Color Vision', emp.appendixColorVision)}
                    ${pvField('Ear Hearing (AD)', emp.appendixEarAD)}
                    ${pvField('Ear Hearing (AS)', emp.appendixEarAS)}
                `)}

                <p class="pv-subsection">Physical Examination Findings</p>
                ${pvGrid(3, `
                    ${peField('Skin',                   emp.appendixNormalSkin,        emp.appendixFindingsSkin)}
                    ${peField('Head / Neck / Scalp',    emp.appendixNormalHead,        emp.appendixFindingsHead)}
                    ${peField('Eyes (External)',         emp.appendixNormalEyes,        emp.appendixFindingsEyes)}
                    ${peField('Pupils',                 emp.appendixNormalPupils,      emp.appendixFindingsPupils)}
                    ${peField('Ears / Nose / Sinuses',  emp.appendixNormalEars,        emp.appendixFindingsEars)}
                    ${peField('Mouth / Throat',         emp.appendixNormalMouth,       emp.appendixFindingsMouth)}
                    ${peField('Neck / Lymph / Thyroid', emp.appendixNormalNeck,        emp.appendixFindingsNeck)}
                    ${peField('Chest / Breast / Axilla',emp.appendixNormalChest,       emp.appendixFindingsChest)}
                    ${peField('Lungs',                  emp.appendixNormalLungs,       emp.appendixFindingsLungs)}
                    ${peField('Heart & Valvular',       emp.appendixNormalHeart,       emp.appendixFindingsHeart)}
                    ${peField('Back & Abdomen',         emp.appendixNormalBack,        emp.appendixFindingsBack)}
                    ${peField('Genitalia',              emp.appendixNormalGenitalia,   emp.appendixFindingsGenitalia)}
                    ${peField('Anus / Rectum',          emp.appendixNormalAnus,        emp.appendixFindingsAnus)}
                    ${peField('Extremities',            emp.appendixNormalExtremities, emp.appendixFindingsExtremities)}
                `)}

                <p class="pv-subsection">Ancillary Examinations</p>
                ${pvGrid(3, `
                    ${pvField('Complete Blood Count', emp.appendixCBC)}
                    ${pvField('Fecalysis / Stool', emp.appendixStool)}
                    ${pvField('Pregnancy Test', emp.appendixPregnancyTest)}
                    ${pvField('Urinalysis', emp.appendixUrinalysis)}
                    ${pvField('Chest X-Ray', emp.appendixXray)}
                    ${pvField('Hep B (HBsAg)', emp.appendixHepB)}
                    ${pvField('Blood Type', emp.appendixBloodType)}
                    ${pvField('MMSE Score', emp.appendixMMSE)}
                `)}

                <p class="pv-subsection">Employee Classification</p>
                <div class="pv-class-row">
                    <span class="pv-class-pill ${emp.appendixClassA ? 'on-A' : 'off'}">${emp.appendixClassA ? '✓' : '○'} Class A — FIT for any work</span>
                    <span class="pv-class-pill ${emp.appendixClassB ? 'on-B' : 'off'}">${emp.appendixClassB ? '✓' : '○'} Class B — Corrective defects</span>
                    <span class="pv-class-pill ${emp.appendixClassC ? 'on-C' : 'off'}">${emp.appendixClassC ? '✓' : '○'} Class C — Limited duty</span>
                </div>

                ${pvGrid(1, `
                    ${pvField('Diagnosis', emp.appendixDiagnosis)}
                    ${pvField('Remarks', emp.appendixRemarks)}
                `)}
                ${pvGrid(3, `
                    ${pvField('School Nurse', emp.appendixSchoolNurse)}
                    ${pvField('Nurse License No.', emp.appendixSchoolNurseLicense)}
                    <div></div>
                    ${pvField('School Physician', emp.appendixPhysician)}
                    ${pvField('Physician License No.', emp.appendixPhysicianLicense)}
                    <div></div>
                    ${pvField('Date Filed', emp.appendixDateFiled)}
                    ${pvField('File No.', emp.appendixFileNo)}
                    ${pvField('Recorded By', emp.appendixRecordedBy)}
                `)}
            </div>
        </div>`;
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
    currentViewEmployeeId = null;
}

function openConsultationDetail(employeeId, index) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp || !emp.consultations || !emp.consultations[index]) return;
    const c = emp.consultations[index];
    
    // Generate initials for avatar
    const names = emp.name.split(' ').filter(n => n.trim());
    const initials = names.map(n => n[0]).slice(0, 2).join('').toUpperCase();
    
    const dateTime = (c.date || '-') + (c.time ? ' ' + c.time : '');
    
    // Generate prescriptions section if prescriptions exist
    const prescriptionsHTML = c.prescriptions && c.prescriptions.length > 0 ? `
            <div class="prescriptions-section">
                <h4 class="section-title">PRESCRIPTIONS</h4>
                <div class="prescriptions-list">
                    ${c.prescriptions.map((rx, rxIdx) => `
                        <div class="prescription-item-view">
                            <div class="prescription-header-mini">
                                <span class="prescription-date-mini">${rx.prescribedOn || 'No date'}</span>
                                <span class="prescription-count">#${rxIdx + 1}</span>
                            </div>
                            <div class="prescription-medicines">
                                ${rx.medicines && rx.medicines.length > 0 ? rx.medicines.map(m => `
                                    <div class="medicine-item">
                                        <strong>${m.name}</strong>
                                        ${m.details ? `<div class="medicine-details">${m.details}</div>` : ''}
                                    </div>
                                `).join('') : '<div class="medicine-item">No medicines recorded</div>'}
                            </div>
                            ${rx.note ? `<div class="prescription-note-mini"><strong>Note:</strong> ${rx.note}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
    
    document.getElementById('consultDetailContent').innerHTML = `
        <div class="consult-detail-wrapper">
            <div class="consult-header-section">
                <div class="consult-avatar">${initials}</div>
                <div class="consult-info">
                    <div class="consult-name-row">
                        <h3 class="consult-patient-name">${emp.name}</h3>
                    </div>
                    <div class="consult-badges">
                        <span class="emp-id-badge">${emp.id}</span>
                        <span class="consult-type-badge">${c.consultType || 'N/A'}</span>
                    </div>
                </div>
                <div class="consult-datetime">
                    <div class="consult-datetime-label">Date & Time</div>
                    <div class="consult-datetime-value">${dateTime}</div>
                </div>
            </div>
            
            <div class="vital-signs-section">
                <h4 class="section-title">VITAL SIGNS</h4>
                <div class="vital-signs-grid">
                    <div class="vital-card">
                        <div class="vital-label">Height</div>
                        <div class="vital-value">${c.height || '—'} <span class="vital-unit">cm</span></div>
                    </div>
                    <div class="vital-card">
                        <div class="vital-label">Weight</div>
                        <div class="vital-value">${c.weight || '—'} <span class="vital-unit">kg</span></div>
                    </div>
                    <div class="vital-card">
                        <div class="vital-label">BP</div>
                        <div class="vital-value">${c.bp || '—'} <span class="vital-unit">mmHg</span></div>
                    </div>
                    <div class="vital-card">
                        <div class="vital-label">Heart Rate</div>
                        <div class="vital-value">${c.hr || '—'} <span class="vital-unit">bpm</span></div>
                    </div>
                    <div class="vital-card">
                        <div class="vital-label">Resp. Rate</div>
                        <div class="vital-value">${c.rr || '—'} <span class="vital-unit">bpm</span></div>
                    </div>
                    <div class="vital-card">
                        <div class="vital-label">Temperature</div>
                        <div class="vital-value">${c.temp || '—'} <span class="vital-unit">°C</span></div>
                    </div>
                </div>
            </div>
            
            <div class="complaint-plan-section">
                <div class="complaint-box">
                    <h4 class="section-title">CHIEF COMPLAINT</h4>
                    <div class="complaint-content">${c.chiefComplaint || '—'}</div>
                </div>
                <div class="plan-box">
                    <h4 class="section-title">PLAN / ADVICE</h4>
                    <div class="plan-content">${c.plan || '—'}</div>
                </div>
            </div>
            
            ${prescriptionsHTML}
        </div>`;
    
    // Update modal footer with Print button
    const modalFooter = document.querySelector('#consultDetailModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button type="button" class="cancel-btn" onclick="closeConsultDetailModal()">Close</button>
            <button type="button" class="save-btn" onclick="printConsultationDetail('${employeeId}', ${index})">Print</button>
        `;
    }
    
    document.getElementById('consultDetailModal').style.display = 'block';
}
function closeConsultDetailModal() { document.getElementById('consultDetailModal').style.display = 'none'; }

function printConsultationDetail(employeeId, index) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp || !emp.consultations || !emp.consultations[index]) return;
    const c = emp.consultations[index];
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    let yPosition = 15;
    
    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('CONSULTATION DETAILS', 20, yPosition);
    yPosition += 10;
    
    // Patient Info
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(emp.name + ' (' + emp.id + ')', 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Date/Time: ' + (c.date || '-') + ' ' + (c.time || '-'), 20, yPosition);
    yPosition += 6;
    doc.text('Consult Type: ' + (c.consultType || '-'), 20, yPosition);
    yPosition += 8;
    
    // Vital Signs
    doc.setFont(undefined, 'bold');
    doc.text('VITAL SIGNS', 20, yPosition);
    yPosition += 6;
    
    doc.setFont(undefined, 'normal');
    doc.text('Height: ' + (c.height || '-') + ' cm     Weight: ' + (c.weight || '-') + ' kg', 20, yPosition);
    yPosition += 5;
    doc.text('BP: ' + (c.bp || '-') + ' mmHg     HR: ' + (c.hr || '-') + ' bpm', 20, yPosition);
    yPosition += 5;
    doc.text('RR: ' + (c.rr || '-') + ' bpm     Temp: ' + (c.temp || '-') + ' °C', 20, yPosition);
    yPosition += 8;
    
    // Chief Complaint
    doc.setFont(undefined, 'bold');
    doc.text('CHIEF COMPLAINT:', 20, yPosition);
    yPosition += 5;
    
    doc.setFont(undefined, 'normal');
    const complaintLines = doc.splitTextToSize(c.chiefComplaint || 'None', 170);
    doc.text(complaintLines, 20, yPosition);
    yPosition += complaintLines.length * 5 + 3;
    
    // Plan
    doc.setFont(undefined, 'bold');
    doc.text('PLAN / ADVICE:', 20, yPosition);
    yPosition += 5;
    
    doc.setFont(undefined, 'normal');
    const planLines = doc.splitTextToSize(c.plan || 'None', 170);
    doc.text(planLines, 20, yPosition);
    yPosition += planLines.length * 5 + 5;
    
    // Prescriptions
    if (c.prescriptions && c.prescriptions.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('PRESCRIPTIONS:', 20, yPosition);
        yPosition += 5;
        
        c.prescriptions.forEach((rx, idx) => {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.text('Prescription #' + (idx + 1) + ' - ' + (rx.prescribedOn || 'No date'), 20, yPosition);
            yPosition += 4;
            
            doc.setFont(undefined, 'normal');
            if (rx.medicines && rx.medicines.length > 0) {
                rx.medicines.forEach(m => {
                    doc.setFontSize(9);
                    doc.text('• ' + m.name, 25, yPosition);
                    yPosition += 4;
                    if (m.details) {
                        doc.text('  ' + m.details, 25, yPosition);
                        yPosition += 4;
                    }
                });
            }
            if (rx.note) {
                doc.text('Note: ' + rx.note, 25, yPosition);
                yPosition += 4;
            }
            yPosition += 2;
        });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.text('Generated on: ' + new Date().toLocaleString(), 20, doc.internal.pageSize.getHeight() - 10);
    
    const fileName = `Consultation_${emp.id}_${c.date || 'NoDate'}.pdf`;
    doc.save(fileName);
    
    showToast('Consultation details saved as PDF!', 'green');
}

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
    document.getElementById('consultFamilyName').value  = nameParts[0] || '';
    const restParts = (nameParts[1] || '').split(' ').filter(Boolean);
    document.getElementById('consultFirstName').value   = restParts[0] || '';
    document.getElementById('consultMiddleName').value  = restParts.slice(1).join(' ') || '';
    document.getElementById('consultSex').value         = emp.gender || '';
    document.getElementById('consultCivilStatus').value = emp.civilStatus || '';
    document.getElementById('consultPhone').value       = emp.contact || '';
    document.getElementById('consultAge').value         = emp.age || '';
    document.getElementById('consultBday').value        = emp.birthday || '';
    document.getElementById('consultAddress').value     = emp.address || '';
}

function populateCertEmployeeOptions() {
    const searchInput = document.getElementById('certEmployeeSearch');
    const hiddenId = document.getElementById('certEmployeeId');
    if (!searchInput || !hiddenId) return;
    searchInput.value = '';
    hiddenId.value = '';
    searchInput.oninput = () => {
        updateCertEmployeeOptions();
        updateCertEmployeeSelection();
    };
    searchInput.onchange = updateCertEmployeeSelection;
    updateCertEmployeeOptions();
}

function updateCertEmployeeOptions() {
    const searchInput = document.getElementById('certEmployeeSearch');
    const dataList = document.getElementById('certEmployeeList');
    if (!searchInput || !dataList) return;
    const query = (searchInput.value || '').trim().toLowerCase();
    const employeesToShow = sortEmployeesByName(employees).filter(emp => {
        if (!query) return true;
        return emp.name.toLowerCase().includes(query) || emp.id.toLowerCase().includes(query);
    });
    dataList.innerHTML = employeesToShow.map(emp => `<option value="${emp.name} (${emp.id})"></option>`).join('');
    if (query && employeesToShow.length === 1) {
        const employee = employeesToShow[0];
        const formatted = `${employee.name} (${employee.id})`;
        searchInput.value = formatted;
        document.getElementById('certEmployeeId').value = employee.id;
        fillCertEmployeeFields(employee);
    }
}

function renderCertEmployeeSearchResults(list) {
    // No custom visible results list for certificate entries; datalist is used instead.
}

function updateCertEmployeeSelection() {
    const searchInput = document.getElementById('certEmployeeSearch');
    const hiddenId = document.getElementById('certEmployeeId');
    if (!searchInput || !hiddenId) return;
    const exactValue = searchInput.value.trim();
    const selectedEmployee = employees.find(emp => `${emp.name} (${emp.id})` === exactValue);
    if (selectedEmployee) {
        hiddenId.value = selectedEmployee.id;
        fillCertEmployeeFields(selectedEmployee);
    } else {
        hiddenId.value = '';
    }
}

function fillCertEmployeeFields(emp) {
    document.getElementById('certFullName').value = emp.name || '';
    document.getElementById('certAge').value = emp.age || '';
    document.getElementById('certGender').value = emp.gender || '';
    document.getElementById('certAddress').value = emp.address || '';
    renderCertificatePreview();
}

function renderCertificatePreview() {
    const fullName = document.getElementById('certFullName').value.trim() || '______________________';
    const age = document.getElementById('certAge').value.trim() || '____';
    const gender = document.getElementById('certGender').value.trim() || 'female/male';
    const address = document.getElementById('certAddress').value.trim() || '______________________';
    const diagnosis = document.getElementById('certDiagnosis').value.trim() || 'Essentially normal PE findings';
    const recommendation = document.getElementById('certRecommendation').value.trim() || 'Mentally and physically fit';
    const dateValue = document.getElementById('certDate').value;
    const dateText = formatCertificateDate(dateValue || new Date().toISOString().slice(0, 10));
    const preview = document.getElementById('certificatePrintArea');
    if (!preview) return;
    preview.innerHTML = `
        <div class="certificate-page" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px 38px 0 38px; border: 1px solid #ccc; background: #fff;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
                <tr>
                    <td style="width: 90px; vertical-align: top;">
                        <img src="https://sis.nbsc.edu.ph/assets/img/nbsclogo.png" alt="NBSC Logo" style="width: 80px; height: auto;">
                    </td>
                    <td style="text-align: center; vertical-align: top;">
                        <div style="font-size: 1rem;">Republic of the Philippines</div>
                        <div style="font-size: 1.25rem; font-weight: bold; letter-spacing: 1px;">NORTHERN BUKIDNON STATE COLLEGE</div>
                        <div style="font-size: 1rem;">Manolo Fortich, 8703 Bukidnon</div>
                        <div style="font-size: 0.85rem; color: #a67a2d; font-style: italic; margin-bottom: 2px;">Creando Futura, Transformationis Vitae, Ductus a Deo</div>
                    </td>
                    <td style="width: 220px; text-align: right; vertical-align: top;">
                        <img src="certificate_codebox.png" alt="Document Code Box" style="width: 220px; max-width: 100%; height: auto; display: block;">
                    </td>
                </tr>
            </table>
            <hr style="margin: 8px 0 0 0; border: none; border-top: 2px solid #222;">
            <div style="height: 8px;"></div>
            <div class="certificate-title" style="text-align:center; font-size:1.2rem; font-weight:700; margin: 18px 0 18px 0; letter-spacing: 1px;">MEDICAL CERTIFICATE</div>
            <div class="certificate-body" style="font-size: 1rem; line-height: 1.7; margin: 0 0 0 0;">
                <div style="margin-bottom: 18px;"><strong>TO WHOM IT MAY CONCERN:</strong></div>
                <div style="margin-bottom: 18px;">This is to certify that <strong style="text-decoration: underline;">${fullName}</strong>, <strong style="text-decoration: underline;">${age}</strong> years old, <span style="text-decoration: underline;">female/male</span> and residing<br>at <span style="text-decoration: underline;">${address}</span> has been examined and attended at NBSC school clinic by the undersigned.</div>
                <div style="margin-bottom: 10px;"><strong>Diagnosis:</strong></div>
                <ul style="margin-top: 0; margin-bottom: 18px;">
                    <li>${diagnosis}</li>
                </ul>
                <div style="margin-bottom: 10px;"><strong>Recommendation:</strong></div>
                <ul style="margin-top: 0; margin-bottom: 18px;">
                    <li>${recommendation}</li>
                </ul>
                <div style="margin-bottom: 18px;">This certification is issued to the above-mentioned name for whatever legal purpose this may serve.</div>
                <div style="margin-bottom: 18px;">Done this <span style="text-decoration: underline;">${dateText}</span> at <span style="font-weight: bold; text-decoration: underline;">Northern Bukidnon State College</span>, <span style="text-decoration: underline;">Kihare, Tankulan, Manolo Fortich, Bukidnon.</span></div>
            </div>
            <div style="height: 32px;"></div>
            <div class="certificate-signature" style="margin-top: 0;">
                <div>
                    <strong>VAL O. ACOSTA, MD</strong><br>
                    Attending Physician<br>
                    License No. 0154636<br>
                    PTR No. 6215230
                </div>
            </div>
            <div style="height: 60px;"></div>
            <hr style="margin: 0 0 2px 0; border: none; border-top: 2px solid #222;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px; font-size: 0.95rem; color: #1f3a6d;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="NBSC Icon" style="width: 28px; vertical-align: middle;">
                    <span> NorthernBukidnonStateCollegeOfficial</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="https://cdn-icons-png.flaticon.com/512/561/561127.png" alt="mail" style="width: 22px; vertical-align: middle;">
                    <span>www.nbsc.edu.ph</span>
                </div>
            </div>
            <div style="height: 10px;"></div>
        </div>
    `;
}

function formatCertificateDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const suffix = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd' : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
    return `${day}${suffix} day of ${month} ${year}`;
}

function renderConsultations() {
    const consultList = document.getElementById('consultList');
    if (!consultList) return;
    if (!consultations.length) { consultList.innerHTML = '<p>No consultation records saved.</p>'; return; }
    consultList.innerHTML = consultations.map(c => `
        <div class="consult-item">
            <div><strong>${c.familyName}, ${c.firstName} ${c.middleName || ''}</strong> (${c.consultType || '-'})</div>
            <div>${c.date || '-'} ${c.time || ''} · EmpID: ${c.employeeId || 'n/a'}</div>
            <div>Complaint: ${c.chiefComplaint || '-'}</div>
            <div>Plan: ${c.plan || '-'}</div>
        </div>`).join('');
}

const openConsultBtn           = document.getElementById('openConsultBtn');
const consultModal             = document.getElementById('consultModal');
const closeConsultModalBtn     = document.getElementById('closeConsultModal');
const openRxBtn                = document.getElementById('openRxBtn');
const rxModal                  = document.getElementById('rxModal');
const closeRxModalBtn          = document.getElementById('closeRxModal');
const printRxBtn               = document.getElementById('printRxBtn');
const openCertBtn              = document.getElementById('openCertBtn');
const certificateModal         = document.getElementById('certificateModal');
const closeCertificateModalBtn = document.getElementById('closeCertificateModal');
const printCertificateBtn      = document.getElementById('printCertificateBtn');

openConsultBtn.onclick = () => {
    const searchInput = document.getElementById('consultEmployeeSearch');
    if (searchInput) searchInput.value = '';
    updateConsultEmployeeOptions();
    consultModal.style.display = 'block';
};
closeConsultModalBtn.onclick = () => { consultModal.style.display = 'none'; };

openRxBtn.onclick = () => {
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
closeRxModalBtn.onclick = () => { rxModal.style.display = 'none'; };

openCertBtn.onclick = () => {
    const searchInput = document.getElementById('certEmployeeSearch');
    const hiddenId = document.getElementById('certEmployeeId');
    if (searchInput) searchInput.value = '';
    if (hiddenId) hiddenId.value = '';
    document.getElementById('certFullName').value = '';
    document.getElementById('certAge').value = '';
    document.getElementById('certGender').value = '';
    document.getElementById('certAddress').value = '';
    document.getElementById('certDiagnosis').value = '';
    document.getElementById('certRecommendation').value = '';
    const dateInput = document.getElementById('certDate');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    populateCertEmployeeOptions();
    renderCertificatePreview();
    certificateModal.style.display = 'block';
};
closeCertificateModalBtn.onclick = () => { certificateModal.style.display = 'none'; };

printRxBtn.onclick = () => {
    // Get prescription data
    const employeeId = document.getElementById('rxEmployeeId').value;
    const consultDateValue = document.getElementById('rxConsultDate').value;
    
    // Gather prescription details
    const prescriptionData = {
        fullName: document.getElementById('rxFullName').value.trim(),
        age: document.getElementById('rxAge').value.trim(),
        gender: document.getElementById('rxGender').value.trim(),
        address: document.getElementById('rxAddress').value.trim(),
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
            saveEmployees();
        }
    }
    
    // Generate and download PDF
    generatePrescriptionPDF(prescriptionData, employeeId);
    
    showToast('Prescription saved and PDF downloaded!', 'green');
    closeRxModal();
};

function generatePrescriptionPDF(prescriptionData, employeeId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    
    // Header
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Val O. Acosta, MD', 20, yPosition);
    yPosition += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('General Practice', 20, yPosition);
    yPosition += 5;
    doc.text('Northern Bukidnon State College', 20, yPosition);
    yPosition += 5;
    doc.text('Health Services Office', 20, yPosition);
    yPosition += 5;
    doc.text('Kihare, Tankulan Manolo Fortich Bukidnon', 20, yPosition);
    yPosition += 10;
    
    // Prescribed Date
    doc.setFont(undefined, 'bold');
    doc.text('Prescribed on: ' + (prescriptionData.prescribedOn || new Date().toLocaleString()), 20, yPosition);
    yPosition += 12;
    
    // Patient Info
    doc.setFont(undefined, 'bold');
    doc.text('Patient: ', 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(prescriptionData.fullName || '___________________', 50, yPosition);
    yPosition += 7;
    
    doc.setFont(undefined, 'bold');
    doc.text('Age: ', 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(prescriptionData.age ? prescriptionData.age + ' years old' : '_______', 50, yPosition);
    yPosition += 7;
    
    doc.setFont(undefined, 'bold');
    doc.text('Gender: ', 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(prescriptionData.gender || '_______', 50, yPosition);
    yPosition += 12;
    
    // Rx symbol
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('Rx', 20, yPosition);
    yPosition += 12;
    
    // Medicines
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    if (prescriptionData.medicines.length > 0) {
        prescriptionData.medicines.forEach((med) => {
            doc.setFont(undefined, 'bold');
            doc.text('• ' + med.name, 20, yPosition);
            yPosition += 5;
            
            if (med.details) {
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                doc.text('   ' + med.details, 20, yPosition);
                doc.setFontSize(10);
                yPosition += 5;
            }
            yPosition += 2;
        });
    } else {
        doc.text('No medicines prescribed', 20, yPosition);
        yPosition += 7;
    }
    
    yPosition += 5;
    
    // Note section
    if (prescriptionData.note) {
        doc.setFont(undefined, 'bold');
        doc.text('Note:', 20, yPosition);
        yPosition += 5;
        doc.setFont(undefined, 'normal');
        const noteLines = doc.splitTextToSize(prescriptionData.note, pageWidth - 40);
        doc.text(noteLines, 20, yPosition);
        yPosition += noteLines.length * 5 + 5;
    }
    
    // Footer
    yPosition = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Printed on: ' + new Date().toLocaleString(), 20, yPosition);
    
    // Generate filename
    const fileName = `Prescription_${employeeId || 'Patient'}_${new Date().toISOString().slice(0, 10)}.pdf`;
    
    // Download PDF
    doc.save(fileName);
}


printCertificateBtn.onclick = () => {
    renderCertificatePreview();
    const rxPrintArea = document.getElementById('rxPrintArea');
    const certPrintArea = document.getElementById('certificatePrintArea');
    if (certPrintArea) certPrintArea.classList.add('print-active');
    if (rxPrintArea) rxPrintArea.classList.remove('print-active');
    
    // Generate Certificate PDF
    setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // For now, use simple certificate format
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('MEDICAL CERTIFICATE', 105, 50, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('This certificate is generated for medical records', 105, 70, { align: 'center' });
        doc.text('Generated on: ' + new Date().toLocaleString(), 105, doc.internal.pageSize.getHeight() - 20, { align: 'center' });
        
        const fileName = `Certificate_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        showToast('Certificate saved as PDF!', 'green');
    }, 50);
};

function closeCertificateModal() {
    if (certificateModal) certificateModal.style.display = 'none';
}

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
    const sortedConsults = consultations.slice().sort((a,b) => new Date(b.date + ' ' + (b.time || '')).getTime() - new Date(a.date + ' ' + (a.time || '')).getTime());
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
            const prescribedOn = consult.date ? `${consult.date}T${(consult.time || '00:00')}` : new Date().toISOString().slice(0,16);
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
    const prescribedOn = formatPrescriptionDate(prescribedOnValue || new Date().toISOString().slice(0,16));
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
    const prescriptionId = generatePrescriptionId();
    preview.innerHTML = `
        <div class="prescription-page">
            <div class="prescription-top">
                <div class="prescription-brand-left">
                    <div class="brand-box brand-box-green">PPD Clinic</div>
                    <div class="brand-tag">Connecting Healthcare to Everyone</div>
                </div>
                <div class="prescription-brand-right">
                    <div class="brand-box brand-box-blue">TFD</div>
                    <div class="brand-tag">TheFilipinoDoctor</div>
                </div>
            </div>
            <div class="prescription-doctor">
                <div class="doctor-name">Val O. Acosta, MD</div>
                <div class="doctor-title">General Practice</div>
                <div class="doctor-clinic">Dr. Val Acosta Clinic</div>
                <div class="doctor-location">Gusa<br>Cagayan De Oro City, Misamis Oriental</div>
            </div>
            <div class="prescription-meta">
                <div class="prescription-left">
                    <div><strong>Patient:</strong> ${fullName}</div>
                    <div><strong>Age:</strong> ${age} years old</div>
                    <div><strong>Gender:</strong> ${gender}</div>
                </div>
                <div class="prescription-right">
                    <div><strong>Prescribed on:</strong> ${prescribedOn} PHT</div>
                </div>
            </div>
            <div class="prescription-title">Rx</div>
            <div class="prescription-items">
                ${meds.length ? meds.map(m => `
                    <div class="prescription-item">
                        <div class="rx-name">${m.name}</div>
                        <div class="rx-details">${m.details || ''}</div>
                    </div>
                `).join('') : '<div class="prescription-item"><div class="rx-name">No medicines entered</div></div>'}
            </div>
            ${note ? `<div class="prescription-note"><span>Note:</span> ${note}</div>` : '<div class="prescription-note"><span>Note:</span> ______________________________</div>'}
            <div class="prescription-signature">
                <div class="signature-line"></div>
                <div class="signature-text">
                    <div>Physician's Signature</div>
                    <div>PRC No.: 0154636</div>
                    <div>PTR No.: 6540309</div>
                </div>
            </div>
            <div class="prescription-footer">
                <div class="footer-note">Note to User: The information contained in this electronic prescription are those of the prescriber and do not constitute as an endorsement of the PPD Clinic. If any information is suspected to be manually or electronically altered, drugstores are advised to verify the original contents of the prescription. The prescriber and the creators of the PPD App will not be liable for any loss or damage whatsoever arising from the use of altered or tampered electronic prescriptions.</div>
                <div class="footer-brand">Powered by The Filipino Doctor<br><span>For Philippines use only.</span></div>
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
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleString('en-US', options);
}

const consultForm = document.getElementById('consultationForm');
if (consultForm) {
    consultForm.onsubmit = (e) => {
        e.preventDefault();
        const record = {
            consultType: gv('consultType'), familyName: gv('consultFamilyName'),
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
                consultType: record.consultType, bp: record.bp, hr: record.hr, rr: record.rr, temp: record.temp,
                height: record.height, weight: record.weight, createdAt: new Date().toISOString()
            });
            saveEmployees();
        }
        consultations.unshift(record);
        saveConsultations(); consultForm.reset();
        consultModal.style.display = 'none';
        showToast('Consultation saved!', 'green');
    };
}

window.onclick = (event) => {
    if (event.target === consultModal)                                  consultModal.style.display = 'none';
    if (event.target === rxModal)                                       rxModal.style.display = 'none';
    if (event.target === certificateModal)                              certificateModal.style.display = 'none';
    if (event.target === addModal)                                      addModal.style.display = 'none';
    if (event.target === importModal)                                   importModal.style.display = 'none';
    if (event.target === document.getElementById('viewModal'))          document.getElementById('viewModal').style.display = 'none';
    if (event.target === document.getElementById('consultDetailModal')) document.getElementById('consultDetailModal').style.display = 'none';
};

document.getElementById('printProfileBtn').onclick = () => { 
    saveProfileAsPDF(); 
};

function saveProfileAsPDF() {
    const viewModalHeader = document.querySelector('#viewModal .profile-card h3');
    const employeeId = viewModalHeader ? viewModalHeader.textContent.match(/\(([^)]+)\)/)?.[1] : 'Unknown';
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    const contentElement = document.getElementById('viewContent');
    if (!contentElement) {
        alert('Unable to find profile content');
        return;
    }
    
    // Use html2canvas to capture the content
    html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pageWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const fileName = `Employee_Profile_${employeeId}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        showToast('Profile saved as PDF!', 'green');
    });
}

populateOccupationFilter();
filteredEmployees = employees;
filterData();
updateStats();
populateConsultEmployeeOptions();
searchInput.onkeyup = filterData;
occupationFilter.onchange = filterData;
showStep(0);

// Add these variables at top
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const fileInput = document.getElementById('fileInput');
const importModal = document.getElementById('importModal');
const importTypeSelect = document.getElementById('importTypeSelect');
const closeImportModalBtn = document.getElementById('closeImportModal');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const confirmImportBtn = document.getElementById('confirmImportBtn');
const exportModal = document.getElementById('exportModal');
const closeExportModalBtn = document.getElementById('closeExportModal');
const cancelExportBtn = document.getElementById('cancelExportBtn');
const confirmExportBtn = document.getElementById('confirmExportBtn');
const exportEmployeeSelect = document.getElementById('exportEmployeeSelect');
const exportTypeSelect = document.getElementById('exportTypeSelect');
const exportConsultDateSelect = document.getElementById('exportConsultDateSelect');
const exportConsultationDateGroup = document.getElementById('exportConsultationDateGroup');

// OCR + Import Function
// OCR + Import Function
async function processScannedForm(file, importType = 'consultation') {
    // Validate file
    if (!file) {
        throw new Error('No file selected');
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new Error('File size too large (max 10MB)');
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed: JPG, PNG, GIF, PDF. Got: ${file.type}`);
    }
    
    showToast('Processing scanned form... (This may take a moment)', 'blue');
    
    try {
        if (!window.Tesseract) {
            throw new Error('Tesseract OCR library not loaded. Please refresh the page.');
        }
        
        const { createWorker } = Tesseract;
        let worker;
        try {
            worker = await createWorker('eng', 1, {
                workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/worker.min.js'
            });
        } catch (e) {
            throw new Error('Failed to initialize OCR: ' + e.message);
        }
        
        let text = '';
        try {
            const { data: result } = await worker.recognize(file);
            text = result.text || '';
            
            if (!text || text.trim().length === 0) {
                throw new Error('No text detected in image. Try a clearer, better-lit scan.');
            }
        } catch (e) {
            throw new Error('OCR processing failed: ' + e.message);
        } finally {
            try {
                await worker.terminate();
            } catch (e) {
                console.warn('Worker termination warning:', e);
            }
        }

        if (importType === 'profile') {
            const parsedData = extractProfileData(text);
            if (!parsedData || Object.keys(parsedData).length === 0) {
                throw new Error('Could not parse profile data from scan');
            }
            return processScannedProfile(parsedData, file);
        }

        const parsedData = extractFormData(text);
        if (!parsedData || Object.keys(parsedData).length === 0) {
            throw new Error('Could not parse consultation data from scan');
        }
        
        let employee = employees.find(e => 
            e.id === parsedData.id || 
            (parsedData.name && e.name.toLowerCase().includes(parsedData.name.toLowerCase()))
        );
        
        if (!employee && parsedData.id) {
            employee = {
                id: parsedData.id,
                name: parsedData.name || 'Scanned Employee',
                class: 'Class A',
                consultations: []
            };
            employees.unshift(employee);
        }
        
        if (!employee) {
            throw new Error('Could not match employee from scanned data. Please add employee manually.');
        }
        
        const consultation = {
            date: parsedData.date || new Date().toISOString().split('T')[0],
            time: parsedData.time || new Date().toTimeString().slice(0,5),
            consultType: parsedData.consultType || 'General',
            height: parsedData.height,
            weight: parsedData.weight,
            chiefComplaint: parsedData.complaint || 'From scanned form',
            plan: parsedData.plan || 'Follow-up needed',
            bp: parsedData.bp, 
            hr: parsedData.hr, 
            rr: parsedData.rr,
            temp: parsedData.temp,
            createdAt: new Date().toISOString(),
            source: 'Scanned Form',
            scanFile: file.name,
            ocrText: text.slice(0, 200) + '...'
        };
        
        if (!Array.isArray(employee.consultations)) employee.consultations = [];
        employee.consultations.unshift(consultation);
        saveEmployees();
        updateStats();
        populateConsultEmployeeOptions();
        showToast(`✅ Consultation added to ${employee.name}!`, 'green');
        viewEmployee(employee.id);
        
        return parsedData;
    } catch (error) {
        const errorMsg = error.message || 'Unknown error occurred';
        throw new Error(errorMsg);
    }
}

function processScannedProfile(parsedData, file) {
    if (!parsedData.id) {
        parsedData.id = getNextEmployeeId();
    }

    let employee = employees.find(e => e.id === parsedData.id);
    const isNew = !employee;

    if (employee) {
        Object.assign(employee, parsedData, { consultations: employee.consultations || [] });
        showToast(`✅ Profile updated for ${employee.name}!`, 'green');
    } else {
        employee = Object.assign({ consultations: [] }, parsedData);
        employees.unshift(employee);
        normalizeEmployeeIds();
        showToast(`✅ New employee profile added: ${employee.name}!`, 'green');
    }

    saveEmployees();
    renderTable(employees);
    updateStats();
    populateConsultEmployeeOptions();
    if (!isNew) viewEmployee(employee.id);
    return parsedData;
}

function extractProfileData(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    return {
        id: extractEmpID(lines),
        name: extractName(lines) || 'Scanned Employee',
        birthday: extractField(lines, ['BIRTHDATE', 'DATE OF BIRTH', 'DOB']) || '',
        age: extractAge(lines) || '',
        occupation: extractField(lines, ['OCCUPATION', 'POSITION', 'JOB']) || '',
        religion: extractField(lines, ['RELIGION']) || '',
        civilStatus: extractField(lines, ['CIVIL STATUS', 'STATUS']) || '',
        gender: extractField(lines, ['SEX', 'GENDER']) || '',
        contact: extractField(lines, ['CONTACT', 'PHONE', 'MOBILE', 'CELLPHONE']) || '',
        address: extractField(lines, ['ADDRESS']) || '',
        condition: extractField(lines, ['MEDICAL CONDITION', 'CONDITION', 'DIAGNOSIS']) || '',
        class: extractField(lines, ['CLASS']) || 'Class A'
    };
}

function extractAge(lines) {
    const ageLine = lines.find(l => l.toUpperCase().includes('AGE'));
    if (!ageLine) return '';
    const match = ageLine.match(/AGE\s*[:\-]?\s*(\d{1,3})/i);
    return match?.[1] || '';
}

function extractField(lines, labels) {
    const upperLabels = labels.map(l => l.toUpperCase());
    for (const line of lines) {
        const up = line.toUpperCase();
        for (const label of upperLabels) {
            if (up.includes(label)) {
                const parts = line.split(/[:\-]/);
                if (parts.length > 1) {
                    return parts.slice(1).join('-').trim();
                }
                return line.replace(new RegExp(label, 'i'), '').trim();
            }
        }
    }
    return '';
}

// AI Form Parser (regex + heuristics)
function extractFormData(text) {
    const lines = text.toUpperCase().split('\n');
    return {
        id: extractEmpID(lines),
        name: extractName(lines),
        date: extractDate(lines),
        complaint: extractComplaint(lines),
        bp: extractVitals(lines, 'BP'),
        hr: extractVitals(lines, 'HR'),
        temp: extractVitals(lines, 'TEMP')
    };
}

function extractEmpID(lines) {
    const idMatch = lines.find(l => l.match(/EMP-\d{4}/));
    return idMatch?.match(/EMP-\d{4}/)?.[0];
}

function extractName(lines) {
    const nameMatch = lines.find(l => l.match(/[A-Z]{2,}\s*,\s*[A-Z]{2,}/));
    return nameMatch;
}

function extractDate(lines) {
    const dateMatch = lines.find(l => l.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/));
    return dateMatch;
}

function extractComplaint(lines) {
    const complaintLines = lines.slice(5, 15).join(' ').match(/[A-Z][a-z\s\.,]+(?=\n\n|\n[A-Z]{3,})/);
    return complaintLines?.[0];
}

function extractVitals(lines, type) {
    const vitals = lines.find(l => l.includes(type));
    return vitals?.match(/\d+\.?\d*/)?.[0];
}

// Export Functions
function populateExportEmployeeOptions() {
    exportEmployeeSelect.innerHTML = '<option value="">-- select employee --</option>' +
        sortEmployeesByName(employees).map(emp => `<option value="${emp.id}">${emp.name} (${emp.id})</option>`).join('');
    updateExportConsultationDates();
}

function updateExportConsultationDates() {
    const employeeId = exportEmployeeSelect.value;
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
    const initials = (emp.name || ' ').split(',').map(s => s.trim()[0]).join('').slice(0,2).toUpperCase();
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
    const mainMedication = emp.maintenanceMedication || '—';
    const obGynNotes = emp.obGynNotes || '—';
    const pregnancyHistory = emp.pregnancyHistory || '—';
    const pregnancyStatus = emp.pregnantNow ? `${emp.pregnantNow}${emp.pregnancyMonths ? ` (${emp.pregnancyMonths} months)` : ''}` : '—';
    const familyPlanning = emp.familyPlanningType ? `${emp.familyPlanningType}${emp.familyPlanningYears ? ` (${emp.familyPlanningYears} years)` : ''}` : '—';
    const otherFindings = emp.assessmentOtherFindings || '—';
    const physicalNotes = emp.newPhysicalNotes || '—';

    const yesNo = (value) => value ? 'Yes' : 'No';
    const kvRow = (label, value) => `<div class="kv-row"><span class="kv-key">${label}</span><span class="kv-val">${value}</span></div>`;

    const headToToeHtml = `
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#5DCAA5;"></div>
              <span class="panel-title">VIII. Head to Toe Assessment</span>
            </div>
            <div class="panel-body">
              ${kvRow('Normal thought processes', yesNo(emp.neuroNormalThought))}
              ${kvRow('Normal emotional status', yesNo(emp.neuroNormalEmotional))}
              ${kvRow('Normal psychological status', yesNo(emp.neuroNormalPsych))}
              ${kvRow('How do you feel right now', emp.neuroHowFeel || '—')}
              ${kvRow('Other neurological findings', emp.neuroOthers || '—')}
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
              ${kvRow('Normal breath sounds', yesNo(emp.respNormalBreathSounds))}
              ${kvRow('Symmetrical chest expansion', yesNo(emp.respSymChestExpansion))}
              ${kvRow('Retractions', yesNo(emp.respRetractions))}
              ${kvRow('Crackles / rates', yesNo(emp.respCracklesRates))}
              ${kvRow('Wheezing', yesNo(emp.respWheezing))}
              ${kvRow('Clear breath sounds', yesNo(emp.respClearBreathSounds))}
              ${kvRow('Normal heartbeat', yesNo(emp.cardioNormalHeartBeat))}
              ${kvRow('Clubbing of fingers', yesNo(emp.cardioClubbing))}
              ${kvRow('Finger discoloration', yesNo(emp.cardioFingerDiscoloration))}
              ${kvRow('Heart murmur', yesNo(emp.cardioHeartMurmur))}
              ${kvRow('Irregular heartbeat', yesNo(emp.cardioIrregularHeartBeat))}
              ${kvRow('Palpitations', yesNo(emp.cardioPalpitations))}
              ${kvRow('Fluid volume excess', yesNo(emp.cardioFluidVolumeExcess))}
              ${kvRow('Fatigue on mobility', yesNo(emp.cardioFatigueMobility))}
              ${kvRow('Regular bowel movement', yesNo(emp.giRegularBowel))}
              ${kvRow('Bowel movements per day', emp.giBowelPerDay || '—')}
              ${kvRow('Borborygmi', emp.giBorborygmi || '—')}
              ${kvRow('Constipation', yesNo(emp.giConstipation))}
              ${kvRow('Loose bowel movement', yesNo(emp.giLooseBowel))}
              ${kvRow('Hyperacidity', yesNo(emp.giHyperacidity))}
              ${kvRow('Flank pain', yesNo(emp.urinaryFlankPain))}
              ${kvRow('Painful urination', yesNo(emp.urinaryPainful))}
              ${kvRow('Urination frequency', emp.urinaryFrequency || '—')}
              ${kvRow('Amount per voiding', emp.urinaryAmountPerVoiding || '—')}
              ${kvRow('Pallor', yesNo(emp.integPallor))}
              ${kvRow('Rashes', yesNo(emp.integRashes))}
              ${kvRow('Jaundice', yesNo(emp.integJaundice))}
              ${kvRow('Skin turgor', yesNo(emp.integSkinTurgor))}
              ${kvRow('Cyanosis', yesNo(emp.integCyanosis))}
              ${kvRow('Gross deformity', yesNo(emp.extegGrossDeformity))}
              ${kvRow('Normal gait', yesNo(emp.extegNormalGait))}
              ${kvRow('Normal strength', yesNo(emp.extegNormalStrength))}
              ${kvRow('Extremities other findings', emp.extegOthers || '—')}
              ${kvRow('Other pertinent findings', otherFindings)}
            </div>
          </div>
    `;

    const appendixScreeningHtml = `
          <div class="panel">
            <div class="panel-head">
              <div class="panel-dot" style="background:#7F77DD;"></div>
              <span class="panel-title">IX. Appendix A — Physical Examination</span>
            </div>
            <div class="panel-body">
              ${kvRow('Height', emp.appendixHeight ? `${emp.appendixHeight} cm` : '—')}
              ${kvRow('Weight', emp.appendixWeight ? `${emp.appendixWeight} kg` : '—')}
              ${kvRow('Blood pressure', emp.appendixBP || '—')}
              ${kvRow('Pulse rate', emp.appendixPulse || '—')}
              ${kvRow('Respiration', emp.appendixRespiration || '—')}
              ${kvRow('SpO2', emp.appendixSpO2 || '—')}
              ${kvRow('BMI', emp.appendixBMI || '—')}
              ${kvRow('BMI class', emp.appendixBMIClass || '—')}
              ${kvRow('Vision corrected', yesNo(emp.appendixVisionCorrected))}
              ${kvRow('Vision uncorrected', yesNo(emp.appendixVisionUncorrected))}
              ${kvRow('Right vision (OD)', emp.appendixOD || '—')}
              ${kvRow('Left vision (OS)', emp.appendixOS || '—')}
              ${kvRow('Color vision', emp.appendixColorVision || '—')}
              ${kvRow('Ear/Hearing AD', emp.appendixEarAD || '—')}
              ${kvRow('Ear/Hearing AS', emp.appendixEarAS || '—')}
              ${kvRow('CBC', emp.appendixCBC || '—')}
              ${kvRow('Stool exam', emp.appendixStool || '—')}
              ${kvRow('Pregnancy test', emp.appendixPregnancyTest || '—')}
              ${kvRow('Urinalysis', emp.appendixUrinalysis || '—')}
              ${kvRow('X-ray', emp.appendixXray || '—')}
              ${kvRow('Hep B', emp.appendixHepB || '—')}
              ${kvRow('Blood type', emp.appendixBloodType || '—')}
              ${kvRow('MMSE', emp.appendixMMSE || '—')}
              ${kvRow('Diagnosis', emp.appendixDiagnosis || '—')}
              ${kvRow('Remarks', emp.appendixRemarks || '—')}
              ${kvRow('School Nurse', emp.appendixSchoolNurse || '—')}
              ${kvRow('School Nurse License', emp.appendixSchoolNurseLicense || '—')}
              ${kvRow('Physician', emp.appendixPhysician || '—')}
              ${kvRow('Physician License', emp.appendixPhysicianLicense || '—')}
              ${kvRow('Date Filed', emp.appendixDateFiled || '—')}
              ${kvRow('File No.', emp.appendixFileNo || '—')}
              ${kvRow('Recorded By', emp.appendixRecordedBy || '—')}
            </div>
          </div>
    `;
    
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${emp.name} — Medical Record</title>
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
              <div class="emp-role">${emp.occupation || 'N/A'} &nbsp;·&nbsp; Classification: ${(emp.class || '').replace('Class ', '')}<br>${emp.id} &nbsp;·&nbsp; Contact: ${emp.contact || 'N/A'}</div>
            </div>
            <div class="vitals-grid">
              <div class="vital"><div class="vital-label">DOB</div><div class="vital-val">${emp.birthday ? new Date(emp.birthday).toLocaleDateString('en-PH') : 'N/A'}</div></div>
              <div class="vital"><div class="vital-label">Age</div><div class="vital-val">${emp.age || 'N/A'}</div></div>
              <div class="vital"><div class="vital-label">Gender</div><div class="vital-val">${emp.gender || 'N/A'}</div></div>
            </div>
          </div>
          ${emp.condition && emp.condition !== 'None' ? `<div class="alert-strip"><div class="alert-icon">!</div><span>Medical Alert — ${emp.condition}. Inform all medical personnel before any treatment or procedure.</span></div>` : ''}
          <div class="grid-2">
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#378ADD;"></div>
                <span class="panel-title">I. Personal Details</span>
              </div>
              <div class="panel-body">
                <div class="kv-row"><span class="kv-key">Gender</span><span class="kv-val">${emp.gender || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Civil Status</span><span class="kv-val">${emp.civilStatus || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Religion</span><span class="kv-val">${emp.religion || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Mobile</span><span class="kv-val">${emp.contact || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Address</span><span class="kv-val">${emp.address || '—'}</span></div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div class="panel-dot" style="background:#D4537E;"></div>
                <span class="panel-title">II. Emergency Contact</span>
              </div>
              <div class="panel-body">
                <div class="kv-row"><span class="kv-key">Name</span><span class="kv-val">${emp.emergencyName || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Relationship</span><span class="kv-val">${emp.emergencyRelationship || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Mobile</span><span class="kv-val">${emp.emergencyContact || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Address</span><span class="kv-val">${emp.emergencyAddress || '—'}</span></div>
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
              <div class="kv-row"><span class="kv-key">Disability</span><span class="kv-val">${emp.disabilitySpecify || '—'}</span></div>
              <div class="kv-row"><span class="kv-key">Registered</span><span class="kv-val">${emp.disabilityRegistered || '—'}</span></div>
              <div class="kv-row"><span class="kv-key">Donate Blood</span><span class="kv-val">${emp.donateBlood || '—'}</span></div>
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
                <div class="kv-row"><span class="kv-key">Mother's Side</span><span class="kv-val">${emp.familyHistoryMother || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Father's Side</span><span class="kv-val">${emp.familyHistoryFather || '—'}</span></div>
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
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Convert to PDF instead of printing
    setTimeout(() => {
        html2canvas(printWindow.document.body, {
            scale: 2,
            useCORS: true,
            logging: false
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png');
            const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
            
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pageWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            const fileName = `Employee_Profile_${emp.id}_${new Date().toISOString().slice(0, 10)}.pdf`;\n            doc.save(fileName);
            printWindow.close();
            showToast('Profile saved as PDF!', 'green');
        }).catch(err => {
            console.error('PDF generation error:', err);\n            showToast('Error generating PDF', 'red');\n        });\n    }, 500);\n}\n\nfunction exportEmployeeConsultations(emp, consultIndex) {
    const printWindow = window.open('', '_blank');
    const initials = (emp.name || ' ').split(',').map(s => s.trim()[0]).join('').slice(0,2).toUpperCase();
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
                <span class="panel-title">Consultation — ${c.date || 'N/A'} @ ${c.time || 'N/A'}</span>
              </div>
              <div class="panel-body">
                <div class="kv-row"><span class="kv-key">Date</span><span class="kv-val">${c.date || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Time</span><span class="kv-val">${c.time || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Type</span><span class="kv-val">${c.consultType || c.type || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Blood Pressure</span><span class="kv-val">${c.bp || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Heart Rate</span><span class="kv-val">${c.hr || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Respiratory Rate</span><span class="kv-val">${c.rr || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Temperature</span><span class="kv-val">${c.temp || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Height</span><span class="kv-val">${c.height || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Weight</span><span class="kv-val">${c.weight || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Chief Complaint</span><span class="kv-val">${c.chiefComplaint || '—'}</span></div>
                <div class="kv-row"><span class="kv-key">Treatment/Plan</span><span class="kv-val">${c.plan || '—'}</span></div>
              </div>
            </div>`).join('')
        : `<div class="panel" style="margin-bottom:1rem;"><div class="panel-body"><p style="color:#666; text-align:center;">No consultations recorded.</p></div></div>`;

    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${emp.name} — Consultation Record</title>
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
              <div class="emp-role">${emp.occupation || 'N/A'} &nbsp;·&nbsp; ${emp.id}<br>Contact: ${emp.contact || 'N/A'}</div>
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
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Convert to PDF instead of printing
    setTimeout(() => {
        html2canvas(printWindow.document.body, {
            scale: 2,
            useCORS: true,
            logging: false
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png');
            const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
            
            const pageHeight = doc.internal.pageSize.getHeight();
            const pageWidth = doc.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pageWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            const fileName = `Consultation_Records_${emp.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);
            printWindow.close();
            showToast('Consultation records saved as PDF!', 'green');
        }).catch(err => {
            console.error('PDF generation error:', err);
            showToast('Error generating PDF', 'red');
        });
    }, 500);
}

function exportSelectedEmployee() {
    const selectedId = exportEmployeeSelect.value;
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
    exportModal.style.display = 'block';
}

function closeExportModal() {
    exportModal.style.display = 'none';
}

exportTypeSelect.onchange = () => {
    toggleExportConsultationDateGroup();
};

exportEmployeeSelect.onchange = () => {
    updateExportConsultationDates();
};

importBtn.onclick = openImportModal;
exportBtn.onclick = openExportModal;
closeExportModalBtn.onclick = closeExportModal;
cancelExportBtn.onclick = closeExportModal;
confirmExportBtn.onclick = exportSelectedEmployee;

closeImportModalBtn.onclick = closeImportModal;
cancelImportBtn.onclick = closeImportModal;
confirmImportBtn.onclick = () => {
    if (!importTypeSelect.value) {
        alert('Please choose an import type.');
        return;
    }
    fileInput.click();
};

fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        await processScannedForm(file, importTypeSelect?.value || 'consultation');
        fileInput.value = '';
        closeImportModal();
    } catch (error) {
        showToast('❌ Error processing scan', 'red');
        console.error(error);
    }
};

function openImportModal() {
    if (importModal) importModal.style.display = 'block';
}

function closeImportModal() {
    if (importModal) importModal.style.display = 'none';
}
