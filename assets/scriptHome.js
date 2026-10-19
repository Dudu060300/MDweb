// =========================================================================
// SCRIPT PRINCIPALE: AUTENTICAZIONE, NAVBAR E SISTEMA PIÙ E MENO DI CRISTIAN
// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // 1. GESTIONE DEL TEMA (Chiaro / Scuro)
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  } else if (savedTheme === "light") {
    document.body.classList.remove("dark");
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }

  // Riferimenti agli elementi della Navbar e Utente
  const userMenu = document.getElementById("userMenu");
  const logoutBtn = document.getElementById("logout");
  const editProfileBtn = document.getElementById("editProfile");
  const userIcon = document.getElementById("userIcon");
  const userName = document.getElementById("userName");
  const overlay = document.getElementById("overlay");

  // Riferimenti per la Modale Anteprima Foto
  const photoModal = document.getElementById("photoModal");
  const modalImage = document.getElementById("modalImage");
  const modalCaption = document.getElementById("modalCaption");
  const closePhotoModal = document.getElementById("closePhotoModal");

  // =====================================================================
  // GESTIONE DEL MENU A TENDINA (DROPDOWN) DELL'UTENTE
  // =====================================================================
  if (userMenu) {
    userMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const expanded = userMenu.getAttribute("aria-expanded") === "true";
      userMenu.setAttribute("aria-expanded", String(!expanded));
      userMenu.classList.toggle("open");

      if (overlay) {
        overlay.style.display = userMenu.classList.contains("open") ? "block" : "none";
      }
    });

    document.addEventListener("click", (e) => {
      if (!userMenu.contains(e.target)) {
        userMenu.classList.remove("open");
        userMenu.setAttribute("aria-expanded", "false");
        if (overlay) overlay.style.display = "none";
      }
    });
  }

  // =====================================================================
  // GESTIONE DEL LOGOUT FIREBASE
  // =====================================================================
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      auth.signOut().then(() => {
        location.href = "index.html";
      }).catch(err => alert("Errore logout: " + err.message));
    });
  }

  // =====================================================================
  // GESTIONE DELLA MODALE ANTEPRIMA FOTO A TUTTO SCHERMO
  // =====================================================================
  if (closePhotoModal) {
    closePhotoModal.onclick = function() {
      if (this.blur) this.blur();
      if (photoModal) photoModal.classList.add("hidden");
    };
  }

  if (photoModal) {
    photoModal.onclick = function(e) {
      if (e.target === photoModal) {
        photoModal.classList.add("hidden");
      }
    };
  }

  window.openPhotoPreview = function(imgSrc, captionText) {
    if (modalImage && photoModal) {
      modalImage.src = imgSrc;
      if (modalCaption) {
        modalCaption.textContent = captionText || "";
      }
      photoModal.classList.remove("hidden");
    }
  };

  // =====================================================================
  // STATO DELL'UTENTE E INTERFACCIA NAVBAR (FIREBASE AUTH & FIRESTORE)
  // =====================================================================
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    currentUserId = user.uid;

    // 1. Determina il nome di base (displayName di Auth o fallback da email)
    let displayName = user.displayName;

    // 2. Prova a leggere il nome aggiornato dalla collezione Firestore "users"
    try {
      const db = firebase.firestore();
      const userDoc = await db.collection("users").doc(currentUserId).get();
      if (userDoc.exists && userDoc.data().username) {
        displayName = userDoc.data().username;
      }
    } catch (e) {
      console.log("Impossibile leggere il nome utente da Firestore, uso Auth:", e);
    }

    const finalName = displayName || (user.email ? user.email.split("@")[0] : "Utente");
    const initial = finalName.charAt(0).toUpperCase();

    // Aggiorna l'interfaccia utente nella navbar e nel menu a tendina
    if (userName) userName.textContent = finalName;
    if (userIcon) userIcon.textContent = initial;

    const providers = user.providerData.map(p => p.providerId);
    const isSocialLogin = providers.includes("google.com") || providers.includes("apple.com");

    if (editProfileBtn) {
      editProfileBtn.style.display = isSocialLogin ? "none" : "inline-block";
    }

    // Carica lo storico ed i dati dell'utente loggato
    initFirestore(currentUserId);
  });

  // =====================================================================
  // LOGICA DEL CONTATORE "PIÙ E MENO" (CRISTIAN)
  // =====================================================================
  let items = [];
  let dbInstance, currentUserId;
  let currentPhotoBase64 = "";

