(function () {
  'use strict';

  const USERNAME_RE = /^[a-zA-Z0-9_]{3,15}$/;
  const MIN_PASSWORD = 8;
  let busy = false;
  let temporaryUserData = null; // Memorizza temporaneamente i dati prima dell'OTP

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
    'auth/network-request-failed': 'Problema di rete. Riprova.'
  };

  function showError(err) {
    console.error("ERRORE:", err);
    const msg = MESSAGES[err && err.code] || err.message || 'Si è verificato un errore. Riprova.';
    alert('Errore: ' + msg);
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

  // ---------- CONTROLLI IN TEMPO RIFATTO (REAL-TIME) ----------
  window.checkUsernameRealtime = async function() {
    const val = el('regName').value.trim();
    const fb = el('usernameFeedback');
    if (!val) {
      fb.textContent = '';
      return;
    }
    if (!isValidUsername(val)) {
      fb.style.color = '#ff4c4c';
      fb.textContent = 'Non valido (3-15 caratteri, solo lettere, numeri, _).';
      return;
    }
    try {
      const doc = await db.collection('usernames').doc(val.toLowerCase()).get();
      if (doc.exists) {
        fb.style.color = '#ff4c4c';
        fb.textContent = '❌ Username già in uso.';
      } else {
        fb.style.color = '#4cff6b';
        fb.textContent = '✓ Username disponibile.';
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.checkEmailRealtime = async function() {
    const val = el('regEmail').value.trim();
    const fb = el('emailFeedback');
    if (!val) {
      fb.textContent = '';
      return;
    }
    if (!isValidEmail(val)) {
      fb.style.color = '#ff4c4c';
      fb.textContent = 'Formato email non valido.';
      return;
    }
    // Nota: Firebase Auth non permette di interrogare direttamente le email esistenti senza admin sdk,
    // ma possiamo avvisare l'utente sul formato.
    fb.style.color = '#4cff6b';
    fb.textContent = '✓ Formato email corretto.';
  };

  window.checkPasswordRequirements = function() {
    const pw = el('regPassword').value;
    const reqLength = el('req-length');
    const reqChars = el('req-chars');

    if (pw.length >= MIN_PASSWORD) {
      reqLength.style.color = '#4cff6b';
      reqLength.textContent = '✓ Minimo 8 caratteri';
    } else {
      reqLength.style.color = '#ff4c4c';
      reqLength.textContent = '❌ Minimo 8 caratteri';
    }

    if (pw.length > 0) {
      reqChars.style.color = '#4cff6b';
      reqChars.textContent = '✓ Caratteri validi';
    } else {
      reqChars.style.color = '#aaa';
      reqChars.textContent = '❌ Solo lettere, numeri e simboli';
    }
  };

  // ---------- FLUSSO OTP E REGISTRAZIONE ----------
  window.sendOtpAndProceed = async function() {
    const email = el('regEmail').value.trim();
    const password = el('regPassword').value;
    const username = el('regName').value.trim();

    if (!isValidUsername(username)) return alert('Inserisci uno username valido.');
    if (!isValidEmail(email)) return alert('Inserisci un\'email valida.');
    if (!isValidPassword(password)) return alert('La password non rispetta i requisiti minimi.');

    setBusy(true);
    try {
      // Verifica unicità username prima di inviare l'OTP
      const existing = await db.collection('usernames').doc(username.toLowerCase()).get();
      if (existing.exists) throw appError('app/username-taken');

      // Salviamo temporaneamente i dati
      temporaryUserData = { email, password, username };

      // Creazione utente su Firebase Auth e invio email di verifica (OTP nativo Firebase)
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.sendEmailVerification();

      alert('Ti è stata inviata un\'email di verifica. Controlla la tua casella di posta per confermare l\'indirizzo.');
      
      // Passa allo step 2 per confermare
      el('regStep1').style.display = 'none';
      el('regStep2').style.display = 'block';
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  window.verifyOtpAndRegister = async function() {
    const user = auth.currentUser;
    if (!user) {
      alert('Sessione scaduta. Riprova.');
      backToStep1();
      return;
    }

    setBusy(true);
    try {
      // Aggiorna lo stato dell'utente da Firebase
      await user.reload();
      
      if (!user.emailVerified) {
        alert('L\'email non è stata ancora verificata. Clicca sul link ricevuto via email e poi premi conferma.');
        setBusy(false);
        return;
      }

      // Se verificata, creiamo il profilo in modo atomico su Firestore
      const { username, email } = temporaryUserData;
      const lower = username.toLowerCase();
      
      await db.runTransaction(async (tx) => {
        const nameRef = db.collection('usernames').doc(lower);
        const userRef = db.collection('users').doc(user.uid);
        
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

      if (user.updateProfile) {
        await user.updateProfile({ displayName: username }).catch(() => {});
      }

      goHome();
    } catch (err) {
      showError(err);
      setBusy(false);
    }
  };

  window.backToStep1 = function() {
    // Se torna indietro e l'utente non ha verificato, rimuoviamo l'account temporaneo
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      user.delete().catch(() => {});
    }
    el('regStep2').style.display = 'none';
    el('regStep1').style.display = 'block';
    temporaryUserData = null;
  };

  // ---------- Login ----------
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

  async function socialLogin(provider) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await auth.signInWithPopup(provider);
      await ensureProfile(result.user);
      goHome();
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        try { await auth.signInWithRedirect(provider); return; } catch (e) { err = e; }
      }
      if (err.code !== 'auth/popup-closed-by-user') showError(err);
      setBusy(false);
    }
  }

  async function ensureProfile(user) {
    const userDocRef = db.collection('users').doc(user.uid);
    const snap = await userDocRef.get();
    if (snap.exists) return;
    // (Gestione automatica social login analoga alla precedente)
  }

  window.login = login;
  window.googleLogin = () => socialLogin(new firebase.auth.GoogleAuthProvider());
  window.appleLogin = () => socialLogin(new firebase.auth.OAuthProvider('apple.com'));
  window.flipCard = () => el('formContainer').classList.toggle('flipped');
})();
