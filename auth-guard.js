// Protezione semplice e diretta delle pagine riservate
(function () {
  'use strict';

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      // Se l'utente non è loggato, rimandalo al login
      window.location.replace('index.html');
    }
  });

  // Funzione globale di logout
  window.logout = function () {
    return firebase.auth().signOut().finally(() => {
      window.location.replace('index.html');
    });
  };
})();
