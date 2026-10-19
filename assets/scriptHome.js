document.addEventListener("DOMContentLoaded", () => {
  // 1. Gestione del Tema
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  } else if (savedTheme === "light") {
    document.body.classList.remove("dark");
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.body.classList.add("dark");
  }

  // Elementi UI
  const userMenu = document.getElementById("userMenu");
  const logoutBtn = document.getElementById("logout");
  const editProfileBtn = document.getElementById("editProfile");
  const userIcon = document.getElementById("userIcon");
  const userName = document.getElementById("userName");
  const overlay = document.getElementById("overlay");

  const photoModal = document.getElementById("photoModal");
  const modalImage = document.getElementById("modalImage");
  const modalCaption = document.getElementById("modalCaption");
  const closePhotoModal = document.getElementById("closePhotoModal");

  // Menu Dropdown
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

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.auth) {
        auth.signOut().then(() => {
          location.href = "index.html";
        }).catch(err => alert("Errore logout: " + err.message));
      }
    });
  }

  // Anteprima Foto
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

  // Autenticazione Firebase
  if (window.auth) {
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

      initFirestore(user.uid);
    });
  }

  // Logica Contatore
  let items = [];
  let dbInstance, currentUserId;
  let currentPhotoBase64 = "";

  const $ = function(id) { return document.getElementById(id); };

  const photoInput = $("photoInput");
  const photoName = $("photoName");
  const removePhotoBtn = $("removePhotoBtn");

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
    
    if ($("log")) {
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
        var escapedCaption = i.n ? esc(i.n).replace(/'/g, "\\'") : '';

        var photoHtml = i.img 
          ? '<img src="' + i.img + '" class="entry-photo" alt="Foto allegata" style="cursor:pointer;" onclick="openPhotoPreview(\'' + i.img + '\', \'' + escapedCaption + '\')" />' 
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
      
      $("log").innerHTML = html;
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
      if (window.firebase) {
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
