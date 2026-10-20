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
  // BLOCCO FORZATO DELLE GESTURE LATERALI DAI BORDI PER iOS WEBKIT
  // =====================================================================
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 0) {
      const touchX = e.touches[0].clientX;
      const screenWidth = window.innerWidth;
      
      // Blocca i tocchi nei primi e ultimi 25px dello schermo
      if (touchX < 25 || touchX > screenWidth - 25) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 0) {
      const touchX = e.touches[0].clientX;
      const screenWidth = window.innerWidth;
      
      if (touchX < 25 || touchX > screenWidth - 25) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  // =====================================================================
  // BLOCCO TOTALE NAVIGAZIONE HISTORY (MODALITÀ APP NATIVA)
  // =====================================================================
  window.history.replaceState({ page: "home" }, "", window.location.href);

  window.addEventListener("popstate", (e) => {
    if (photoModal && !photoModal.classList.contains("hidden")) {
      photoModal.classList.add("hidden");
      document.body.style.overflow = "";
      if (modalImage) modalImage.style.transform = "translateZ(0)";
    }
    window.history.replaceState({ page: "home" }, "", window.location.href);
  });

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
  // GESTIONE MODALE ANTEPRIMA FOTO
  // =====================================================================
  function closePreview() {
    if (photoModal && !photoModal.classList.contains("hidden")) {
      photoModal.classList.add("hidden");
      document.body.style.overflow = "";
      if (modalImage) modalImage.style.transform = "translateZ(0)";
    }
  }

  if (closePhotoModal) {
    closePhotoModal.onclick = function(e) {
      e.stopPropagation();
      if (this.blur) this.blur();
      closePreview();
    };
  }

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
  // LOGICA DEL CONTATORE CONDIVISO CON APPROVAZIONE (CRISTIAN)
  // =====================================================================
  let approvedItems = [];
  let pendingItems = [];
  let currentUsername = "";
  let dbInstance, currentUserId;
  let currentPhotoBase64 = "";

  const $ = function(id) { return document.getElementById(id); };

  const photoInput = $("photoInput");
  const photoName = $("photoName");
  const removePhotoBtn = $("removePhotoBtn");
  const logContainer = $("log");

  // =====================================================================
  // CARICAMENTO E COMPRESSIONE AUTOMATICA DELLE FOTO (> 2MB)
  // =====================================================================
  function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
      const img = new Image();
      img.src = event.target.result;
      img.onload = function() {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        callback(compressedBase64);
      };
    };
  }

  if (photoInput) {
    photoInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (file) {
        if (photoName) photoName.textContent = "Elaborazione foto...";

        compressImage(file, 1200, 1200, 0.7, function(base64Result) {
          currentPhotoBase64 = base64Result;
          if (photoName) photoName.textContent = file.name;
          if (removePhotoBtn) removePhotoBtn.classList.remove("hidden");
        });
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

  // =====================================================================
  // GESTIONE CLICK SULLE FOTO E SUGLI ACCORDION DELLO STORICO
  // =====================================================================
  if (logContainer) {
    logContainer.addEventListener("click", function(e) {
      if (e.target && e.target.classList.contains("clickable-photo")) {
        const imgSrc = e.target.getAttribute("data-img");
        const caption = e.target.getAttribute("data-caption");
        if (imgSrc && typeof window.openPhotoPreview === "function") {
          window.openPhotoPreview(imgSrc, caption);
        }
        return;
      }

      const dayHeaderBtn = e.target.closest(".day-header-btn");
      if (dayHeaderBtn) {
        const accordion = dayHeaderBtn.closest(".day-accordion");
        if (accordion) {
          accordion.classList.toggle("open");
        }
      }
    });
  }

  function esc(t) { 
    var d = document.createElement("div"); 
    d.textContent = t; 
    return d.innerHTML; 
  }

  // =====================================================================
  // SALVATAGGIO E MIGRAZIONE AUTOMATICA FIRESTORE CONDIVISO
  // =====================================================================
  async function saveSharedData() {
    if (!dbInstance) return;
    try {
      await dbInstance.collection("shared_data").doc("cristian_score").set({
        approvedItems: approvedItems,
        pendingItems: pendingItems
      });
    } catch (e) {
      console.error("Errore salvataggio Firestore condiviso:", e);
    }
  }

  async function initFirestore(uid) {
    currentUserId = uid;
    try {
      dbInstance = firebase.firestore();
      
      // 1. Legge il nome utente corrente
      const userDoc = await dbInstance.collection("users").doc(currentUserId).get();
      if (userDoc.exists && userDoc.data().username) {
        currentUsername = userDoc.data().username;
      } else {
        currentUsername = auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split("@")[0] : "Utente");
      }

      // 2. Cerca un eventuale backup dei vecchi dati personali per il recupero
      let oldItemsBackup = [];
      try {
        const oldDoc = await dbInstance.collection("users").doc(currentUserId).collection("data").doc("cristian_score").get();
        if (oldDoc.exists && oldDoc.data().items) {
          oldItemsBackup = oldDoc.data().items;
        }
      } catch (e) {
        console.log("Nessun vecchio dato Firestore personale trovato:", e);
      }

      if (!oldItemsBackup.length) {
        const localData = localStorage.getItem("cristian-score");
        if (localData) {
          try { oldItemsBackup = JSON.parse(localData) || []; } catch(e){}
        }
      }

      // 3. Ascolto in tempo reale dei dati condivisi e recupero automatico
      dbInstance.collection("shared_data").doc("cristian_score").onSnapshot(async (doc) => {
        if (doc.exists) {
          const data = doc.data();
          approvedItems = data.approvedItems || [];
          pendingItems = data.pendingItems || [];

          // Se lo storico condiviso è vuoto ma esistono vecchi punti salvati, li migra in automatico
          if (approvedItems.length === 0 && pendingItems.length === 0 && oldItemsBackup.length > 0) {
            approvedItems = oldItemsBackup.map(i => ({
              id: "item_" + (i.d || Date.now()) + "_" + Math.random().toString(36).substr(2, 4),
              t: i.t,
              n: i.n || "",
              img: i.img || "",
              d: i.d || Date.now(),
              author: "Mudi06"
            }));
            await saveSharedData();
          }
        } else if (oldItemsBackup.length > 0) {
          // Se il documento condiviso non esiste ancora, lo crea importando i vecchi punti
          approvedItems = oldItemsBackup.map(i => ({
            id: "item_" + (i.d || Date.now()) + "_" + Math.random().toString(36).substr(2, 4),
            t: i.t,
            n: i.n || "",
            img: i.img || "",
            d: i.d || Date.now(),
            author: "Mudi06"
          }));
          await saveSharedData();
        } else {
          approvedItems = [];
          pendingItems = [];
        }
        render();
      });
    } catch (err) {
      console.error("Errore inizializzazione e recupero dati:", err);
    }
  }

  function render() {
    var p = approvedItems.filter(function(i) { return i.t === "p"; }).length,
        n = approvedItems.length - p,
        b = p - n;
    
    if ($("bal")) {
      $("bal").textContent = (b > 0 ? "+" : b < 0 ? "−" : "") + Math.abs(b);
      $("bal").style.color = b > 0 ? "var(--pos)" : b < 0 ? "var(--neg)" : "var(--text-color)";
    }
    
    if ($("verdict")) {
      $("verdict").textContent = !approvedItems.length ? "Ancora nessun punto approvato" : b > 0 ? "Meglio i pregi dei difetti" : b < 0 ? "I difetti vincono" : "Pareggio perfetto";
    }
    
    if ($("cp")) $("cp").textContent = p + (p === 1 ? " positivo" : " positivi");
    if ($("cn")) $("cn").textContent = n + (n === 1 ? " negativo" : " negativi");
    
    var tot = approvedItems.length || 1;
    if ($("bp")) $("bp").style.width = (p / tot * 100) + "%";
    if ($("bn")) $("bn").style.width = (n / tot * 100) + "%";
    
    if (logContainer) {
      let html = "";
      const isMudi06 = (currentUsername.toLowerCase() === "mudi06");

      // 1. SEZIONE SEGNALAZIONI IN ATTESA (PENDING)
      if (pendingItems.length > 0) {
        html += '<div style="margin-bottom:20px; padding:12px; background:rgba(255, 193, 7, 0.15); border:2px dashed #ffc107; border-radius:16px;">' +
                  '<h3 style="margin:0 0 10px; font-size:1rem; color:#ffc107; font-weight:800;">⏳ Segnalazioni in attesa (' + pendingItems.length + ')</h3>' +
                  '<ul style="list-style:none; padding:0; margin:0;">';

        pendingItems.slice().reverse().forEach(function(i) {
          var d = new Date(i.d);
          var h = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          var noteText = i.n ? esc(i.n) : '<span style="color:var(--text-muted)">senza motivo</span>';
          var authorText = i.author ? ' <small style="opacity:0.7;">(da ' + esc(i.author) + ')</small>' : '';

          var photoHtml = i.img 
            ? '<img src="' + i.img + '" class="entry-photo clickable-photo" alt="Foto allegata" style="cursor:pointer;" data-img="' + i.img + '" data-caption="' + esc(i.n || '') + '" />' 
            : '';

          var actionBtns = isMudi06 ? 
            '<div style="display:flex; gap:8px; margin-top:8px;">' +
              '<button type="button" onclick="approvePendingItem(\'' + i.id + '\')" style="flex:1; padding:6px; background:var(--pos); color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">✓ Approva</button>' +
              '<button type="button" onclick="rejectPendingItem(\'' + i.id + '\')" style="flex:1; padding:6px; background:var(--neg); color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">✕ Rifiuta</button>' +
            '</div>' : '<div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">In attesa di approvazione da Mudi06</div>';

          html += '<li class="' + i.t + '" style="margin-bottom:8px; flex-direction:column; align-items:stretch;">' +
                    '<div style="display:flex; align-items:center; gap:10px;">' +
                      '<span class="tag">' + (i.t === "p" ? "+" : "−") + '</span>' +
                      '<div class="txt">' + noteText + authorText + photoHtml + '</div>' +
                      '<span class="time">' + h + '</span>' +
                    '</div>' +
                    actionBtns +
                  '</li>';
        });

        html += '</ul></div>';
      }

      // 2. STORICO UFFICIALE APPROVATO (ACCORDION)
      if (!approvedItems.length) {
        if ($("empty")) $("empty").style.display = "block";
      } else {
        if ($("empty")) $("empty").style.display = "none";

        const groups = {};
        approvedItems.slice().reverse().forEach(function(i) {
          var d = new Date(i.d);
          var dayKey = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          var dayTitle = d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
          
          if (!groups[dayKey]) {
            groups[dayKey] = { title: dayTitle, items: [] };
          }
          groups[dayKey].items.push(i);
        });

        Object.keys(groups).forEach(function(dayKey) {
          const group = groups[dayKey];
          const posDay = group.items.filter(i => i.t === "p").length;
          const negDay = group.items.length - posDay;
          const balDay = posDay - negDay;
          
          let badgeClass = balDay > 0 ? "pos" : balDay < 0 ? "neg" : "neutral";
          let badgeText = balDay > 0 ? "+" + balDay : balDay < 0 ? "−" + Math.abs(balDay) : "0";

          html += '<div class="day-accordion">' +
                    '<button type="button" class="day-header-btn">' +
                      '<div class="day-header-info">' +
                        '<span>' + group.title + '</span>' +
                        '<span class="day-badge ' + badgeClass + '">' + badgeText + '</span>' +
                      '</div>' +
                      '<span class="day-arrow">▼</span>' +
                    '</button>' +
                    '<div class="day-content"><ul>';

          group.items.forEach(function(i) {
            var d = new Date(i.d);
            var h = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
            var noteText = i.n ? esc(i.n) : '<span style="color:var(--text-muted)">senza motivo</span>';
            var authorText = i.author ? ' <small style="opacity:0.7;">(da ' + esc(i.author) + ')</small>' : '';
            var photoHtml = i.img ? '<img src="' + i.img + '" class="entry-photo clickable-photo" alt="Foto allegata" style="cursor:pointer;" data-img="' + i.img + '" data-caption="' + esc(i.n || '') + '" />' : '';

            html += '<li class="' + i.t + '">' +
                      '<span class="tag">' + (i.t === "p" ? "+" : "−") + '</span>' +
                      '<div class="txt">' + noteText + authorText + photoHtml + '</div>' +
                      '<span class="time">' + h + '</span>' +
                    '</li>';
          });

          html += '</ul></div></div>';
        });
      }

      logContainer.innerHTML = html;
    }
  }

  function add(t) {
    const noteEl = $("note");
    const val = noteEl ? noteEl.value.trim() : "";
    
    const newItem = {
      id: "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      t: t, 
      n: val, 
      img: currentPhotoBase64, 
      d: Date.now(),
      author: currentUsername
    };

    pendingItems.push(newItem);

    if (noteEl) noteEl.value = "";
    currentPhotoBase64 = "";
    if (photoInput) photoInput.value = "";
    if (photoName) photoName.textContent = "";
    if (removePhotoBtn) removePhotoBtn.classList.add("hidden");

    saveSharedData();
    render();
    
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
  }

  // =====================================================================
  // AZIONI RISERVATE ESCLUSIVAMENTE A MUDI06
  // =====================================================================
  window.approvePendingItem = function(id) {
    if (currentUsername.toLowerCase() !== "mudi06") return;
    const index = pendingItems.findIndex(i => i.id === id);
    if (index !== -1) {
      const item = pendingItems.splice(index, 1)[0];
      approvedItems.push(item);
      saveSharedData();
      render();
    }
  };

  window.rejectPendingItem = function(id) {
    if (currentUsername.toLowerCase() !== "mudi06") return;
    const index = pendingItems.findIndex(i => i.id === id);
    if (index !== -1) {
      pendingItems.splice(index, 1);
      saveSharedData();
      render();
    }
  };

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
      if (currentUsername.toLowerCase() !== "mudi06") {
        alert("Solo Mudi06 può annullare le voci.");
        return;
      }
      if (approvedItems.length) {
        if (confirm("Sei sicuro di voler annullare l'ultimo inserimento approvato?")) {
          approvedItems.pop();
          saveSharedData();
          render();
        }
      } else {
        alert("Non ci sono elementi approvati da annullare.");
      }
    };
  }
  
  if ($("reset")) {
    $("reset").onclick = function() {
      if (this.blur) this.blur();
      if (currentUsername.toLowerCase() !== "mudi06") {
        alert("Solo Mudi06 può azzerare tutto.");
        return;
      }
      if (approvedItems.length || pendingItems.length) {
        if (confirm("ATTENZIONE: Sei sicuro di voler azzerare tutti i punti e lo storico condiviso?")) {
          approvedItems = [];
          pendingItems = [];
          saveSharedData();
          render();
        }
      } else {
        alert("Il registro è già vuoto.");
      }
    };
  }

  render();
});
