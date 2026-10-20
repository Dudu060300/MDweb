// =========================================================================
// SCRIPT PRINCIPALE: AUTENTICAZIONE, NAVBAR E SISTEMA PIÙ E MENO MULTI-UTENTE
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

  // Riferimenti Navbar e Modale
  const userMenu = document.getElementById("userMenu");
  const logoutBtn = document.getElementById("logout");
  const editProfileBtn = document.getElementById("editProfile");
  const userIcon = document.getElementById("userIcon");
  const userName = document.getElementById("userName");
  const overlay = document.getElementById("overlay");

  const photoModal = document.getElementById("photoModal");
  const modalImage = document.getElementById("modalImage");
  const modalCaption = document.getElementById("modalCaption");
  const modalFadeOverlay = document.getElementById("modalFadeOverlay");
  const closePhotoModal = document.getElementById("closePhotoModal");

  // GESTIONE TAB BAR INFERIORE
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  const tabContents = document.querySelectorAll(".tab-content");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");

      navItems.forEach(nav => nav.classList.remove("active"));
      tabContents.forEach(tab => tab.classList.remove("active"));

      item.classList.add("active");
      const activeContent = document.getElementById(targetTab);
      if (activeContent) activeContent.classList.add("active");
    });
  });

  // BLOCCO FORZATO GESTURE LATERALI iOS WEBKIT
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 0) {
      const touchX = e.touches[0].clientX;
      const screenWidth = window.innerWidth;
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

  // NAVIGAZIONE APP NATIVA
  window.history.replaceState({ page: "home" }, "", window.location.href);
  window.addEventListener("popstate", (e) => {
    if (photoModal && !photoModal.classList.contains("hidden")) {
      photoModal.classList.add("hidden");
      document.body.style.overflow = "";
      if (modalImage) modalImage.style.transform = "translateZ(0)";
    }
    window.history.replaceState({ page: "home" }, "", window.location.href);
  });

  // MENU UTENTE
  if (userMenu) {
    userMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const expanded = userMenu.getAttribute("aria-expanded") === "true";
      userMenu.setAttribute("aria-expanded", String(!expanded));
      userMenu.classList.toggle("open");
      if (overlay) overlay.style.display = userMenu.classList.contains("open") ? "block" : "none";
    });

    document.addEventListener("click", (e) => {
      if (!userMenu.contains(e.target)) {
        userMenu.classList.remove("open");
        userMenu.setAttribute("aria-expanded", "false");
        if (overlay) overlay.style.display = "none";
      }
    });
  }

  const navTitle = document.querySelector("nav h1");
  if (navTitle) {
    navTitle.style.cursor = "pointer";
    navTitle.addEventListener("click", () => { window.location.reload(); });
  }

  // LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      auth.signOut().then(() => { location.href = "index.html"; }).catch(err => alert("Errore logout: " + err.message));
    });
  }

  // ANTEPRIMA FOTO
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
      if (modalFadeOverlay) modalFadeOverlay.classList.toggle("hidden-fade");
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

  // AUTENTICAZIONE E INIZIALIZZAZIONE
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUserId = user.uid;
    initFirestore(currentUserId);
  });

  // LOGICA E STATO DELLA PWA
  let approvedItems = [];
  let pendingItems = [];
  let decisionHistory = [];
  let registeredUsers = [];
  let selectedTargetUser = "";
  let currentUsername = "";
  let dbInstance, currentUserId;
  let currentPhotoBase64 = "";

  const $ = function(id) { return document.getElementById(id); };

  const photoInput = $("photoInput");
  const photoName = $("photoName");
  const removePhotoBtn = $("removePhotoBtn");
  const logContainer = $("log");
  const pendingContainer = $("pendingContainer");
  const leaderboardContainer = $("leaderboardContainer");
  const decisionsContainer = $("decisionsContainer");
  const pendingBadge = $("pendingBadge");
  const targetUserSelect = $("targetUserSelect");
  const scoreCardContainer = $("scoreCardContainer");

  function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
      const img = new Image();
      img.src = event.target.result;
      img.onload = function() {
        let width = img.width, height = img.height;
        if (width > height) {
          if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        } else {
          if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/jpeg", quality));
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

  document.addEventListener("click", function(e) {
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
      if (accordion) accordion.classList.toggle("open");
    }
  });

  function esc(t) { 
    var d = document.createElement("div"); 
    d.textContent = t; 
    return d.innerHTML; 
  }

  async function saveSharedData() {
    if (!dbInstance) return;
    try {
      await dbInstance.collection("shared_data").doc("cristian_score").set({
        approvedItems: approvedItems,
        pendingItems: pendingItems,
        decisionHistory: decisionHistory
      });
    } catch (e) {
      console.error("Errore salvataggio Firestore:", e);
    }
  }

  // LISTA UTENTI FISSA
  async function loadUsersList() {
    registeredUsers = [
      "Cristian",
      "Samuele",
      "Ivan",
      "Kevin",
      "Marco",
      "Lorenzo",
      "Mudi"
    ];

    populateUserSelector();
  }

  function populateUserSelector() {
    if (!targetUserSelect) return;
    let html = '<option value="">-- Seleziona Utente --</option>';
    registeredUsers.forEach(u => {
      html += `<option value="${esc(u)}" ${selectedTargetUser === u ? 'selected' : ''}>${esc(u)}</option>`;
    });
    targetUserSelect.innerHTML = html;
  }

  if (targetUserSelect) {
    targetUserSelect.addEventListener("change", (e) => {
      selectedTargetUser = e.target.value;
      render();
    });
  }

  async function initFirestore(uid) {
    currentUserId = uid;
    try {
      dbInstance = firebase.firestore();
      const currentUser = auth.currentUser;
      let foundUsername = "";
      
      try {
        const userDoc = await dbInstance.collection("users").doc(currentUserId).get();
        if (userDoc.exists && userDoc.data().username) {
          foundUsername = userDoc.data().username;
        }
      } catch (e) {
        console.log("Errore lettura utente Firestore:", e);
      }

      if (!foundUsername && currentUser) {
        if (currentUser.displayName) foundUsername = currentUser.displayName;
        else if (currentUser.email) foundUsername = currentUser.email.split("@")[0];
      }

      currentUsername = (foundUsername || "Utente").trim();

      const initial = currentUsername.charAt(0).toUpperCase();
      if (userName) userName.textContent = currentUsername;
      if (userIcon) userIcon.textContent = initial;

      if (currentUser && editProfileBtn) {
        const providers = currentUser.providerData.map(p => p.providerId);
        const isSocialLogin = providers.includes("google.com") || providers.includes("apple.com");
        editProfileBtn.style.display = isSocialLogin ? "none" : "inline-block";
      }

      await loadUsersList();

      dbInstance.collection("shared_data").doc("cristian_score").onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          approvedItems = data.approvedItems || [];
          pendingItems = data.pendingItems || [];
          decisionHistory = data.decisionHistory || [];
        } else {
          approvedItems = [];
          pendingItems = [];
          decisionHistory = [];
        }
        render();
      });
    } catch (err) {
      console.error("Errore inizializzazione:", err);
    }
  }

  function render() {
    const isMudi06 = (currentUsername.toLowerCase() === "mudi06");

    const adminTabButtons = document.querySelectorAll(".bottom-nav .admin-only");
    adminTabButtons.forEach(btn => {
      if (isMudi06) {
        btn.classList.remove("hidden");
      } else {
        btn.classList.add("hidden");
        if (btn.classList.contains("active")) {
          const homeTab = document.querySelector('[data-tab="tab-home"]');
          if (homeTab) homeTab.click();
        }
      }
    });

    if (pendingBadge) {
      if (pendingItems.length > 0 && isMudi06) {
        pendingBadge.textContent = pendingItems.length;
        pendingBadge.classList.remove("hidden");
      } else {
        pendingBadge.classList.add("hidden");
      }
    }

    if (scoreCardContainer) {
      scoreCardContainer.style.display = "none";
    }

    // FILTRAGGIO ELEMENTI APPROVATI PER L'UTENTE SELEZIONATO
    const targetApproved = approvedItems.filter(i => {
      const target = i.targetUser || "Cristian";
      return selectedTargetUser && target.toLowerCase() === selectedTargetUser.toLowerCase();
    });

    // 1. STORICO APPROVATO DELL'UTENTE SELEZIONATO (TAB HOME)
    if (logContainer) {
      if (!selectedTargetUser) {
        logContainer.innerHTML = '<div class="empty">Seleziona un utente dal menu in alto per vederne lo storico.</div>';
        if ($("empty")) $("empty").style.display = "none";
      } else if (!targetApproved.length) {
        logContainer.innerHTML = `<div class="empty">Nessun punto ancora registrato per ${esc(selectedTargetUser)}.</div>`;
        if ($("empty")) $("empty").style.display = "none";
      } else {
        if ($("empty")) $("empty").style.display = "none";

        const groups = {};
        targetApproved.slice().reverse().forEach(function(i) {
          var d = new Date(i.d);
          var dayKey = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
          var dayTitle = d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
          
          if (!groups[dayKey]) {
            groups[dayKey] = { title: dayTitle, items: [] };
          }
          groups[dayKey].items.push(i);
        });

        let html = "";
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

        logContainer.innerHTML = html;
      }
    }

    // 2. IN ATTESA (TAB PENDING - SOLO MUDI06)
    if (pendingContainer) {
      if (!isMudi06) {
        pendingContainer.innerHTML = '<div class="empty">Sezione riservata all\'amministratore Mudi06.</div>';
      } else if (pendingItems.length === 0) {
        pendingContainer.innerHTML = '<div class="empty">Nessuna segnalazione in attesa.</div>';
      } else {
        let html = '<ul style="list-style:none; padding:0; margin:0;">';
        pendingItems.slice().reverse().forEach(function(i) {
          var d = new Date(i.d);
          var h = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          var dayStr = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
          var noteText = i.n ? esc(i.n) : '<span style="color:var(--text-muted)">senza motivo</span>';
          var targetText = i.targetUser ? ' <strong>per ' + esc(i.targetUser) + '</strong>' : '';
          var authorText = i.author ? ' <small style="opacity:0.7;">(da ' + esc(i.author) + ')</small>' : '';
          var photoHtml = i.img ? '<img src="' + i.img + '" class="entry-photo clickable-photo" alt="Foto allegata" style="cursor:pointer;" data-img="' + i.img + '" data-caption="' + esc(i.n || '') + '" />' : '';

          var actionBtns = 
            '<div style="display:flex; gap:8px; margin-top:10px;">' +
              '<button type="button" onclick="approvePendingItem(\'' + i.id + '\')" style="flex:1; padding:10px; background:var(--pos); color:#fff; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">✓ Approva</button>' +
              '<button type="button" onclick="rejectPendingItem(\'' + i.id + '\')" style="flex:1; padding:10px; background:var(--neg); color:#fff; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">✕ Rifiuta</button>' +
            '</div>';

          html += '<li class="' + i.t + '" style="margin-bottom:12px; flex-direction:column; align-items:stretch;">' +
                    '<div style="display:flex; align-items:center; gap:10px;">' +
                      '<span class="tag">' + (i.t === "p" ? "+" : "−") + '</span>' +
                      '<div class="txt">' + noteText + targetText + authorText + photoHtml + '</div>' +
                      '<span class="time">' + dayStr + ' ' + h + '</span>' +
                    '</div>' +
                    actionBtns +
                  '</li>';
        });
        html += '</ul>';
        pendingContainer.innerHTML = html;
      }
    }

    // 3. CLASSIFICA (ORDINATA PER PUNTI POSITIVI / BILANCIO MAGGIORE)
    if (leaderboardContainer) {
      const stats = {};

      registeredUsers.forEach(user => {
        stats[user] = { pos: 0, neg: 0, balance: 0 };
      });

      approvedItems.forEach(i => {
        const target = i.targetUser || "Cristian";
        if (!stats[target]) {
          stats[target] = { pos: 0, neg: 0, balance: 0 };
        }
        if (i.t === "p") stats[target].pos++;
        else stats[target].neg++;

        stats[target].balance = stats[target].pos - stats[target].neg;
      });

      const sortedUsers = Object.keys(stats).sort((a, b) => {
        if (stats[b].balance !== stats[a].balance) {
          return stats[b].balance - stats[a].balance;
        }
        return stats[b].pos - stats[a].pos;
      });

      if (sortedUsers.length === 0) {
        leaderboardContainer.innerHTML = '<div class="empty">Nessun dato ancora in classifica.</div>';
      } else {
        let html = '<ul style="list-style:none; padding:0; margin:0;">';
        sortedUsers.forEach((user, index) => {
          const u = stats[user];
          const rankNumber = index + 1;
          
          let balanceDisplay = (u.balance > 0 ? "+" : "") + u.balance;
          let balanceColor = u.balance > 0 ? "var(--pos)" : u.balance < 0 ? "var(--neg)" : "var(--text-color)";

          html += '<li style="display:flex; justify-content:space-between; align-items:center; padding:14px; background:var(--surface); border:2px solid var(--line); border-radius:16px; margin-bottom:10px;">' +
                    // SINISTRA: Numero Posizione e Nome Utente
                    '<div style="display:flex; align-items:center; gap:12px; flex:1;">' +
                      '<span style="font-size:1.2rem; font-weight:bold; min-width:20px; text-align:center; color:var(--text-muted);">' + rankNumber + '</span>' +
                      '<div style="font-weight:bold; font-size:1.1rem;">' + esc(user) + '</div>' +
                    '</div>' +
                    
                    // CENTRO: Badge Punti Positivi (Verde) e Negativi (Rosso)
                    '<div style="display:flex; gap:6px; font-weight:bold; font-size:0.9rem; justify-content:center; flex:1;">' +
                      '<span style="color:var(--pos); background:var(--pos-bg); padding:6px 10px; border-radius:8px;">+' + u.pos + '</span>' +
                      '<span style="color:var(--neg); background:var(--neg-bg); padding:6px 10px; border-radius:8px;">−' + u.neg + '</span>' +
                    '</div>' +
                    
                    // DESTRA: Totale Netto (Senza scritta "Saldo:")
                    '<div style="font-size:1.4rem; font-weight:800; color:' + balanceColor + '; min-width:50px; text-align:right;">' +
                      balanceDisplay +
                    '</div>' +
                  '</li>';
        });
        html += '</ul>';
        leaderboardContainer.innerHTML = html;
      }
    }

    // 4. ULTIMI MOVIMENTI / DECISIONI (SOLO MUDI06)
    if (decisionsContainer) {
      if (!isMudi06) {
        decisionsContainer.innerHTML = '<div class="empty">Sezione riservata all\'amministratore Mudi06.</div>';
      } else if (decisionHistory.length === 0) {
        decisionsContainer.innerHTML = '<div class="empty">Ancora nessuna decisione registrata.</div>';
      } else {
        let html = '<ul style="list-style:none; padding:0; margin:0;">';
        decisionHistory.slice().reverse().forEach(function(i) {
          var d = new Date(i.decisionDate || i.d);
          var h = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          var dayStr = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
          var rawNoteText = i.n ? esc(i.n) : '<span style="color:var(--text-muted)">senza motivo</span>';
          var targetText = i.targetUser ? ' <strong>per ' + esc(i.targetUser) + '</strong>' : '';
          var authorText = i.author ? ' <small style="opacity:0.7;">(da ' + esc(i.author) + ')</small>' : '';
          
          let statusBadge = "";
          let isCanceled = (i.status === "canceled");

          if (i.status === "approved") {
            statusBadge = '<span style="background:var(--pos-bg); color:var(--pos); padding:4px 8px; border-radius:8px; font-size:0.8rem; font-weight:bold;">✓ Approvato</span>';
          } else if (i.status === "rejected") {
            statusBadge = '<span style="background:var(--neg-bg); color:var(--neg); padding:4px 8px; border-radius:8px; font-size:0.8rem; font-weight:bold;">✕ Rifiutato</span>';
          } else if (isCanceled) {
            statusBadge = '<div style="display:flex; align-items:center; gap:6px;">' +
                            '<span style="background:var(--pos-bg); color:var(--pos); padding:4px 8px; border-radius:8px; font-size:0.8rem; font-weight:bold; text-decoration:line-through; opacity:0.6;">✓ Approvato</span>' +
                            '<span style="background:#666; color:#fff; padding:4px 8px; border-radius:8px; font-size:0.8rem; font-weight:bold;">Annullato</span>' +
                          '</div>';
          }

          var noteText = isCanceled 
            ? '<span style="text-decoration:line-through; opacity:0.6;">' + rawNoteText + '</span>' 
            : rawNoteText;

          var photoHtml = i.img ? '<img src="' + i.img + '" class="entry-photo clickable-photo" alt="Foto allegata" style="cursor:pointer; ' + (isCanceled ? 'opacity:0.5;' : '') + '" data-img="' + i.img + '" data-caption="' + esc(i.n || '') + '" />' : '';

          html += '<li class="' + i.t + '" style="margin-bottom:10px; flex-direction:column; align-items:stretch;">' +
                    '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">' +
                      statusBadge +
                      '<span class="time">' + dayStr + ' ' + h + '</span>' +
                    '</div>' +
                    '<div style="display:flex; align-items:center; gap:10px;">' +
                      '<span class="tag" style="' + (isCanceled ? 'opacity:0.5;' : '') + '">' + (i.t === "p" ? "+" : "−") + '</span>' +
                      '<div class="txt">' + noteText + targetText + authorText + photoHtml + '</div>' +
                    '</div>' +
                  '</li>';
        });
        html += '</ul>';
        decisionsContainer.innerHTML = html;
      }
    }
  }

  function add(t) {
    if (!selectedTargetUser) {
      alert("Seleziona prima l'utente a cui desideri assegnare il punto!");
      if (targetUserSelect) targetUserSelect.focus();
      return;
    }

    const noteEl = $("note");
    const val = noteEl ? noteEl.value.trim() : "";
    
    const newItem = {
      id: "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      t: t, 
      n: val, 
      img: currentPhotoBase64, 
      d: Date.now(),
      author: currentUsername,
      targetUser: selectedTargetUser
    };

    pendingItems.push(newItem);

    if (noteEl) noteEl.value = "";
    currentPhotoBase64 = "";
    if (photoInput) photoInput.value = "";
    if (photoName) photoName.textContent = "";
    if (removePhotoBtn) removePhotoBtn.classList.add("hidden");

    saveSharedData();
    render();
    
    alert(`Segnalazione inviata per ${selectedTargetUser}! In attesa di approvazione admin.`);
    if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
  }

  window.approvePendingItem = function(id) {
    if (currentUsername.toLowerCase() !== "mudi06") return;
    const index = pendingItems.findIndex(i => i.id === id);
    if (index !== -1) {
      const item = pendingItems.splice(index, 1)[0];
      item.status = "approved";
      item.decisionDate = Date.now();
      approvedItems.push(item);
      decisionHistory.push(item);
      saveSharedData();
      render();
    }
  };

  window.rejectPendingItem = function(id) {
    if (currentUsername.toLowerCase() !== "mudi06") return;
    const index = pendingItems.findIndex(i => i.id === id);
    if (index !== -1) {
      const item = pendingItems.splice(index, 1)[0];
      item.status = "rejected";
      item.decisionDate = Date.now();
      decisionHistory.push(item);
      saveSharedData();
      render();
    }
  };

  if ($("plus")) $("plus").onclick = function() { if (this.blur) this.blur(); add("p"); };
  if ($("minus")) $("minus").onclick = function() { if (this.blur) this.blur(); add("n"); };
  
  if ($("note")) {
    $("note").addEventListener("keydown", function(e) { if (e.key === "Enter") { add("p"); } });
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
          const lastItem = approvedItems.pop();
          lastItem.status = "canceled";
          lastItem.decisionDate = Date.now();
          decisionHistory.push(lastItem);
          saveSharedData();
          render();
        }
      } else {
        alert("Non ci sono elementi approvati da annullare.");
      }
    };
  }

  render();
});
