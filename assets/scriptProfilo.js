const firebaseConfig = {
  apiKey: "AIzaSyA1U8IL5gdwoKmsdZgANGR_646ZDbjU50c",
  authDomain: "proghtml-2e571.firebaseapp.com",
  projectId: "proghtml-2e571",
  storageBucket: "proghtml-2e571.appspot.com",
  messagingSenderId: "771370443646",
  appId: "1:771370443646:web:5dd712f9e03448ebda2463"
};

// Configura Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const emailInput = document.getElementById("emailInput");
const usernameInput = document.getElementById("usernameInput");
const oldPasswordInput = document.getElementById("oldPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");

const newPasswordLabel = document.getElementById("newPasswordLabel");
const confirmPasswordLabel = document.getElementById("confirmPasswordLabel");

const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");

const verifyPasswordBtn = document.getElementById("verifyPasswordBtn");
const changeUsernameBtn = document.getElementById("changeUsernameBtn");
const profileForm = document.getElementById("profileForm");
const userNameDisplay = document.getElementById("userName");
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById('logout');
const editProfileBtn = document.getElementById('editProfile');

// Stato di verifica password
let passwordVerified = false;

// Tasto indietro
document.getElementById('backButton').addEventListener('click', () => {
  window.history.back();
});

// Gestione menu a tendina
if (userMenu) {
  userMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = userMenu.classList.contains("open");
    userMenu.classList.toggle("open");
    userMenu.setAttribute("aria-expanded", !isOpen);
  });

  document.addEventListener("click", () => {
    userMenu.classList.remove("open");
    userMenu.setAttribute("aria-expanded", "false");
  });
}

// Recupera dati utente all'avvio
auth.onAuthStateChanged(async user => {
  if (user) {
    emailInput.value = user.email;

    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const username = userDoc.data().username || "Utente";
        usernameInput.value = username;
        if (userNameDisplay) userNameDisplay.textContent = username;

        // Mostra l'iniziale nello userIcon
        const userIcon = document.getElementById("userIcon");
        if (userIcon) {
          userIcon.textContent = username.charAt(0).toUpperCase();
        }
      }
    } catch (error) {
      console.error("Errore nel recupero dati utente:", error);
    }
  } else {
    window.location.href = "index.html";
  }
});

// Cambia username
changeUsernameBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const newUsername = usernameInput.value.trim();

  if (!newUsername) {
    showError("Lo username non può essere vuoto.");
    return;
  }

  try {
    const existing = await db.collection("users")
      .where("username", "==", newUsername)
      .get();

    if (!existing.empty) {
      // Verifica se appartiene allo stesso utente
      const isSelf = existing.docs.some(doc => doc.id === user.uid);
      if (!isSelf) {
        showError("Questo username è già in uso.");
        return;
      }
    }

    await db.collection("users").doc(user.uid).update({ username: newUsername });
    showSuccess("Username aggiornato con successo.");
    if (userNameDisplay) userNameDisplay.textContent = newUsername;
    
    const userIcon = document.getElementById("userIcon");
    if (userIcon) {
      userIcon.textContent = newUsername.charAt(0).toUpperCase();
    }
  } catch (error) {
    showError("Errore durante l'aggiornamento dello username.");
  }
});

// Verifica vecchia password
verifyPasswordBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const oldPassword = oldPasswordInput.value;

  if (!oldPassword) {
    showError("Inserisci la vecchia password.");
    return;
  }

  const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPassword);

  try {
    await user.reauthenticateWithCredential(credential);
    showSuccess("Password verificata. Ora puoi inserirne una nuova.");
    passwordVerified = true;

    setTimeout(() => {
      clearMessages();
    }, 2000);

    // Nascondi il gruppo della vecchia password
    const oldPassGroup = document.querySelector(".old-password-group");
    if (oldPassGroup) {
      oldPassGroup.parentElement.style.display = "none";
    }

    // Mostra i campi per la nuova password
    [newPasswordInput, confirmPasswordInput].forEach(el => el.classList.remove("hidden"));
    [newPasswordLabel, confirmPasswordLabel].forEach(el => el.classList.remove("hidden"));
  } catch (error) {
    showError("Password errata. Riprova.");
  }
});

// Salva modifiche (Nuova password tramite submit del form)
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();

  const user = auth.currentUser;
  if (!user) {
    showError("Utente non autenticato.");
    return;
  }

  const passwordChangeRequested = !newPasswordInput.classList.contains("hidden");

  if (!passwordChangeRequested) {
    showError("Nessuna modifica alla password richiesta (usa il pulsante per lo username).");
    return;
  }

  if (!passwordVerified) {
    showError("Devi prima verificare la vecchia password.");
    return;
  }

  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  if (newPassword.length < 6) {
    showError("La nuova password deve contenere almeno 6 caratteri.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showError("Le password non coincidono.");
    return;
  }

  try {
    await user.updatePassword(newPassword);
    showSuccess("Password aggiornata con successo.");
    profileForm.reset();
    passwordVerified = false;
  } catch (error) {
    if (error.code === 'auth/requires-recent-login') {
      showError("Devi eseguire nuovamente il login prima di cambiare la password.");
    } else {
      showError("Errore durante l'aggiornamento della password: " + error.message);
    }
  }
});

// Funzioni per la gestione dei messaggi
function showError(message) {
  if (!errorMsg) return;
  errorMsg.textContent = message;
  errorMsg.classList.add('visible');
  if (successMsg) {
    successMsg.textContent = '';
    successMsg.classList.remove('visible');
  }
}

function showSuccess(message) {
  if (!successMsg) return;
  successMsg.textContent = message;
  successMsg.classList.add('visible');
  if (errorMsg) {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
  }
}

function clearMessages() {
  if (errorMsg) {
    errorMsg.textContent = '';
    errorMsg.classList.remove('visible');
  }
  if (successMsg) {
    successMsg.textContent = '';
    successMsg.classList.remove('visible');
  }
}

// Gestione Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
      location.href = 'index.html';
    });
  });
}
