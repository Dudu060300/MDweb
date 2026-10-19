// Login / registrazione per index.html
// Richiede firebase-init.js (che definisce `auth` e `db`).
(function () {
  'use strict';

  const USERNAME_RE = /^[a-zA-Z0-9_]{3,15}$/;
  const MIN_PASSWORD = 8;
  let busy = false;


  // ---------- Utility ----------
  const el = (id) => document.getElementById(id);

  function appError(code) {
    const e = new Error(code);
    e.code = code;
    return e;
  }

  const MESSAGES = {
    'app/username-taken': 'Username già utilizzato.',
    'auth/invalid-credential': 'Credenziali non valide.',
    'auth/wrong-password': 'Credenziali non valide.',
    'auth/user-not-found': 'Credenziali non valide.',
    'auth/invalid-email': 'Email non valida.',
    'auth/email-already-in-use': 'Email già registrata.',
    'auth/weak-password': 'Password troppo debole.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova più tardi.',
    'auth/network-request-failed': 'Problema di rete. Riprova.',
    'auth/account-exists-with-different-credential':
      'Esiste già un account con questa email usando un altro metodo di accesso.',
    'auth/unauthorized-domain':
      'Dominio non autorizzato: aggiungilo in Firebase → Authentication → Settings.'
  };

  function showError(err) {
    console.error(err);
    alert(MESSAGES[err && err.code] || 'Si è verificato un errore. Riprova.');
  }

  function setBusy(value) {
    busy = value;
    document.querySelectorAll('button').forEach((b) => (b.disabled = value));
  }

  function goHome() {
    document.body.classList.add('login-transition');
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 800);
  }

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const isValidPassword = (pw) => pw.length >= MIN_PASSWORD;
  const isValidUsername = (u) => USERNAME_RE.test(u);

  // ---------- Profilo e username ----------
  // Crea in modo atomico usernames/{lower} e users/{uid}.
  // Se lo username è già preso, la transazione fallisce: niente duplicati.
  function claimUsername(user, username, email) {
    const lower = username.toLowerCase();
    const nameRef = db.collection('usernames').doc(lower);
    const userRef = db.collection('users').doc(user.uid);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(nameRef);
      if (snap.exists) throw appError('app/username-taken');
      tx.set(nameRef, { uid: user.uid, email: email });
      tx.set(userRef, {
        username: username,
        usernameLower: lower,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }

  function suggestUsername(user) {
    const raw = user.displayName || (user.email || '').split('@')[0] || '';
    let base = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
    if (base.length < 3) base = 'user' + Math.floor(1000 + Math.random() * 9000);
    return base;
  }

  // Per Google/Apple: se l'utente non ha ancora un profilo, ne crea uno.
  async function ensureProfile(user) {
    const snap = await db.collection('users').doc(user.uid).get();
    if (snap.exists) return;

    const base = suggestUsername(user);
    for (let i = 0; i < 6; i++) {
      const suffix = String(Math.floor(100 + Math.random() * 900));
      const candidate = i === 0 ? base : base.slice(0, 11) + '_' + suffix; // max 15
      try {
        await claimUsername(user, candidate, user.email);
        await user.updateProfile({ displayName: candidate }).catch(() => {});
        return;
      } catch (e) {
        if (e.code !== 'app/username-taken') throw e;
      }
    }
    throw appError('app/username-taken');
  }

  // ---------- Login con email o username ----------
  async function login() {
    if (busy) return;
    const input = el('loginEmail').value.trim();
    const password = el('loginPassword').value;

    if (!input || !password) {
      alert('Inserisci email/username e password.');
      return;
    }

    setBusy(true);
    try {
      let email = input;
      if (!input.includes('@')) {
        if (!isValidUsername(input)) throw appError('auth/invalid-credential');
        const snap = await db.collection('usernames').doc(input.toLowerCase()).get();
        // Messaggio generico: non rivela se lo username esiste
        if (!snap.exists) throw appError('auth/invalid-credential');
        email = snap.data().email;
      }
      await auth.signInWithEmailAndPassword(email, password);
      goHome();
    } catch (err) {
      showError(err);
      setBusy(false);
    }
  }

  // ---------- Registrazione ----------
  async function register() {
    if (busy) return;
    const email = el('regEmail').value.trim();
    const password = el('regPassword').value;
    const username = el('regName').value.trim();

    if (!isValidEmail(email)) return alert('Email non valida.');
    if (!isValidPassword(password))
      return alert('La password deve avere almeno ' + MIN_PASSWORD + ' caratteri.');
    if (!isValidUsername(username))
      return alert('Username non valido: 3-15 caratteri, lettere, numeri o underscore.');

    setBusy(true);
    try {
      // Controllo veloce (evita di creare account inutilmente)
      const existing = await db.collection('usernames').doc(username.toLowerCase()).get();
      if (existing.exists) throw appError('app/username-taken');

      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const user = cred.user;

      try {
        // Garanzia vera di unicità (transazione)
        await claimUsername(user, username, email);
      } catch (e) {
        // Annulla l'account appena creato: niente account senza profilo
        await user.delete().catch(() => {});
        throw e;
      }

      await user.updateProfile({ displayName: username }).catch(() => {});
      goHome();
    } catch (err) {
      showError(err);
      setBusy(false);
    }
  }

  // ---------- Google / Apple ----------
  async function socialLogin(provider) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await auth.signInWithPopup(provider);
      await ensureProfile(result.user);
      goHome();
    } catch (err) {
      // Popup bloccato o non supportato (es. web app su iPhone): passa al redirect
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        try {
          await auth.signInWithRedirect(provider);
          return;
        } catch (e) {
          err = e;
        }
      }
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request'
      ) {
        showError(err);
      }
      setBusy(false);
    }
  }

  function googleLogin() {
    return socialLogin(new firebase.auth.GoogleAuthProvider());
  }

  function appleLogin() {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return socialLogin(provider);
  }

  // Esito di un eventuale signInWithRedirect
  auth
    .getRedirectResult()
    .then(async (result) => {
      if (result && result.user) {
        setBusy(true);
        await ensureProfile(result.user);
        goHome();
      }
    })
    .catch((err) => {
      showError(err);
      setBusy(false);
    });

  // ---------- Animazione flip del form ----------
  function flipCard() {
    el('formContainer').classList.toggle('flipped');
  }

  // ---------- Invio con Enter ----------
  function onEnter(id, fn) {
    const node = el(id);
    if (!node) return;
    node.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') fn();
    });
  }
  onEnter('loginPassword', login);
  onEnter('regPassword', register);

  // Funzioni usate dagli onclick nell'HTML
  window.login = login;
  window.register = register;
  window.googleLogin = googleLogin;
  window.appleLogin = appleLogin;
  window.flipCard = flipCard;
})();
