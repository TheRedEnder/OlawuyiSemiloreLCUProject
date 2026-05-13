// ==================== FIREBASE VERSION ====================
// This script replaces localStorage with Firestore (global database)

let currentUser = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM loaded");
    
    // Check which page we're on
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // On login/register pages, just initialize auth state listener
    if (filename === 'index.html' || filename === 'register.html') {
        // Listen to auth state changes
        if (window.auth) {
            window.auth.onAuthStateChanged(async (user) => {
                if (user && (filename === 'index.html')) {
                    // Already logged in, redirect to dashboard
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const role = userDoc.data().role;
                        window.location.href = role === 'lecturer' ? 'lecturer.html' : 'student.html';
                    }
                }
            });
        }
        return;
    }
    
    // For protected pages (lecturer.html, student.html)
    if (window.auth) {
        window.auth.onAuthStateChanged(async (user) => {
            if (!user) {
                alert('Please login first');
                window.location.href = 'index.html';
                return;
            }
            
            // Get additional user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                alert('User data not found');
                window.auth.signOut();
                window.location.href = 'index.html';
                return;
            }
            
            currentUser = {
                uid: user.uid,
                email: user.email,
                ...userDoc.data()
            };
            
            // Check role matches page
            if (filename === 'lecturer.html' && currentUser.role !== 'lecturer') {
                alert('Access denied. Lecturers only.');
                window.location.href = 'index.html';
            } else if (filename === 'student.html' && currentUser.role !== 'student') {
                alert('Access denied. Students only.');
                window.location.href = 'index.html';
            } else {
                // Load dashboard
                if (filename === 'lecturer.html') loadLecturerDashboard();
                else if (filename === 'student.html') loadStudentDashboard();
            }
        });
    } else {
        alert('Firebase not initialized. Please check SDK.');
    }
});

// ==================== LOGIN ====================
async function login() {
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        showMessage('Enter email and password', 'error');
        return;
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;
        
        // Get role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            showMessage('User profile not found', 'error');
            await signOut(window.auth);
            return;
        }
        
        const role = userDoc.data().role;
        showMessage('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = role === 'lecturer' ? 'lecturer.html' : 'student.html';
        }, 1000);
    } catch (error) {
        console.error(error);
        showMessage('Invalid email or password', 'error');
    }
}

// ==================== REGISTER ====================
async function register() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = window.selectedRole || 'student';
    
    if (!fullName || !email || !password || !confirmPassword) {
        showMessage('Please fill all fields', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const uid = userCredential.user.uid;
        
        // Prepare Firestore user data
        const userData = {
            uid: uid,
            fullName: fullName,
            email: email,
            role: role,
            createdAt: new Date().toISOString()
        };
        
        if (role === 'student') {
            const studentDept = document.getElementById('studentDept').value;
            if (!studentDept) throw new Error('Please select department');
            let matricNumber = document.getElementById('matricNumber').value.trim();
            if (!matricNumber) {
                matricNumber = `LCU/UG/22/${Math.floor(Math.random() * 10000)}`;
            }
            userData.matricNumber = matricNumber;
            userData.level = document.getElementById('level').value;
            userData.department = studentDept;
        } else {
            const lecturerDept = document.getElementById('lecturerDept').value;
            if (!lecturerDept) throw new Error('Please select department');
            userData.department = lecturerDept;
        }
        
        // Save to Firestore
        await setDoc(doc(db, 'users', uid), userData);
        
        showMessage('Registration successful! Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        console.error(error);
        // If Auth user was created but Firestore failed, delete the Auth user
        if (error.code === 'auth/email-already-in-use') {
            showMessage('Email already registered', 'error');
        } else if (error.message && error.message.includes('department')) {
            // If department missing, delete the just-created auth user
            const user = window.auth.currentUser;
            if (user) await user.delete();
            showMessage(error.message, 'error');
        } else {
            // Generic error: attempt to clean up Auth user if it exists
            const user = window.auth.currentUser;
            if (user) await user.delete();
            showMessage('Registration failed: ' + error.message, 'error');
        }
    }
}

function showMessage(text, type) {
    let div = document.getElementById('messageContainer');
    if (!div) {
        div = document.createElement('div');
        div.id = 'messageContainer';
        div.style.cssText = 'position:fixed; top:20px; right:20px; padding:15px 20px; border-radius:5px; color:white; z-index:1000; font-weight:bold;';
        document.body.appendChild(div);
    }
    div.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    div.textContent = text;
    setTimeout(() => { if (div) div.remove(); }, 3000);
}

async function logout() {
    await signOut(window.auth);
    window.location.href = 'index.html';
}

// ==================== SAMPLE DATA SEEDING (Firestore) ====================
async function seedSampleData() {
    // Check if courses collection is empty
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    if (!coursesSnapshot.empty) return;
    
    // Get lecturer user (must exist first – create manually in console or register)
    const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'lecturer')));
    let lecturerId = null;
    if (!usersSnapshot.empty) {
        lecturerId = usersSnapshot.docs[0].id;
    } else {
        console.log("No lecturer found, skipping sample courses");
        return;
    }
    
    const sampleCourses = [
        { code: 'CSC301', title: 'Database Systems', day: 'Monday', time: '10:00-12:00', venue: 'MLT 101', capacity: 50, credits: 3, level: '400', lecturerId: lecturerId, createdAt: new Date().toISOString() },
        { code: 'CSC101', title: 'Intro to Programming', day: 'Tuesday', time: '09:00-11:00', venue: 'LT 2', capacity: 60, credits: 3, level: '100', lecturerId: lecturerId, createdAt: new Date().toISOString() }
    ];
    
    for (const course of sampleCourses) {
        await addDoc(collection(db, 'courses'), course);
    }
    console.log("Sample courses added");
}

// ==================== LECTURER FUNCTIONS ====================
async function loadLecturerDashboard() {
    if (!currentUser) return;
    document.getElementById('lecturerName').innerText = currentUser.fullName || 'Lecturer';
    await displayCourses();
    await seedSampleData(); // optional seeding
}

async function addCourse(event) {
    event.preventDefault();
    const code = document.getElementById('courseCode').value.trim();
    const title = document.getElementById('courseTitle').value.trim();
    const day = document.getElementById('courseDay').value;
    const time = document.getElementById('courseTime').value;
    const venue = document.getElementById('courseVenue').value.trim();
    const capacity = parseInt(document.getElementById('courseCapacity').value);
    const credits = parseInt(document.getElementById('courseCredits')?.value || 3);
    const level = document.getElementById('courseLevel').value;
    
    if (!code || !title || !day || !time || !venue || !capacity) {
        alert('Fill all fields');
        return;
    }
    
    // Check if course code already exists
    const q = query(collection(db, 'courses'), where('code', '==', code));
    const existing = await getDocs(q);
    if (!existing.empty) {
        alert('Course code already exists');
        return;
    }
    
    const newCourse = {
        code, title, day, time, venue, capacity, credits, level,
        lecturerId: currentUser.uid,
        lecturerName: currentUser.fullName,
        createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'courses'), newCourse);
    document.getElementById('courseForm').reset();
    await displayCourses();
    alert('Course added');
}

async function displayCourses() {
    const container = document.getElementById('coursesList');
    if (!container) return;
    
    const q = query(collection(db, 'courses'), where('lecturerId', '==', currentUser.uid));
    const snapshot = await getDocs(q);
    const myCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (myCourses.length === 0) {
        container.innerHTML = '<p class="empty-state">No courses added yet.</p>';
        return;
    }
    
    let html = '';
    for (const course of myCourses) {
        // Get enrollment count
        const enrollSnapshot = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', course.id)));
        const enrolledCount = enrollSnapshot.size;
        
        html += `
            <div class="course-item">
                <div><h4>${course.code} - ${course.title} (${course.credits} credits, ${course.level} level)</h4>
                <p>${course.day} ${course.time} | ${course.venue} | ${enrolledCount}/${course.capacity}</p></div>
                <div class="course-actions">
                    <button onclick="editCourse('${course.id}')" class="edit-course-btn">✏️ Edit</button>
                    <button onclick="viewEnrollments('${course.id}')" class="view-btn">👥 View</button>
                    <button onclick="deleteCourse('${course.id}')" class="delete-btn">🗑️ Delete</button>
                </div>
            </div>`;
    }
    container.innerHTML = html;
}

async function editCourse(courseId) {
    const docRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(docRef);
    if (!courseSnap.exists()) return;
    const course = courseSnap.data();
    
    // Populate modal fields
    document.getElementById('editCourseId').value = courseId;
    document.getElementById('editCourseCode').value = course.code;
    document.getElementById('editCourseTitle').value = course.title;
    document.getElementById('editCourseDay').value = course.day;
    document.getElementById('editCourseTime').value = course.time;
    document.getElementById('editCourseVenue').value = course.venue;
    document.getElementById('editCourseCapacity').value = course.capacity;
    document.getElementById('editCourseCredits').value = course.credits;
    document.getElementById('editCourseLevel').value = course.level;
    
    openEditModal();
}

function openEditModal() {
    document.getElementById('editModal').style.display = 'block';
    document.body.classList.add('modal-open');
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}

async function saveCourseEdit(e) {
    e.preventDefault();
    const courseId = document.getElementById('editCourseId').value;
    const updatedData = {
        title: document.getElementById('editCourseTitle').value.trim(),
        day: document.getElementById('editCourseDay').value,
        time: document.getElementById('editCourseTime').value,
        venue: document.getElementById('editCourseVenue').value.trim(),
        capacity: parseInt(document.getElementById('editCourseCapacity').value),
        credits: parseInt(document.getElementById('editCourseCredits').value),
        level: document.getElementById('editCourseLevel').value
    };
    
    await updateDoc(doc(db, 'courses', courseId), updatedData);
    closeEditModal();
    await displayCourses();
    alert('Course updated');
}

async function viewEnrollments(courseId) {
    const enrollSnapshot = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)));
    const enrollments = enrollSnapshot.docs.map(d => d.data());
    const container = document.getElementById('enrollmentList');
    
    if (enrollments.length === 0) {
        container.innerHTML = `<p class="empty-state">No students enrolled.</p>`;
        return;
    }
    let html = `<h4>Enrolled Students</h4>`;
    enrollments.forEach(e => {
        html += `<div class="enrollment-item">${e.studentName} (${e.studentId})</div>`;
    });
    container.innerHTML = html;
}

async function deleteCourse(courseId) {
    if (!confirm('Delete this course and all enrollments?')) return;
    
    // Delete enrollments for this course
    const enrollSnapshot = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)));
    const deletePromises = [];
    enrollSnapshot.docs.forEach(docSnap => {
        deletePromises.push(deleteDoc(doc(db, 'enrollments', docSnap.id)));
    });
    await Promise.all(deletePromises);
    
    // Delete course
    await deleteDoc(doc(db, 'courses', courseId));
    await displayCourses();
    document.getElementById('enrollmentList').innerHTML = '<p class="loading-text">Select a course to view enrolled students</p>';
    alert('Course deleted');
}

// ==================== STUDENT FUNCTIONS ====================
async function loadStudentDashboard() {
    if (!currentUser) return;
    document.getElementById('studentName').innerText = currentUser.fullName;
    document.getElementById('studentId').innerText = currentUser.matricNumber || currentUser.uid;
    if (currentUser.level) {
        const thirdLabel = document.querySelector('.info-item:nth-child(3) .info-label');
        const thirdValue = document.querySelector('.info-item:nth-child(3) .info-value');
        if (thirdLabel) thirdLabel.innerText = 'Level:';
        if (thirdValue) thirdValue.innerText = currentUser.level;
    }
    await displayAvailableCourses();
    await displayStudentCourses();
}

async function displayAvailableCourses() {
    // Get all courses of student's level
    const q = query(collection(db, 'courses'), where('level', '==', currentUser.level));
    const courseSnapshot = await getDocs(q);
    const courses = courseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get student's enrollments
    const enrollSnapshot = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
    const myEnrollments = enrollSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const registeredIds = myEnrollments.map(e => e.courseId);
    
    const container = document.getElementById('availableCoursesList');
    if (courses.length === 0) {
        container.innerHTML = '<p class="empty-state">No courses available for your level.</p>';
        return;
    }
    
    let html = '';
    for (const course of courses) {
        const enrolledCount = (await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', course.id)))).size;
        const isRegistered = registeredIds.includes(course.id);
        const isFull = enrolledCount >= course.capacity;
        const hasClash = !isRegistered && checkForClash(course, myEnrollments);
        
        let cardClass = 'course-card';
        if (isRegistered) cardClass += ' registered';
        if (hasClash) cardClass += ' clashing';
        
        html += `
            <div class="${cardClass}">
                <div><h4>${course.title} (${course.code})</h4>
                <p>${course.day} ${course.time} | ${course.venue} | ${course.credits} credits</p>
                <p>Capacity: ${enrolledCount}/${course.capacity}</p></div>
                ${isRegistered ? `<button onclick="dropCourse('${course.id}')" class="drop-btn">Drop</button>` :
                `<button onclick="registerCourse('${course.id}')" class="register-btn" ${isFull || hasClash ? 'disabled' : ''}>${isFull ? 'Full' : (hasClash ? 'Time Clash' : 'Register')}</button>`}
            </div>`;
    }
    container.innerHTML = html;
}

function checkForClash(newCourse, existingEnrollments) {
    
    if (!existingEnrollments.length) return false;

    return false;
}

async function registerCourse(courseId) {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) return alert('Course not found');
    const course = courseSnap.data();
    
    // Check if already registered
    const existingEnroll = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId), where('studentId', '==', currentUser.uid)));
    if (!existingEnroll.empty) return alert('Already registered');
    
    // Check capacity
    const enrollCount = (await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)))).size;
    if (enrollCount >= course.capacity) return alert('Course full');
    
    // Check clash (fetch existing courses)
    const myEnrollments = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
    let hasClash = false;
    for (const enrollDoc of myEnrollments.docs) {
        const existingCourseSnap = await getDoc(doc(db, 'courses', enrollDoc.data().courseId));
        if (existingCourseSnap.exists()) {
            const existingCourse = existingCourseSnap.data();
            if (existingCourse.day === course.day) {
                const [ns, ne] = parseTimeRange(course.time);
                const [es, ee] = parseTimeRange(existingCourse.time);
                if (ns < ee && ne > es) {
                    hasClash = true;
                    break;
                }
            }
        }
    }
    if (hasClash) return alert('Time clash with existing course!');
    
    // Register
    await addDoc(collection(db, 'enrollments'), {
        courseId: courseId,
        studentId: currentUser.uid,
        studentName: currentUser.fullName,
        enrolledAt: new Date().toISOString()
    });
    
    await displayAvailableCourses();
    await displayStudentCourses();
    alert('Registered successfully');
}

async function dropCourse(courseId) {
    if (!confirm('Drop this course?')) return;
    const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId), where('studentId', '==', currentUser.uid));
    const snap = await getDocs(q);
    if (snap.empty) return alert('You are not registered');
    await deleteDoc(doc(db, 'enrollments', snap.docs[0].id));
    await displayAvailableCourses();
    await displayStudentCourses();
    alert('Course dropped');
}

async function displayStudentCourses() {
    const enrollSnapshot = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
    const myEnrollments = enrollSnapshot.docs.map(d => d.data());
    const myCourses = [];
    for (const enroll of myEnrollments) {
        const courseSnap = await getDoc(doc(db, 'courses', enroll.courseId));
        if (courseSnap.exists()) myCourses.push({ id: enroll.courseId, ...courseSnap.data() });
    }
    
    document.getElementById('registeredCount').innerText = myCourses.length;
    const totalCredits = myCourses.reduce((sum, c) => sum + (c.credits || 3), 0);
    document.getElementById('totalCredits').innerText = totalCredits;
    
    const container = document.getElementById('registeredCoursesList');
    if (myCourses.length === 0) {
        container.innerHTML = '<p class="empty-state">No registered courses.</p>';
    } else {
        let html = '';
        myCourses.forEach(c => {
            html += `<div class="registered-item"><div><strong>${c.code} - ${c.title}</strong><br>${c.day} ${c.time} | ${c.venue}</div>
                     <button onclick="dropCourse('${c.id}')" class="small-btn">Drop</button></div>`;
        });
        container.innerHTML = html;
    }
    generateTimetable(myCourses);
}

function generateTimetable(myCourses) {
    const container = document.getElementById('timetable');
    if (!myCourses.length) {
        container.innerHTML = '<p class="empty-state">No timetable yet</p>';
        return;
    }
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const slots = ['08:00-10:00','10:00-12:00','12:00-14:00','14:00-16:00','16:00-18:00'];
    let html = '<table class="timetable"><tr><th>Time</th>';
    days.forEach(d => html += `<th>${d}</th>`);
    html += '<tr>';
    slots.forEach(slot => {
        const [slotStart, slotEnd] = parseTimeRange(slot);
        html += `<tr><td class="time-slot">${slot}</td>`;
        days.forEach(day => {
            const cells = myCourses.filter(c => c.day === day && (() => {
                const [cs, ce] = parseTimeRange(c.time);
                return cs < slotEnd && ce > slotStart;
            })());
            html += '<td>';
            cells.forEach(c => html += `<div class="course-slot"><b>${c.code}</b><br>${c.venue}</div>`);
            html += '</td>';
        });
        html += '</tr>';
    });
    html += '</table>';
    container.innerHTML = html;
}

function parseTimeRange(t) {
    const [s, e] = t.split('-');
    return [toMins(s.trim()), toMins(e.trim())];
}
function toMins(s) {
    const [h, m] = s.split(':');
    return parseInt(h) * 60 + parseInt(m || 0);
}

function filterCourses() {
    displayAvailableCourses();
}

// Helper function to ensure Firestore is loaded (already in window)