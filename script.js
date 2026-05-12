// ==================== GLOBAL ====================
let currentUser = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded");
    initializeUsers();
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    checkAuthentication(filename);
    if (filename.includes('lecturer.html')) loadLecturerDashboard();
    else if (filename.includes('student.html')) loadStudentDashboard();
    initializeData();
});

function initializeUsers() {
    if (!localStorage.getItem('users')) {
        const defaultUsers = [
            { id: 'LEC001', username: 'drsmith', password: 'lecturer123', fullName: 'Dr. Smith', role: 'lecturer', email: 'dr.smith@university.edu', department: 'Computer Science', createdAt: new Date().toISOString() },
            { id: 'LEC002', username: 'drjones', password: 'lecturer123', fullName: 'Dr. Jones', role: 'lecturer', email: 'dr.jones@university.edu', department: 'Computer Science', createdAt: new Date().toISOString() },
            { id: 'STU001', username: 'john_doe', password: 'student123', fullName: 'John Doe', role: 'student', email: 'john.doe@student.edu', matricNumber: 'LCU/UG/22/1001', level: '400', department: 'Computer Science', createdAt: new Date().toISOString() },
            { id: 'STU002', username: 'jane_smith', password: 'student123', fullName: 'Jane Smith', role: 'student', email: 'jane.smith@student.edu', matricNumber: 'LCU/UG/22/1002', level: '400', department: 'Computer Science', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
        console.log("Default users created");
    }
}

function checkAuthentication(currentPage) {
    const userJson = sessionStorage.getItem('currentUser');
    if (currentPage === 'index.html' || currentPage === 'register.html' || currentPage === '') return;
    if (!userJson) { alert('Please login'); window.location.href = 'index.html'; return; }
    currentUser = JSON.parse(userJson);
    if (currentPage === 'lecturer.html' && currentUser.role !== 'lecturer') { alert('Access denied'); window.location.href = 'index.html'; }
    if (currentPage === 'student.html' && currentUser.role !== 'student') { alert('Access denied'); window.location.href = 'index.html'; }
}

function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) return showMessage('Enter username and password', 'error');
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = {
            id: user.id, username: user.username, fullName: user.fullName, role: user.role,
            email: user.email, matricNumber: user.matricNumber, level: user.level,
            studentId: user.id, department: user.department
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMessage('Login successful', 'success');
        setTimeout(() => { window.location.href = user.role === 'lecturer' ? 'lecturer.html' : 'student.html'; }, 1000);
    } else showMessage('Invalid credentials', 'error');
}

// FIXED register function
function register() {
    console.log("register() called");
    
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = window.selectedRole || 'student';
    console.log("Role:", role);

    // Basic validation
    if (!fullName || !username || !email || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
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

    let users = JSON.parse(localStorage.getItem('users')) || [];

    // Check username & email uniqueness
    if (users.some(u => u.username === username)) {
        showMessage('Username already exists', 'error');
        return;
    }
    if (users.some(u => u.email === email)) {
        showMessage('Email already registered', 'error');
        return;
    }

    // Create base user object
    const newUser = {
        id: role === 'lecturer' ? 'LEC' + Date.now() : 'STU' + Date.now(),
        username: username,
        password: password,
        fullName: fullName,
        role: role,
        email: email,
        createdAt: new Date().toISOString()
    };

    // Role-specific fields
    if (role === 'student') {
        const studentDept = document.getElementById('studentDept').value;
        if (!studentDept) {
            showMessage('Please select your department', 'error');
            return;
        }
        
        // Matric number validation (uniqueness + auto-generate)
        let matricNumber = document.getElementById('matricNumber').value.trim();
        
        // If user provided a matric number, check it's not already used
        if (matricNumber) {
            const existingStudentWithSameMatric = users.find(u => u.role === 'student' && u.matricNumber === matricNumber);
            if (existingStudentWithSameMatric) {
                showMessage('Matric number already registered. Please use a different one or leave blank for auto-generation.', 'error');
                return;
            }
        } else {
            // Auto-generate a unique matric number
            let baseMatric = `LCU/UG/22/`;
            let randomNum = Math.floor(Math.random() * 10000);
            matricNumber = baseMatric + randomNum;
            // Ensure it's unique (in case of collision)
            while (users.some(u => u.role === 'student' && u.matricNumber === matricNumber)) {
                randomNum = Math.floor(Math.random() * 10000);
                matricNumber = baseMatric + randomNum;
            }
        }
        
        newUser.matricNumber = matricNumber;
        newUser.level = document.getElementById('level').value;
        newUser.department = studentDept;
        
        console.log("Student created with matric:", matricNumber);
    } 
    else { // lecturer
        const lecturerDept = document.getElementById('lecturerDept').value;
        if (!lecturerDept) {
            showMessage('Please select your department', 'error');
            return;
        }
        newUser.department = lecturerDept;
        console.log("Lecturer dept:", lecturerDept);
    }

    // Save user
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    console.log("User saved:", newUser);

    showMessage('Registration successful! Redirecting to login...', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
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
    setTimeout(() => {
        if (div) div.remove();
    }, 3000);
}
// ==================== DELETE ACCOUNT ====================
function deleteAccount() {
    if (!currentUser) {
        alert("No user logged in");
        return;
    }
    
    const confirmMsg = currentUser.role === 'lecturer' 
        ? "⚠️ WARNING: Deleting your lecturer account will permanently remove ALL your courses and all student enrollments for those courses. This action cannot be undone. Are you absolutely sure?"
        : "Are you sure you want to delete your student account? All your course registrations will be removed. This action cannot be undone.";
    
    if (!confirm(confirmMsg)) return;
    
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let courses = JSON.parse(localStorage.getItem('courses')) || [];
    let enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
    
    if (currentUser.role === 'lecturer') {
        // Get all course codes created by this lecturer
        const lecturerCourseCodes = courses.filter(c => c.lecturerId === currentUser.id).map(c => c.code);
        
        // Remove those courses
        courses = courses.filter(c => c.lecturerId !== currentUser.id);
        
        // Remove enrollments for those courses
        enrollments = enrollments.filter(e => !lecturerCourseCodes.includes(e.courseId));
        
        // Remove the lecturer user
        users = users.filter(u => u.id !== currentUser.id);
        
        // Save updated data
        localStorage.setItem('courses', JSON.stringify(courses));
        localStorage.setItem('enrollments', JSON.stringify(enrollments));
        localStorage.setItem('users', JSON.stringify(users));
        
        alert("Lecturer account and all associated courses/enrollments deleted.");
    } 
    else { // student
        // Remove student's enrollments only (courses remain)
        enrollments = enrollments.filter(e => e.studentId !== currentUser.id);
        
        // Remove student user
        users = users.filter(u => u.id !== currentUser.id);
        
        // Save
        localStorage.setItem('enrollments', JSON.stringify(enrollments));
        localStorage.setItem('users', JSON.stringify(users));
        
        alert("Student account and your registrations deleted.");
    }
    
    // Logout and redirect
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function initializeData() {
    if (!localStorage.getItem('courses')) {
        const sampleCourses = [
            { id: 'CSC301', code: 'CSC301', title: 'Database Systems', day: 'Monday', time: '10:00-12:00', venue: 'MLT 101', capacity: 50, credits: 3, level: '400', lecturer: 'Dr. Smith', lecturerId: 'LEC001', createdAt: new Date().toISOString() },
            { id: 'CSC101', code: 'CSC101', title: 'Intro to Programming', day: 'Tuesday', time: '09:00-11:00', venue: 'LT 2', capacity: 60, credits: 3, level: '100', lecturer: 'Dr. Smith', lecturerId: 'LEC001', createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('courses', JSON.stringify(sampleCourses));
        console.log("Sample courses added");
    }
    if (!localStorage.getItem('enrollments')) {
        localStorage.setItem('enrollments', JSON.stringify([]));
    }
}

// ==================== LECTURER FUNCTIONS ====================
function loadLecturerDashboard() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (user) currentUser = user;
    document.getElementById('lecturerName').innerText = currentUser?.fullName || 'Lecturer';
    displayCourses();
}

function addCourse(event) {
    event.preventDefault();
    const code = document.getElementById('courseCode').value.trim();
    const title = document.getElementById('courseTitle').value.trim();
    const day = document.getElementById('courseDay').value;
    const time = document.getElementById('courseTime').value;
    const venue = document.getElementById('courseVenue').value.trim();
    const capacity = parseInt(document.getElementById('courseCapacity').value);
    const credits = parseInt(document.getElementById('courseCredits')?.value || 3);
    const level = document.getElementById('courseLevel').value;
    if (!code || !title || !day || !time || !venue || !capacity) return alert('Fill all fields');
    let courses = JSON.parse(localStorage.getItem('courses')) || [];
    if (courses.find(c => c.code === code)) return alert('Course code exists');
    const newCourse = {
        id: code, code, title, day, time, venue, capacity, credits, level,
        lecturer: currentUser.fullName, lecturerId: currentUser.id, createdAt: new Date().toISOString()
    };
    courses.push(newCourse);
    localStorage.setItem('courses', JSON.stringify(courses));
    document.getElementById('courseForm').reset();
    displayCourses();
    alert('Course added');
}

function displayCourses() {
    const container = document.getElementById('coursesList');
    if (!container) return;
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const myCourses = courses.filter(c => c.lecturerId === currentUser.id);
    if (!myCourses.length) { container.innerHTML = '<p class="empty-state">No courses</p>'; return; }
    let html = '';
    myCourses.forEach(c => {
        const enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
        const count = enrollments.filter(e => e.courseId === c.code).length;
        html += `
            <div class="course-item">
                <div><h4>${c.code} - ${c.title} (${c.credits} credits, ${c.level} level)</h4>
                <p>${c.day} ${c.time} | ${c.venue} | ${count}/${c.capacity}</p></div>
                <div class="course-actions">
                    <button onclick="editCourse('${c.code}')" class="edit-course-btn">✏️ Edit</button>
                    <button onclick="viewEnrollments('${c.code}')" class="view-btn">👥 View</button>
                    <button onclick="deleteCourse('${c.code}')" class="delete-btn">🗑️ Delete</button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

function editCourse(code) {
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const c = courses.find(c => c.code === code);
    if (!c) return;
    document.getElementById('editCourseId').value = c.code;
    document.getElementById('editCourseCode').value = c.code;
    document.getElementById('editCourseTitle').value = c.title;
    document.getElementById('editCourseDay').value = c.day;
    document.getElementById('editCourseTime').value = c.time;
    document.getElementById('editCourseVenue').value = c.venue;
    document.getElementById('editCourseCapacity').value = c.capacity;
    document.getElementById('editCourseCredits').value = c.credits;
    document.getElementById('editCourseLevel').value = c.level;
    openEditModal();  // Use the new function
}
function openEditModal() {
    document.getElementById('editModal').style.display = 'block';
    document.body.classList.add('modal-open');  // Prevent background scroll
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.body.classList.remove('modal-open');
}
function saveCourseEdit(e) {
    e.preventDefault();
    const code = document.getElementById('editCourseId').value;
    let courses = JSON.parse(localStorage.getItem('courses')) || [];
    const idx = courses.findIndex(c => c.code === code);
    if (idx !== -1) {
        courses[idx].title = document.getElementById('editCourseTitle').value.trim();
        courses[idx].day = document.getElementById('editCourseDay').value;
        courses[idx].time = document.getElementById('editCourseTime').value;
        courses[idx].venue = document.getElementById('editCourseVenue').value.trim();
        courses[idx].capacity = parseInt(document.getElementById('editCourseCapacity').value);
        courses[idx].credits = parseInt(document.getElementById('editCourseCredits').value);
        courses[idx].level = document.getElementById('editCourseLevel').value;
        localStorage.setItem('courses', JSON.stringify(courses));
        closeEditModal();
        displayCourses();
        alert('Course updated');
    }
}
function viewEnrollments(code) {
    const enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
    const courseEnroll = enrollments.filter(e => e.courseId === code);
    const container = document.getElementById('enrollmentList');
    if (!courseEnroll.length) { container.innerHTML = `<p class="empty-state">No students in ${code}</p>`; return; }
    let html = `<h4>Students in ${code}</h4>`;
    courseEnroll.forEach(e => { html += `<div class="enrollment-item">${e.studentName} (${e.studentId})</div>`; });
    container.innerHTML = html;
}
function deleteCourse(code) {
    if (!confirm('Delete course and enrollments?')) return;
    let courses = JSON.parse(localStorage.getItem('courses')) || [];
    courses = courses.filter(c => c.code !== code);
    localStorage.setItem('courses', JSON.stringify(courses));
    let enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
    enrollments = enrollments.filter(e => e.courseId !== code);
    localStorage.setItem('enrollments', JSON.stringify(enrollments));
    displayCourses();
    document.getElementById('enrollmentList').innerHTML = '<p class="loading-text">Select a course</p>';
}

// ==================== STUDENT FUNCTIONS ====================
function loadStudentDashboard() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (user) currentUser = user;
    document.getElementById('studentName').innerText = currentUser.fullName;
    document.getElementById('studentId').innerText = currentUser.matricNumber || currentUser.id;
    if (currentUser.level) {
        const thirdItem = document.querySelector('.info-item:nth-child(3) .info-label');
        if (thirdItem) thirdItem.innerText = 'Level:';
        const thirdValue = document.querySelector('.info-item:nth-child(3) .info-value');
        if (thirdValue) thirdValue.innerText = currentUser.level;
    }
    displayAvailableCourses();
    displayStudentCourses();
}

function displayAvailableCourses() {
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
    const studentId = currentUser.id;
    const myEnrollments = enrollments.filter(e => e.studentId === studentId);
    const registeredIds = myEnrollments.map(e => e.courseId);
    const levelCourses = courses.filter(c => c.level === currentUser.level);
    const container = document.getElementById('availableCoursesList');
    if (!levelCourses.length) { container.innerHTML = '<p class="empty-state">No courses available for your level</p>'; return; }
    let html = '';
    levelCourses.forEach(course => {
        const enrolledCount = enrollments.filter(e => e.courseId === course.code).length;
        const isRegistered = registeredIds.includes(course.code);
        const isFull = enrolledCount >= course.capacity;
        const hasClash = !isRegistered && checkForClash(course, myEnrollments);
        let cardClass = 'course-card';
        if (isRegistered) cardClass += ' registered';
        if (hasClash) cardClass += ' clashing';
        html += `
            <div class="${cardClass}">
                <div><h4>${course.title} (${course.code})</h4><p>${course.day} ${course.time} | ${course.venue} | ${course.credits} credits</p>
                <p>Capacity: ${enrolledCount}/${course.capacity}</p></div>
                ${isRegistered ? `<button onclick="dropCourse('${course.code}')" class="drop-btn">Drop</button>` :
                `<button onclick="registerCourse('${course.code}')" class="register-btn" ${isFull || hasClash ? 'disabled' : ''}>${isFull ? 'Full' : (hasClash ? 'Time Clash' : 'Register')}</button>`}
            </div>`;
    });
    container.innerHTML = html;
}

function checkForClash(newCourse, existingEnrollments) {
    if (!existingEnrollments.length) return false;
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    for (let enroll of existingEnrollments) {
        const existing = courses.find(c => c.code === enroll.courseId);
        if (existing && existing.day === newCourse.day) {
            const [ns, ne] = parseTimeRange(newCourse.time);
            const [es, ee] = parseTimeRange(existing.time);
            if (ns < ee && ne > es) return true;
        }
    }
    return false;
}

function parseTimeRange(t) { const [s,e] = t.split('-'); return [toMins(s.trim()), toMins(e.trim())]; }
function toMins(s) { const [h,m] = s.split(':'); return parseInt(h)*60 + parseInt(m||0); }

function registerCourse(courseCode) {
    let enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
    let courses = JSON.parse(localStorage.getItem('courses')) || [];
    const studentId = currentUser.id;
    if (enrollments.some(e => e.courseId === courseCode && e.studentId === studentId)) return alert('Already registered');
    const course = courses.find(c => c.code === courseCode);
    const enrolledCount = enrollments.filter(e => e.courseId === courseCode).length;
    if (enrolledCount >= course.capacity) return alert('Course full');
    const myEnrollments = enrollments.filter(e => e.studentId === studentId);
    if (checkForClash(course, myEnrollments)) return alert('Time clash!');
    enrollments.push({ courseId: courseCode, studentId, studentName: currentUser.fullName, enrolledAt: new Date().toISOString() });
    localStorage.setItem('enrollments', JSON.stringify(enrollments));
    displayAvailableCourses();
    displayStudentCourses();
    alert('Registered');
}

function dropCourse(courseCode) {
    if (!confirm(`Drop ${courseCode}? This will remove it from your timetable.`)) return;
    
    let enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
    const studentId = currentUser.id;
    
    // Remove only this student's enrollment for this course
    const newEnrollments = enrollments.filter(e => !(e.courseId === courseCode && e.studentId === studentId));
    
    if (newEnrollments.length === enrollments.length) {
        alert("You were not registered for this course.");
        return;
    }
    
    localStorage.setItem('enrollments', JSON.stringify(newEnrollments));
    
    // Refresh both available courses and registered courses/timetable
    displayAvailableCourses();   // Updates course list (enables register button again)
    displayStudentCourses();     // Updates registered list, credits, and timetable
    
    alert(`Successfully dropped ${courseCode}`);
}

function displayStudentCourses() {
    const enrollments = JSON.parse(localStorage.getItem('enrollments')) || [];
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const myE = enrollments.filter(e => e.studentId === currentUser.id);
    const myCourses = myE.map(e => courses.find(c => c.code === e.courseId)).filter(c => c);
    document.getElementById('registeredCount').innerText = myCourses.length;
    const totalCredits = myCourses.reduce((s,c) => s + (c.credits || 3), 0);
    document.getElementById('totalCredits').innerText = totalCredits;
    const container = document.getElementById('registeredCoursesList');
    if (!myCourses.length) { container.innerHTML = '<p class="empty-state">No registered courses</p>'; return; }
    let html = '';
    myCourses.forEach(c => {
        html += `<div class="registered-item"><div><strong>${c.code} - ${c.title}</strong><br>${c.day} ${c.time} | ${c.venue}</div>
                 <button onclick="dropCourse('${c.code}')" class="small-btn">Drop</button></div>`;
    });
    container.innerHTML = html;
    generateTimetable(myCourses);
}
function generateTimetable(myCourses) {
    const container = document.getElementById('timetable');
    if (!myCourses.length) { container.innerHTML = '<p class="empty-state">No timetable yet</p>'; return; }
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
    html += '</tr>';
    container.innerHTML = html;
}
function filterCourses() { displayAvailableCourses(); }