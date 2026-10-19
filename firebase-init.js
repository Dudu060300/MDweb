// Configurazione e inizializzazione Firebase (condivisa da tutte le pagine).
const firebaseConfig = {
  apiKey: "AIzaSyA1U8IL5gdwoKmsdZgANGR_646ZDbjU50c",
  authDomain: "proghtml-2e571.firebaseapp.com",
  projectId: "proghtml-2e571",
  storageBucket: "proghtml-2e571.appspot.com",
  messagingSenderId: "1071205946034",
  appId: "1:1071205946034:web:7b33935a4232f29abfefab",
  measurementId: "G-Z1TKBCDZ0E"
};

// Inizializza solo se non è già stato fatto
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
