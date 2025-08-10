const firebaseConfig = {
  apiKey: "AIzaSyA1U8IL5gdwoKmsdZgANGR_646ZDbjU50c",
  authDomain: "proghtml-2e571.firebaseapp.com",
  projectId: "proghtml-2e571",
  storageBucket: "proghtml-2e571.appspot.com",
  messagingSenderId: "771370443646",
  appId: "1:771370443646:web:5dd712f9e03448ebda2463"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const userMenu = document.getElementById('userMenu');
const logoutBtn = document.getElementById('logout');
const editProfileBtn = document.getElementById('editProfile');
const userIcon = document.getElementById('userIcon');
const userName = document.getElementById('userName');

// --- Dropdown menu accessibility and toggle ---
userMenu.addEventListener('click', () => {
  const expanded = userMenu.getAttribute('aria-expanded') === 'true';
  userMenu.setAttribute('aria-expanded', String(!expanded));
  userMenu.classList.toggle('open');
  // Aggiorna il nome utente ogni volta che si apre il menu
  if (!expanded) { // solo se il menu sta per aprirsi
    const user = auth.currentUser;
    if (user && userName) {
      userName.textContent = user.displayName || 'Utente';
    }
}
});

document.addEventListener('click', (e) => {
  if (!userMenu.contains(e.target)) {
    userMenu.setAttribute('aria-expanded', 'false');
    userMenu.classList.remove('open');
  }
});

userMenu.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    const expanded = userMenu.getAttribute('aria-expanded') === 'true';
    userMenu.setAttribute('aria-expanded', String(!expanded));
    userMenu.classList.toggle('open');
  } else if (e.key === 'Escape') {
    userMenu.setAttribute('aria-expanded', 'false');
    userMenu.classList.remove('open');
    userMenu.focus();
  }
});

// --- Logout ---
logoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  auth.signOut().then(() => {
    location.href = 'index.html';
  });
});

// --- Load profile from Firebase Auth ---
function loadUserProfile() {
  const user = auth.currentUser;
  if (!user) {
    showError ('Nessun utente autenticato.');
    return;
  }
  emailInput.value = user.email || '';
  usernameInput.value = user.displayName || '';
}

// --- Aggiorna UI username al login ---
auth.onAuthStateChanged(user => {
  if (user) {
    const providers = user.providerData.map(p => p.providerId);
    const isSocialLogin = providers.includes('google.com') || providers.includes('apple.com');

    if (isSocialLogin) {
      editProfileBtn.style.display = 'none';
    } else {
      editProfileBtn.style.display = 'inline-block';
    }

    if (userName) userName.textContent = user.displayName || 'Utente';
    if (userIcon) userIcon.textContent = (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U');
  } else {
    location.href = 'index.html';
  }
});

// Blocca apertura profilo.html se il bottone non è visibile o disabilitato
editProfileBtn.addEventListener('click', (e) => {
  if (editProfileBtn.style.display === 'none' || editProfileBtn.disabled) {
    e.preventDefault();
    return;
  }
  window.location.href = 'profilo.html';
});


document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const urlInput = e.target.querySelector('input[name="url"]');
  const videoUrl = urlInput.value.trim();
  if (!videoUrl) {
    alert('Inserisci un URL valido!');
    return;
  }

  // Disabilita il bottone per evitare più click
  const btn = document.getElementById('convert-btn');
  btn.disabled = true;
  btn.textContent = 'Converting...';

  try {
    // Fai la POST con fetch, aspettando il file mp3 come blob
    const response = await fetch('/convert-mp3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url: videoUrl })
    });

    if (!response.ok) {
      throw new Error('Errore nella conversione');
    }

    const blob = await response.blob();

    // Crea un link temporaneo per scaricare il file
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Imposta nome file (puoi cambiarlo se vuoi dinamico)
    a.download = 'video-converted.mp3';
    document.body.appendChild(a);
    a.click();

    // Pulizia
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download!';
  }
});