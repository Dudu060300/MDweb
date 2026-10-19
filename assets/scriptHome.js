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
  const modalFadeOverlay = document.getElementById("modalFadeOverlay");
  const closePhotoModal = document.getElementById("closePhotoModal");
  const zoomContainer = document.getElementById("zoomContainer");

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

  // Aggiornamento pagina cliccando sul titolo MDweb
  const navTitle = document.querySelector("nav h1");
  if (navTitle) {
    navTitle.style.cursor = "pointer";
    navTitle.addEventListener("click", () => {
      window.location.reload();
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
  // GESTIONE MODALE ANTEPRIMA FOTO (BLOCCO ASSOLUTO BACK DI NAVIGAZIONE)
  // =====================================================================
  function closePreview() {
    if (photoModal) {
      photoModal.classList.add("hidden");
      document.body.style.overflow = "";
      if (modalImage) {
        modalImage.style.transform = "translateZ(0)";
      }
    }
  }

  if (closePhotoModal) {
    closePhotoModal.onclick = function(e) {
      e.stopPropagation();
      if (this.blur) this.blur();
      closePreview();
    };
  }

  // Tap sullo schermo: attiva/disattiva la dissolvenza del motivo (senza chiudere)
  if (photoModal) {
    photoModal.onclick = function(e) {
      if (e.target === closePhotoModal || e.target.closest('#closePhotoModal')) return;
      
      if (modalFadeOverlay) {
        modalFadeOverlay.classList.toggle("hidden-fade");
      }
    };
  }

  window.openPhotoPreview = function(imgSrc, captionText) {
    if (modalImage && photoModal) {
      modalImage.src = imgSrc;
      modalImage.style.transform = "translateZ(0)";

      if (modalCaption) {
        modalCaption.textContent = captionText || "";
        if (modalFadeOverlay) {
          modalFadeOverlay.style.display = captionText ? "block" : "none";
          modalFadeOverlay.classList.remove("hidden-fade");
        }
      }
      photoModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
  };

  // Gestione rigorosa dello swipe per chiudere la foto e blocco assoluto del back di navigazione
  if (zoomContainer && modalImage) {
    let touchStartX = 0;
    let touchStartY = 0;

    zoomContainer.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    zoomContainer.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1) {
        const currentX = e.touches[0].clientX;
        const diffX = currentX - touchStartX;
        
        // Impedisce a Safari/Chrome di attivare il cambio pagina con lo swipe dal bordo
        if (touchStartX < 140 && diffX > 0) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    }, { passive: false });

    zoomContainer.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const diffX = touchEndX - touchStartX;
        const diffY = Math.abs(touchEndY - touchStartY);

        // Chiusura con swipe da sinistra verso destra
        if (touchStartX < 140 && diffX > 70 && diffY < 60) {
          closePreview();
        }
      }
    });
  }

  // =====================================================================
  // STATO DELL'UTENTE E INTERFACCIA NAVBAR (FIREBASE AUTH & FIRESTORE)
  // =====================================================================
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    currentUserId = user.uid;

    let displayName = user.displayName;

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

    if (userName) userName.textContent = finalName;
    if (userIcon) userIcon.textContent = initial;

    const providers = user.providerData.map(p => p.providerId);
    const isSocialLogin = providers.includes("google.com") || providers.includes("apple.com");

    if (editProfileBtn) {
      editProfileBtn.style.display = isSocialLogin ? "none" : "inline-block";
    }

    initFirestore(currentUserId);
  });

  // =====================================================================
  // LOGICA DEL CONTATORE "PIÙ E MENO" (CRISTIAN)
  // =====================================================================
  let items = [];
  let dbInstance, currentUserId;
  let currentPhotoBase64 = "";

  const $ = function(id) { return document.getElementById(id); };

  const photoInput = $("photoInput");
  const photoName = $("photoName");
  const removePhotoBtn = $("removePhotoBtn");
  const logContainer = $("log");

  if (photoInput) {
    photoInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
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

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", function() {
      if (this.blur) this.blur();
      currentPhotoBase64 = "";
      if (photoInput) photoInput.value = "";
      if (photoName) photoName.textContent = "";
      removePhotoBtn.classList.add("hidden");
    });
  }

  if (logContainer) {
    logContainer.addEventListener("click", function(e) {
      if (e.target && e.target.classList.contains("clickable-photo")) {
        const imgSrc = e.target.getAttribute("data-img");
        const caption = e.target.getAttribute("data-caption");
        if (imgSrc && typeof window.openPhotoPreview === "function") {
          window.openPhotoPreview(imgSrc, caption);
        }
      }
    });
  }

  function esc(t) { 
    var d = document.createElement("div"); 
    d.textContent = t; 
    return d.innerHTML; 
  }

  function render() {
    var p = items.filter(function(i) { return i.t === "p"; }).length,
        n = items.length - p,
        b = p - n;
    
    if ($("bal")) {
      $("bal").textContent = (b > 0 ? "+" : b < 0 ? "−" : "") + Math.abs(b);
      $("bal").style.color = b > 0 ? "var(--pos)" : b < 0 ? "var(--neg)" : "var(--text-color)";
    }
    
    if ($("verdict")) {
      $("verdict").textContent = !items.length ? "Ancora nessun punto" : b > 0 ? "Meglio i pregi dei difetti" : b < 0 ? "I difetti vincono" : "Pareggio perfetto";
    }
    
    if ($("cp")) $("cp").textContent = p + (p === 1 ? " positivo" : " positivi");
    if ($("cn")) $("cn").textContent = n + (n === 1 ? " negativo" : " negativi");
    
    var tot = items.length || 1;
    if ($("bp")) $("bp").style.width = (p / tot * 100) + "%";
    if ($("bn")) $("bn").style.width = (n / tot * 100) + "%";
    if ($("empty")) $("empty").style.display = items.length ? "none" : "block";
    
    if (logContainer) {
      let lastDayStr = "";
      let html = "";
      
      items.slice().reverse().forEach(function(i) {
        var d = new Date(i.d);
        var dayStr = d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
        
        if (dayStr !== lastDayStr) {
          lastDayStr = dayStr;
          html += '<li class="day-header">' + dayStr + '</li>';
        }
        
        var h = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
        var noteText = i.n ? esc(i.n) : '<span style="color:var(--text-muted)">senza motivo</span>';
        var escapedCaption = i.n ? esc(i.n) : '';

        var photoHtml = i.img 
          ? '<img src="' + i.img + '" class="entry-photo clickable-photo" alt="Foto allegata" style="cursor:pointer;" data-img="' + i.img + '" data-caption="' + escapedCaption + '" />' 
          : '';
        
        html += '<li class="' + i.t + '">' +
                  '<span class="tag">' + (i.t === "p" ? "+" : "−") + '</span>' +
                  '<div class="txt">' +
                    noteText +
                    photoHtml +
                  '</div>' +
                  '<span class="time">' + h + '</span>' +
                '</li>';
      });
      
      logContainer.innerHTML = html;
    }
  }

  async function saveToFirestore() {
    if (!dbInstance || !currentUserId) return;
    try {
      await dbInstance.collection("users").doc(currentUserId).collection("data").doc("cristian_score").set({ items });
    } catch (e) {
      console.error("Errore salvataggio Firestore:", e);
    }
  }

  async function initFirestore(uid) {
    currentUserId = uid;
    try {
      dbInstance = firebase.firestore();
      const docRef = await dbInstance.collection("users").doc(currentUserId).collection("data").doc("cristian_score").get();
      
      if (docRef.exists) {
        items = docRef.data().items || [];
      } else {
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

  function add(t) {
    const noteEl = $("note");
    const val = noteEl ? noteEl.value.trim() : "";
    
    items.push({ 
      t: t, 
      n: val, 
      img: currentPhotoBase64, 
      d: Date.now() 
    });

    if (noteEl) noteEl.value = "";
    currentPhotoBase64 = "";
    if (photoInput) photoInput.value = "";
    if (photoName) photoName.textContent = "";
    if (removePhotoBtn) removePhotoBtn.classList.add("hidden");

    saveToFirestore();
    render();
    
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
  }

  if ($("plus")) $("plus").onclick = function() { if (this.blur) this.blur(); add("p"); };
  if ($("minus")) $("minus").onclick = function() { if (this.blur) this.blur(); add("n"); };
  
  if ($("note")) {
    $("note").addEventListener("keydown", function(e) { 
      if (e.key === "Enter") { add("p"); } 
    });
  }
  
  if ($("undo")) {
    $("undo").onclick = function() {
      if (this.blur) this.blur();
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
  
  if ($("reset")) {
    $("reset").onclick = function() {
      if (this.blur) this.blur();
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

  render();
});
