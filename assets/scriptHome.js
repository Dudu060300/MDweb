// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA1U8IL5gdwoKmsdZgANGR_646ZDbjU50c",
  authDomain: "proghtml-2e571.firebaseapp.com",
  projectId: "proghtml-2e571",
  storageBucket: "proghtml-2e571.appspot.com",
  messagingSenderId: "771370443646",
  appId: "1:771370443646:web:5dd712f9e03448ebda2463"
};

// Inizializza Firebase solo se non è già fatto
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Aspettiamo che il documento sia caricato prima di cercare gli elementi
document.addEventListener("DOMContentLoaded", () => {
  const userMenu = document.getElementById("userMenu");
  const logoutBtn = document.getElementById("logout");
  const editProfileBtn = document.getElementById("editProfile");
  const userIcon = document.getElementById("userIcon");
  const userName = document.getElementById("userName");
  const overlay = document.getElementById("overlay");

  // ================= DROPDOWN & MENU =================
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

  // ================= LOGOUT =================
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      auth.signOut().then(() => {
        location.href = "index.html";
      }).catch(err => alert("Errore logout: " + err.message));
    });
  }

  // ================= AUTH & UI UPDATE =================
  auth.onAuthStateChanged((user) => {
    if (!user) {
      location.href = "index.html";
      return;
    }

    // Nome utente con fallback intelligente
    const name = user.displayName || (user.email ? user.email.split("@")[0] : "Utente");

    // Iniziale maiuscola sicura
    const initial = name.charAt(0).toUpperCase();

    // Aggiornamento sicuro della UI
    if (userName) userName.textContent = name;
    if (userIcon) userIcon.textContent = initial;

    // Controllo provider (Google / Apple)
    const providers = user.providerData.map(p => p.providerId);
    const isSocialLogin = providers.includes("google.com") || providers.includes("apple.com");

    if (editProfileBtn) {
      editProfileBtn.style.display = isSocialLogin ? "none" : "inline-block";
    }
  });
});
