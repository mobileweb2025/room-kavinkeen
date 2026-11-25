import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';

// Firebase web configuration identifies the project; access is controlled by rules.
const app = initializeApp({
  apiKey: 'AIzaSyCdPpsW7x4MRQsV6iv30apCaatnttuJJEw',
  authDomain: 'smart-room-kavinkeen.firebaseapp.com',
  databaseURL: 'https://smart-room-kavinkeen-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'smart-room-kavinkeen',
  storageBucket: 'smart-room-kavinkeen.firebasestorage.app',
  messagingSenderId: '329920615952',
  appId: '1:329920615952:web:b28c1074f7d9073ae91c95'
});
const auth = getAuth(app), db = getDatabase(app);
const $ = id => document.getElementById(id);
let stopRoom, stopConnection, stopOffset, timestamp = null, connected = false, clockOffset = 0, readError = false;
function showStatus(text, kind = '') {
  $('status').textContent = text;
  $('status').className = 'status ' + kind;
}
function updateStatus() {
  if (readError) return showStatus('Access error', 'offline');
  if (!connected) return showStatus('Disconnected', 'offline');
  if (!Number.isFinite(timestamp)) return showStatus('Waiting for data');
  const age = Date.now() + clockOffset - timestamp;
  if (age < -5000) return showStatus('Check device time', 'offline');
  if (age > 35000) return showStatus('No recent update', 'offline');
  showStatus('Online', 'online');
}
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); $('loginError').textContent = ''; $('signIn').disabled = true;
  try { await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value); }
  catch (error) { $('loginError').textContent = error.code === 'auth/network-request-failed' ? 'Network error. Check your internet connection.' : 'Sign-in failed. Check your monitoring email and password.'; }
  finally { $('password').value = ''; $('signIn').disabled = false; }
});
$('logout').addEventListener('click', () => signOut(auth).catch(() => { $('dataError').textContent = 'Sign-out failed. Please try again.'; }));
onAuthStateChanged(auth, user => {
  stopRoom?.(); stopConnection?.(); stopOffset?.(); timestamp = null; connected = false; clockOffset = 0; readError = false;
  for (const id of ['temperature','humidity','lastUpdate']) $(id).textContent = '—';
  $('dataError').textContent = ''; $('login').hidden = !!user; $('dashboard').hidden = !user; $('logout').hidden = !user;
  if (!user) return;
  updateStatus();
  stopConnection = onValue(ref(db, '.info/connected'), s => { connected = s.val() === true; updateStatus(); });
  stopOffset = onValue(ref(db, '.info/serverTimeOffset'), s => { clockOffset = Number(s.val()) || 0; updateStatus(); });
  stopRoom = onValue(ref(db, 'room'), snap => {
    const data = snap.val() || {};
    $('temperature').textContent = Number.isFinite(data.temperature) ? data.temperature.toFixed(1) : '—';
    $('humidity').textContent = Number.isFinite(data.humidity) ? data.humidity.toFixed(0) : '—';
    timestamp = Number.isFinite(data.timestamp) ? data.timestamp : null;
    $('lastUpdate').textContent = timestamp !== null ? new Date(timestamp).toLocaleString() : '—';
    readError = false; $('dataError').textContent = ''; updateStatus();
  }, () => { readError = true; $('dataError').textContent = 'Cannot read sensor data. Check Firebase Database Rules for this account.'; updateStatus(); });
});
setInterval(updateStatus, 1000);
