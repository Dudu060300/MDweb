// ==========================================
// SCRIPT PROFILO COMPLETO (MDweb)
// ==========================================

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

// Elementi Eliminazione Account
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
const deleteModal = document.getElementById("deleteModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const deletePasswordInput = document.getElementById("deletePasswordInput");

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

// Recupera dati utente all'avvio non appena Firebase Auth è pronto
auth.onAuthStateChanged(async user => {
  if (user) {
    emailInput.value = user.email || "";

    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const username = userDoc.data().username || user.displayName || "Utente";
        usernameInput.value = username;
        if (userNameDisplay) userNameDisplay.textContent = username;

        const userIcon = document.getElementById("userIcon");
        if (userIcon) {
          userIcon.textContent = username.charAt(0).toUpperCase();
        }
      } else {
        const fallbackName = user.displayName || (user.email ? user.email.split("@")[0] : "Utente");
        usernameInput.value = fallbackName;
        if (userNameDisplay) userNameDisplay.textContent = fallbackName;
        
        const userIcon = document.getElementById("userIcon");
        if (userIcon) {
          userIcon.textContent = fallbackName.charAt(0).toUpperCase();
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

    const oldPassGroup = document.querySelector(".old-password-group");
    if (oldPassGroup) {
      oldPassGroup.parentElement.style.display = "none";
    }

    [newPasswordInput, confirmPasswordInput].forEach(el => el.classList.remove("hidden"));
    [newPasswordLabel, confirmPasswordLabel].forEach(el => el.classList.remove("hidden"));
  } catch (error) {
    showError("Password errata. Riprova.");
  }
});

// Salva modifiche password tramite submit
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

// --- ELIMINAZIONE DEFINITIVA ACCOUNT ---
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user) return;

    const providerId = user.providerData[0] ? user.providerData[0].providerId : '';

    if (providerId === 'google.com' || providerId === 'apple.com') {
      if (confirm("Sei sicuro di voler eliminare definitivamente il tuo account? L'operazione è irreversibile.")) {
        executeAccountDeletion(user);
      }
    } else {
      deleteModal.classList.remove("hidden");
      deletePasswordInput.value = "";
      deletePasswordInput.focus();
    }
  });
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", () => {
    deleteModal.classList.add("hidden");
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    const password = deletePasswordInput.value;

    if (!password) {
      alert("Inserisci la password per confermare l'eliminazione.");
      return;
    }

    try {
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(credential);
      
      deleteModal.classList.add("hidden");
      await executeAccountDeletion(user);
    } catch (error) {
      console.error("Errore di riautenticazione:", error);
      alert("Password errata o errore di autenticazione. Impossibile eliminare l'account.");
    }
  });
}

async function executeAccountDeletion(user) {
  try {
    showSuccess("Eliminazione account in corso...");

    const userDocRef = db.collection("users").doc(user.uid);
    const userSnap = await userDocRef.get();
    
    if (userSnap.exists) {
      const username = userSnap.data().username;
      if (username) {
        await db.collection("usernames").doc(username.toLowerCase()).delete().catch(err => console.log(err));
      }
    }
    await userDocRef.delete().catch(err => console.log(err));

    await user.delete();

    alert("Il tuo account è stato eliminato definitivamente.");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Errore durante l'eliminazione dell'account:", error);
    if (error.code === 'auth/requires-recent-login') {
      showError("Per motivi di sicurezza, effettua nuovamente il login prima di eliminare l'account.");
    } else {
      showError("Errore durante l'eliminazione: " + error.message);
    }
  }
}

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
