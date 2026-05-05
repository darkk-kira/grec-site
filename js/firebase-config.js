// ============================================================
//  GREC GROUP — Firebase Configuration
//  Remplacez les valeurs ci-dessous par celles de votre
//  projet Firebase (Console > Paramètres > Config SDK)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBYE6ODV8x_0SNbhXZxgR6Wz2EIVQftaTc",
  authDomain: "savplus-school.firebaseapp.com",
  projectId: "savplus-school",
  storageBucket: "savplus-school.firebasestorage.app",
  messagingSenderId: "952771003789",
  appId: "1:952771003789:web:35026a68be664fe84429c4"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);

// Services exportés (utilisés dans tout le site)
const auth      = firebase.auth();
const db        = firebase.firestore();
const storage   = firebase.storage();

// ── Firestore Settings ──────────────────────────────────────
db.settings({ experimentalForceLongPolling: false });

// ── Collections References ──────────────────────────────────
const COLLECTIONS = {
  MEMBRES:     "membres",
  ACTUALITES:  "actualites",
  GALERIE:     "galerie",
  ADMINS:      "admins",
  NEWSLETTER:  "newsletter",
  CONTACTS:    "contacts",
  CHATS:       "chats"
};

// ── Auth Roles ───────────────────────────────────────────────
const ROLES = {
  ADMIN:   "admin",
  MEMBRE:  "membre"
};

// ── Storage Paths ────────────────────────────────────────────
const STORAGE_PATHS = {
  MEMBRES:    "membres/photos/",
  ACTUALITES: "actualites/images/",
  GALERIE:    "galerie/"
};
console.log("Firebase connecté :", firebase.app().name);

