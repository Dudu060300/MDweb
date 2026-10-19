(function () {
  'use strict';

  // 1. Applica il blocco invisibile IMMEDIATAMENTE appena lo script viene letto
  var style = document.createElement('style');
  style.id = 'auth-guard-style';
  style.innerHTML = 'html { display: none !important; }';
  document.head.appendChild(style);

  // 2. Verifica dello stato utente con Firebase
  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) {
      // Non loggato -> Reindirizzamento forzato immediato
      window.location.replace('index.html');
    } else {
      // Loggato -> Rimuove il blocco invisibile e mostra la pagina
      var guardStyle = document.getElementById('auth-guard-style');
      if (guardStyle) guardStyle.remove();

      // Invia l'evento per scriptProfilo.js
      var event = new CustomEvent('auth-ready', { detail: user });
      document.dispatchEvent(event);
    }
  });

  // Funzione globale di logout
  window.logout = function () {
    return firebase.auth().signOut().finally(function () {
      window.location.replace('index.html');
    });
  };
})();
