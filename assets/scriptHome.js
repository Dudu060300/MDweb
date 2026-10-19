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

    // Chiude il menu se si clicca al di fuori di esso
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
  // STATO DELL'UTENTE E INTERfACCIA NAVBAR
  // =====================================================================
  auth.onAuthStateChanged((user) => {
    if (!user) return;

    const name = user.displayName || (user.email ? user.email.split("@")[0] : "Utente");
    const initial = name.charAt(0).toUpperCase();

    if (userName) userName.textContent = name;
    if (userIcon) userIcon.textContent = initial;

    const providers = user.providerData.map(p => p.providerId);
    const isSocialLogin = providers.includes("google.com") || providers.includes("apple.com");

    if (editProfileBtn) {
      editProfileBtn.style.display = isSocialLogin ? "none" : "inline-block";
    }

    // Avvia il caricamento dei dati di Cristian legati all'ID univoco dell'utente
    initFirestore(user.uid);
  });

  // =====================================================================
  // LOGICA DEL CONTATORE "PIÙ E MENO" (CRISTIAN)
  // =====================================================================
  let items = []; // Array per memorizzare lo storico dei movimenti
  let dbInstance, currentUserId;
  let currentPhotoBase64 = ""; // Memorizza la foto corrente in formato Base64

  const $ = function(id) { return document.getElementById(id); };

  // Riferimenti per la gestione delle foto
  const photoInput = $("photoInput");
  const photoName = $("photoName");
  const removePhotoBtn = $("removePhotoBtn");

  // Gestione selezione file foto
  if (photoInput) {
    photoInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) { // Limite di sicurezza 2MB
          alert("La foto è troppo grande. Scegli un'immagine sotto i 2MB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = function(event) {
          currentPhotoBase64 = event.target.result;
          if (photoName) photoName.textContent = file.name;
          if (removePhotoBtn) removePhotoBtn.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Pulsante per rimuovere la foto selezionata prima dell'invio
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", function() {
      currentPhotoBase64 = "";
      if (photoInput) photoInput.value = "";
      if (photoName) photoName.textContent = "";
      removePhotoBtn.classList.add("hidden");
    });
  }

  // Funzione di utilità per sanificare il testo inserito (prevenzione XSS)
  function esc(t) { 
    var d = document.createElement("div"); 
    d.textContent = t; 
    return d.innerHTML; 
  }

  // Funzione principale per aggiornare la grafica e lo storico
  function render() {
    var p = items.filter(function(i) { return i.t === "p"; }).length,
        n = items.length - p,
        b = p - n;
    
    // Aggiornamento saldo totale
    if ($("bal")) {
      $("bal").textContent = (b > 0 ? "+" : b < 0 ? "−" : "") + Math.abs(b);
      $("bal").style.color = b > 0 ? "var(--pos)" : b < 0 ? "var(--neg)" : "var(--text-color)";
    }
    
    // Giudizio testuale in base al punteggio
    if ($("verdict")) {
      $("verdict").textContent = !items.length ? "Ancora nessun punto" : b > 0 ? "Meglio i pregi dei difetti" : b < 0 ? "I difetti vincono" : "Pareggio perfetto";
    }
    
    // Contatori testuali sui pulsanti principali
    if ($("cp")) $("cp").textContent = p + (p === 1 ? " positivo" : " positivi");
    if ($("cn")) $("cn").textContent = n + (n === 1 ? " negativo" : " negativi");
    
    // Aggiornamento della barra visiva proporzionale
    var tot = items.length || 1;
    if ($("bp")) $("bp").style.width = (p / tot * 100) + "%";
    if ($("bn")) $("bn").style.width = (n / tot * 100) + "%";
    if ($("empty")) $("empty").style.display = items.length ? "none" : "block";
    
    // Generazione dello storico raggruppato per giorni (dal più recente al più vecchio)
    if ($("log")) {
      let lastDayStr = "";
      let html = "";
      
      items.slice().reverse().forEach(function(i) {
        var d = new Date(i.d);
        var dayStr = d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
        
        // Inserisce l'intestazione della data se cambia il giorno
        if (dayStr !== lastDayStr) {
          lastDayStr = dayStr;
          html += '<li class="day-header">' + dayStr + '</li>';
        }
        
        var h = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        // Genera il tag immagine se è presente una foto salvata nell'elemento
        var photoHtml = i.img ? '<img src="' + i.img + '" class="entry-photo" alt="Foto allegata" />' : '';
        
        html += '<li class="' + i.t + '">' +
                  '<span class="tag">' + (i.t === "p" ? "+" : "−") + '</span>' +
                  '<div class="txt">' +
                    (i.n ? esc(i.n) : '<span style="color:var(--text-muted)">senza motivo</span>') +
                    photoHtml +
                  '</div>' +
                  '<span class="time">' + h + '</span>' +
                '</li>';
      });
      
      $("log").innerHTML = html;
    }
  }

  // Salvataggio dei dati su Firebase Firestore in tempo reale
  async function saveToFirestore() {
    if (!dbInstance || !currentUserId) return;
    try {
      await dbInstance.collection("users").doc(currentUserId).collection("data").doc("cristian_score").set({ items });
    } catch (e) {
      console.error("Errore salvataggio Firestore:", e);
    }
  }

  // Inizializzazione e recupero dati da Firestore basato sull'utente loggato
  async function initFirestore(uid) {
    currentUserId = uid;
    try {
      dbInstance = firebase.firestore();
      const docRef = await dbInstance.collection("users").doc(currentUserId).collection("data").doc("cristian_score").get();
      
      if (docRef.exists) {
        items = docRef.data().items || [];
      } else {
        // Fallback di migrazione dal vecchio localStorage se presente
        const oldData = localStorage.getItem("cristian-score");
        if (oldData) {
          items = JSON.parse(oldData) || [];
          await saveToFirestore();
        }
      }
      render();
    } catch (err) {
      console.error("Errore lettura dati utente:", err);
    }
  }

  // Funzione per aggiungere un punto (+) o (-) con motivo e foto opzionali
  function add(t) {
    const noteEl = $("note");
    const val = noteEl ? noteEl.value.trim() : "";
    
    items.push({ 
      t: t, 
      n: val, 
      img: currentPhotoBase64, 
      d: Date.now() 
    });

    // Reset dei campi di input e della foto dopo l'aggiunta
    if (noteEl) noteEl.value = "";
    currentPhotoBase64 = "";
    if (photoInput) photoInput.value = "";
    if (photoName) photoName.textContent = "";
    if (removePhotoBtn) removePhotoBtn.classList.add("hidden");

    saveToFirestore();
    render();
    
    // Leggero feedback aptico per dispositivi mobili supportati
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
  }

  // Collegamento eventi ai pulsanti principali (+) e (-) con blocco della selezione visiva (.blur())
  if ($("plus")) $("plus").onclick = function() { this.blur(); add("p"); };
  if ($("minus")) $("minus").onclick = function() { this.blur(); add("n"); };
  
  // Invio rapido con il tasto "Invio" nel campo motivo
  if ($("note")) {
    $("note").addEventListener("keydown", function(e) { 
      if (e.key === "Enter") { add("p"); } 
    });
  }
  
  // Pulsante "Annulla ultimo" con avviso di conferma e rimozione del focus (.blur())
  if ($("undo")) {
    $("undo").onclick = function() {
      this.blur();
      if (items.length) {
        if (confirm("Sei sicuro di voler annullare l'ultimo inserimento?")) {
          items.pop();
          saveToFirestore();
          render();
        }
      } else {
        alert("Non ci sono elementi da annullare.");
      }
    };
  }
  
  // Pulsante "Azzera tutto" con avviso di sicurezza e rimozione del focus (.blur())
  if ($("reset")) {
    $("reset").onclick = function() {
      this.blur();
      if (items.length) {
        if (confirm("ATTENZIONE: Sei sicuro di voler azzerare tutti i punti e lo storico di Cristian?")) {
          items = [];
          saveToFirestore();
          render();
        }
      } else {
        alert("Il registro è già vuoto.");
      }
    };
  }
});
