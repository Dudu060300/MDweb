// ==========================================
// AUTH.JS COMPLETO (MDweb)
// ==========================================
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
    'auth/network-request-failed': 'Problema di rete. Riprova.',
    'auth/operation-not-allowed': 'Metodo di accesso non abilitato nella console Firebase.'
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

  // ---------- CONTROLLI IN TEMPO REALE ----------
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
      const existing = await db.collection('usernames').doc(username.toLowerCase()).get();
      if (existing.exists) throw appError('app/username-taken');

      temporaryUserData = { email, password, username };

      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.sendEmailVerification();

      alert('Ti è stata inviata un\'email di verifica. Controlla la tua casella di posta per confermare l\'indirizzo.');
      
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
      await user.reload();
      
      if (!user.emailVerified) {
        alert('L\'email non è stata ancora verificata. Clicca sul link ricevuto via email e poi premi conferma.');
        setBusy(false);
        return;
      }

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
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      user.delete().catch(() => {});
    }
    el('regStep2').style.display = 'none';
    el('regStep1').style.display = 'block';
    temporaryUserData = null;
  };

  // ---------- LOGIN CLASSICO ----------
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

  // ---------- SOCIAL LOGIN (MODIFICATO: SOLO POPUP, NESSUN REDIRECT) ----------
  async function socialLogin(provider) {
    if (busy) return;
    setBusy(true);
    try {
      // Forza l'apertura tramite popup integrato
      const result = await auth.signInWithPopup(provider);
      await ensureProfile(result.user);
      goHome();
    } catch (err) {
      console.error("Errore Social Login:", err);
      if (
        err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request'
      ) {
        showError(err);
      }
      setBusy(false);
    }
  }

  async function ensureProfile(user) {
    const userDocRef = db.collection('users').doc(user.uid);
    const snap = await userDocRef.get();
    if (snap.exists) return;

    const raw = user.displayName || (user.email || '').split('@')[0] || '';
    let base = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
    if (base.length < 3) base = 'user' + Math.floor(1000 + Math.random() * 9000);

    for (let i = 0; i < 6; i++) {
      const suffix = String(Math.floor(100 + Math.random() * 900));
      const candidate = i === 0 ? base : base.slice(0, 11) + '_' + suffix;
      try {
        const lower = candidate.toLowerCase();
        await db.runTransaction(async (tx) => {
          const nameRef = db.collection('usernames').doc(lower);
          const snapName = await tx.get(nameRef);
          if (snapName.exists) throw appError('app/username-taken');
          
          tx.set(nameRef, { uid: user.uid, email: user.email });
          tx.set(userDocRef, {
            username: candidate,
            usernameLower: lower,
            email: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        if (user.updateProfile) {
          await user.updateProfile({ displayName: candidate }).catch(() => {});
        }
        return;
      } catch (e) {
        if (e.code !== 'app/username-taken') throw e;
      }
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

  function flipCard() {
    el('formContainer').classList.toggle('flipped');
  }

  function onEnter(id, fn) {
    const node = el(id);
    if (!node) return;
    node.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') fn();
    });
  }
  onEnter('loginPassword', login);
  onEnter('regPassword', sendOtpAndProceed);

  // Esportazione funzioni globali
  window.login = login;
  window.googleLogin = googleLogin;
  window.appleLogin = appleLogin;
  window.flipCard = flipCard;
})();
