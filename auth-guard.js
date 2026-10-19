// Protezione delle pagine riservate (home, profilo, impostazioni).
// Da includere nel <head> dopo firebase-init.js.
// Nasconde la pagina finché Firebase non conferma l'utente, poi la mostra
// oppure reindirizza a index.html.
(function () {
  'use strict';

  document.documentElement.style.visibility = 'hidden';

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.replace('index.html');
      return;
    }
    window.currentUser = user;
    document.documentElement.style.visibility = '';
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: user }));
  });

  // Da collegare al link "Logout": onclick="logout(); return false;"
  window.logout = function () {
    return auth.signOut().finally(() => {
      window.location.replace('index.html');
    });
  };
})();
