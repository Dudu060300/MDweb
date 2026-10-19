(function () {
  'use strict';

  // Ascolta lo stato di autenticazione di Firebase
  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      // Se l'utente NON è loggato, reindirizza subito a index.html
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
