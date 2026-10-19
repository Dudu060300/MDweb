(function () {
  'use strict';

  // Nasconde la pagina finché non verifichiamo l'accesso
  document.documentElement.style.visibility = 'hidden';

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      // Se non sei loggato, via immediata a index.html
      window.location.replace('index.html');
    } else {
      // Se sei loggato, mostra la pagina
      document.documentElement.style.visibility = '';

      // Notifica agli script della pagina che l'utente è pronto
      const event = new CustomEvent('auth-ready', { detail: user });
      document.dispatchEvent(event);
    }
  });

  // Funzione globale di logout
  window.logout = function () {
    return firebase.auth().signOut().finally(() => {
      window.location.replace('index.html');
    });
  };
})();
