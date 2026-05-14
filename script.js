// ==================== FIREBASE MODULE IMPORTS ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2nx7iEv30APiUe6fetUUAkZ0iKe7Amrw",
  authDomain: "course-reg-project-semilore.firebaseapp.com",
  projectId: "course-reg-project-semilore",
  storageBucket: "course-reg-project-semilore.firebasestorage.app",
  messagingSenderId: "809300143596",
  appId: "1:809300143596:web:9f3f17af1f753a16b124c9",
  measurementId: "G-FK124YD4DF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';
  
  if (filename === 'index.html' || filename === 'register.html') {
    onAuthStateChanged(auth, async (user) => {
      if (user && filename === 'index.html') {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          window.location.href = role === 'lecturer' ? 'lecturer.html' : 'student.html';
        }
      }
    });
    return;
  }
  
  // Protected pages
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert('Please login first');
      window.location.href = 'index.html';
      return;
    }
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      alert('User data not found');
      await signOut(auth);
      window.location.href = 'index.html';
      return;
    }
    currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
    
    if (filename === 'lecturer.html' && currentUser.role !== 'lecturer') {
      alert('Access denied');
      window.location.href = 'index.html';
    } else if (filename === 'student.html' && currentUser.role !== 'student') {
      alert('Access denied');
      window.location.href = 'index.html';
    } else {
      if (filename === 'lecturer.html') loadLecturerDashboard();
      else if (filename === 'student.html') loadStudentDashboard();
    }
  });
});

// ==================== LOGIN ====================
async function login() {
  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!email || !password) return showMessage('Enter email and password', 'error');
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) throw new Error('No profile');
    const role = userDoc.data().role;
    showMessage('Login successful!', 'success');
    setTimeout(() => {
      window.location.href = role === 'lecturer' ? 'lecturer.html' : 'student.html';
    }, 1000);
  } catch (error) {
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
  
  if (!fullName || !email || !password || !confirmPassword) return showMessage('Fill all fields', 'error');
  if (password !== confirmPassword) return showMessage('Passwords do not match', 'error');
  if (password.length < 6) return showMessage('Password min 6 characters', 'error');
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    const userData = { uid, fullName, email, role, createdAt: new Date().toISOString() };
    
    if (role === 'student') {
      const studentDept = document.getElementById('studentDept').value;
      if (!studentDept) throw new Error('Select department');
      let matricNumber = document.getElementById('matricNumber').value.trim();
      if (!matricNumber) matricNumber = `LCU/UG/22/${Math.floor(Math.random() * 10000)}`;
      userData.matricNumber = matricNumber;
      userData.level = document.getElementById('level').value;
      userData.department = studentDept;
    } else {
      const lecturerDept = document.getElementById('lecturerDept').value;
      if (!lecturerDept) throw new Error('Select department');
      userData.department = lecturerDept;
    }
    
    await setDoc(doc(db, 'users', uid), userData);
    showMessage('Registration successful! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'index.html', 2000);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      showMessage('Email already registered', 'error');
    } else {
      showMessage(error.message || 'Registration failed', 'error');
    }
  }
}

function showMessage(text, type) {
  let div = document.getElementById('messageContainer');
  if (!div) {
    div = document.createElement('div');
    div.id = 'messageContainer';
    div.style.cssText = 'position:fixed; top:20px; right:20px; padding:15px 20px; border-radius:5px; color:white; z-index:1000';
    document.body.appendChild(div);
  }
  div.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
  div.textContent = text;
  setTimeout(() => div.remove(), 3000);
}

async function logout() {
  await signOut(auth);
  window.location.href = 'index.html';
}

// ==================== LECTURER FUNCTIONS ====================
async function loadLecturerDashboard() {
  if (!currentUser) return;
  document.getElementById('lecturerName').innerText = currentUser.fullName;
  await displayCourses();
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
  if (!code || !title || !day || !time || !venue || !capacity) return alert('Fill all fields');
  
  const existing = await getDocs(query(collection(db, 'courses'), where('code', '==', code)));
  if (!existing.empty) return alert('Course code exists');
  
  await addDoc(collection(db, 'courses'), {
    code, title, day, time, venue, capacity, credits, level,
    lecturerId: currentUser.uid, lecturerName: currentUser.fullName,
    createdAt: new Date().toISOString()
  });
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
  if (!myCourses.length) { container.innerHTML = '<p class="empty-state">No courses</p>'; return; }
  let html = '';
  for (const course of myCourses) {
    const enrollCount = (await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', course.id)))).size;
    html += `
      <div class="course-item">
        <div><h4>${course.code} - ${course.title} (${course.credits} credits, ${course.level} level)</h4>
        <p>${course.day} ${course.time} | ${course.venue} | ${enrollCount}/${course.capacity}</p></div>
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
  const courseSnap = await getDoc(doc(db, 'courses', courseId));
  if (!courseSnap.exists()) return;
  const c = courseSnap.data();
  document.getElementById('editCourseId').value = courseId;
  document.getElementById('editCourseCode').value = c.code;
  document.getElementById('editCourseTitle').value = c.title;
  document.getElementById('editCourseDay').value = c.day;
  document.getElementById('editCourseTime').value = c.time;
  document.getElementById('editCourseVenue').value = c.venue;
  document.getElementById('editCourseCapacity').value = c.capacity;
  document.getElementById('editCourseCredits').value = c.credits;
  document.getElementById('editCourseLevel').value = c.level;
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
  await updateDoc(doc(db, 'courses', courseId), {
    title: document.getElementById('editCourseTitle').value.trim(),
    day: document.getElementById('editCourseDay').value,
    time: document.getElementById('editCourseTime').value,
    venue: document.getElementById('editCourseVenue').value.trim(),
    capacity: parseInt(document.getElementById('editCourseCapacity').value),
    credits: parseInt(document.getElementById('editCourseCredits').value),
    level: document.getElementById('editCourseLevel').value
  });
  closeEditModal();
  await displayCourses();
  alert('Course updated');
}
async function viewEnrollments(courseId) {
  const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
  const snap = await getDocs(q);
  const container = document.getElementById('enrollmentList');
  if (snap.empty) { container.innerHTML = '<p>No students</p>'; return; }
  let html = '<h4>Enrolled Students</h4>';
  snap.forEach(d => html += `<div class="enrollment-item">${d.data().studentName}</div>`);
  container.innerHTML = html;
}
async function deleteCourse(courseId) {
  if (!confirm('Delete course and enrollments?')) return;
  const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)));
  for (const docSnap of enrollSnap.docs) await deleteDoc(doc(db, 'enrollments', docSnap.id));
  await deleteDoc(doc(db, 'courses', courseId));
  await displayCourses();
  document.getElementById('enrollmentList').innerHTML = '<p>Select a course</p>';
  alert('Deleted');
}

// ==================== STUDENT FUNCTIONS ====================
async function loadStudentDashboard() {
  if (!currentUser) return;
  document.getElementById('studentName').innerText = currentUser.fullName;
  document.getElementById('studentId').innerText = currentUser.matricNumber || currentUser.uid;
  if (currentUser.level) {
    const lbl = document.querySelector('.info-item:nth-child(3) .info-label');
    const val = document.querySelector('.info-item:nth-child(3) .info-value');
    if (lbl) lbl.innerText = 'Level:';
    if (val) val.innerText = currentUser.level;
  }
  await displayAvailableCourses();
  await displayStudentCourses();
}

async function displayAvailableCourses() {
  const coursesSnap = await getDocs(query(collection(db, 'courses'), where('level', '==', currentUser.level)));
  const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const myEnrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
  const enrolledIds = myEnrollSnap.docs.map(d => d.data().courseId);
  const container = document.getElementById('availableCoursesList');
  if (!courses.length) { container.innerHTML = '<p>No courses for your level</p>'; return; }
  let html = '';
  for (const course of courses) {
    const enrollCount = (await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', course.id)))).size;
    const isRegistered = enrolledIds.includes(course.id);
    const isFull = enrollCount >= course.capacity;
    let hasClash = false;
    if (!isRegistered) {
      for (const enrollDoc of myEnrollSnap.docs) {
        const existingId = enrollDoc.data().courseId;
        const existingSnap = await getDoc(doc(db, 'courses', existingId));
        if (existingSnap.exists()) {
          const existing = existingSnap.data();
          if (existing.day === course.day) {
            const [ns, ne] = parseTimeRange(course.time);
            const [es, ee] = parseTimeRange(existing.time);
            if (ns < ee && ne > es) { hasClash = true; break; }
          }
        }
      }
    }
    html += `<div class="course-card ${isRegistered ? 'registered' : ''} ${hasClash ? 'clashing' : ''}">
      <div><h4>${course.title} (${course.code})</h4><p>${course.day} ${course.time} | ${course.venue} | ${course.credits} credits</p>
      <p>Capacity: ${enrollCount}/${course.capacity}</p></div>
      ${isRegistered ? `<button onclick="dropCourse('${course.id}')" class="drop-btn">Drop</button>` :
        `<button onclick="registerCourse('${course.id}')" class="register-btn" ${isFull || hasClash ? 'disabled' : ''}>${isFull ? 'Full' : (hasClash ? 'Clash' : 'Register')}</button>`}
    </div>`;
  }
  container.innerHTML = html;
}

async function registerCourse(courseId) {
  const courseSnap = await getDoc(doc(db, 'courses', courseId));
  if (!courseSnap.exists()) return alert('Course not found');
  const course = courseSnap.data();
  const existing = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId), where('studentId', '==', currentUser.uid)));
  if (!existing.empty) return alert('Already registered');
  const enrollCount = (await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseId)))).size;
  if (enrollCount >= course.capacity) return alert('Course full');
  const myEnrollments = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
  for (const enroll of myEnrollments.docs) {
    const existingSnap = await getDoc(doc(db, 'courses', enroll.data().courseId));
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      if (existing.day === course.day) {
        const [ns, ne] = parseTimeRange(course.time);
        const [es, ee] = parseTimeRange(existing.time);
        if (ns < ee && ne > es) return alert('Time clash!');
      }
    }
  }
  await addDoc(collection(db, 'enrollments'), {
    courseId, studentId: currentUser.uid, studentName: currentUser.fullName, enrolledAt: new Date().toISOString()
  });
  await displayAvailableCourses();
  await displayStudentCourses();
  alert('Registered');
}

async function dropCourse(courseId) {
  if (!confirm('Drop this course?')) return;
  const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId), where('studentId', '==', currentUser.uid));
  const snap = await getDocs(q);
  if (snap.empty) return alert('Not registered');
  await deleteDoc(doc(db, 'enrollments', snap.docs[0].id));
  await displayAvailableCourses();
  await displayStudentCourses();
  alert('Dropped');
}

async function displayStudentCourses() {
  const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
  const myCourses = [];
  for (const enroll of enrollSnap.docs) {
    const courseSnap = await getDoc(doc(db, 'courses', enroll.data().courseId));
    if (courseSnap.exists()) myCourses.push({ id: enroll.data().courseId, ...courseSnap.data() });
  }
  document.getElementById('registeredCount').innerText = myCourses.length;
  const totalCredits = myCourses.reduce((s,c) => s + (c.credits||3), 0);
  document.getElementById('totalCredits').innerText = totalCredits;
  const container = document.getElementById('registeredCoursesList');
  if (!myCourses.length) { container.innerHTML = '<p>No registered courses</p>'; return; }
  let html = '';
  myCourses.forEach(c => {
    html += `<div class="registered-item"><div><strong>${c.code} - ${c.title}</strong><br>${c.day} ${c.time} | ${c.venue}</div>
             <button onclick="dropCourse('${c.id}')" class="small-btn">Drop</button></div>`;
  });
  container.innerHTML = html;
  generateTimetable(myCourses);
}

function generateTimetable(myCourses) {
  const container = document.getElementById('timetable');
  if (!myCourses.length) { container.innerHTML = '<p>No timetable</p>'; return; }
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const slots = ['08:00-10:00','10:00-12:00','12:00-14:00','14:00-16:00','16:00-18:00'];
  let html = '<table class="timetable"><tr><th>Time</th>';
  days.forEach(d => html += `<th>${d}</th>`);
  html += '<tr>';
  slots.forEach(slot => {
    const [slotStart, slotEnd] = parseTimeRange(slot);
    html += `<tr><td class="time-slot">${slot}</tr>`;
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
  return parseInt(h)*60 + parseInt(m||0);
}
function filterCourses() { displayAvailableCourses(); }

// ==================== DELETE ACCOUNT (Basic Implementation) ====================
async function deleteAccount() {
  if (!currentUser) return alert('No user logged in');
  const confirmMsg = currentUser.role === 'lecturer' 
    ? 'WARNING: Deleting your lecturer account will remove ALL your courses and enrollments. This cannot be undone. Are you sure?'
    : 'Delete your student account? All your registrations will be removed. This cannot be undone.';
  if (!confirm(confirmMsg)) return;

  try {
    if (currentUser.role === 'lecturer') {
      // Delete all courses created by this lecturer
      const coursesSnap = await getDocs(query(collection(db, 'courses'), where('lecturerId', '==', currentUser.uid)));
      for (const courseDoc of coursesSnap.docs) {
        // Delete enrollments for this course
        const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('courseId', '==', courseDoc.id)));
        for (const enrollDoc of enrollSnap.docs) {
          await deleteDoc(doc(db, 'enrollments', enrollDoc.id));
        }
        await deleteDoc(doc(db, 'courses', courseDoc.id));
      }
    } else {
      // Student: delete their enrollments
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
      for (const enrollDoc of enrollSnap.docs) {
        await deleteDoc(doc(db, 'enrollments', enrollDoc.id));
      }
    }
    // Delete user document from Firestore
    await deleteDoc(doc(db, 'users', currentUser.uid));
    // Delete Firebase Auth user
    const user = auth.currentUser;
    if (user) await user.delete();
    alert('Account deleted successfully');
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error(error);
    alert('Error deleting account: ' + error.message);
  }
}

// ==================== EXPOSE FUNCTIONS TO GLOBAL SCOPE ====================
window.login = login;
window.register = register;
window.logout = logout;
window.addCourse = addCourse;
window.editCourse = editCourse;
window.closeEditModal = closeEditModal;
window.saveCourseEdit = saveCourseEdit;
window.viewEnrollments = viewEnrollments;
window.deleteCourse = deleteCourse;
window.registerCourse = registerCourse;
window.dropCourse = dropCourse;
window.filterCourses = filterCourses;
window.deleteAccount = deleteAccount;