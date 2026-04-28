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

// ================= UI =================
const userMenu = document.getElementById("userMenu");
const logoutBtn = document.getElementById("logout");
const editProfileBtn = document.getElementById("editProfile");
const userIcon = document.getElementById("userIcon");
const userName = document.getElementById("userName");

// ================= DROPDOWN =================
if (userMenu) {
  userMenu.addEventListener("click", () => {
    const expanded = userMenu.getAttribute("aria-expanded") === "true";
    userMenu.setAttribute("aria-expanded", String(!expanded));
    userMenu.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target)) {
      userMenu.classList.remove("open");
      userMenu.setAttribute("aria-expanded", "false");
    }
  });
}

// ================= LOGOUT =================
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
      location.href = "index.html";
    });
  });
}

// ================= AUTH =================
auth.onAuthStateChanged((user) => {

  if (!user) {
    location.href = "index.html";
    return;
  }

  // 👤 nome utente con fallback intelligente
  const name =
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "Utente");

  // 🔤 iniziale
  const initial = name.charAt(0).toUpperCase();

  // 🧠 update UI
  if (userName) userName.textContent = name;
  if (userIcon) userIcon.textContent = initial;

  // 🔐 provider check
  const providers = user.providerData.map(p => p.providerId);

  const isSocialLogin =
    providers.includes("google.com") ||
    providers.includes("apple.com");

  if (editProfileBtn) {
    editProfileBtn.style.display = isSocialLogin ? "none" : "inline-block";
  }
});