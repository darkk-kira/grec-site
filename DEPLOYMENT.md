# 🚀 Guide de déploiement - GREC Refonte

## ⚙️ Configuration initiale

### 1. Firebase Console Setup

```bash

# 1. Accédez à https://console.firebase.google.com

# 2. Créez un nouveau projet "GREC"

# 3. Générez les credentials Web

# 4. Activez: Authentication, Firestore, Storage, Hosting

```

### 2. Mise à jour des credentials

Fichier: `js/firebase-config.js`

```javascript

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",           // ← À remplacer
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",     // ← À remplacer
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "1:YOUR_APP_ID:web:YOUR_WEB_ID"
};

```

### 3. Règles Firestore

Fichier: `firestore.rules`

Les règles sont déjà configurées dans le projet avec structure sécurisée:

```firestore

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helpers
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Admins - lecture admin uniquement, write via console
    match /admins/{userId} {
      allow read: if isAdmin();
      allow write: if false;
    }

    // Membres - public read, create/update self, delete admin
    match /membres/{membreId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update: if isOwner(membreId) || isAdmin();
      allow delete: if isAdmin();
    }

    // Actualités - public read, admin write
    match /actualites/{articleId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Galerie - public read, admin write
    match /galerie/{photoId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Newsletter - public subscribe, admin manage
    match /newsletter/{emailId} {
      allow read: if isAdmin();
      allow create: if true;
      allow update, delete: if isAdmin();
    }

    // Contacts - public submit, admin read
    match /contacts/{contactId} {
      allow read: if isAdmin();
      allow create: if true;
      allow update, delete: if isAdmin();
    }
  }
}

```

📋 **À déployer via:** `firebase deploy --only firestore:rules`

### 4. Règles Storage

Fichier: `storage.rules`

Les règles sont pré-configurées avec validation de taille et de type:

```storage

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAdmin() {
      return request.auth != null &&
        firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid));
    }

    // Photos membres — chaque membre peut uploader la sienne
    match /membres/photos/{filename} {
      allow read: if true;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024    // < 5 MB
        && request.resource.contentType.matches('image/.*');
    }

    // Images actualités — admin uniquement
    match /actualites/{filename} {
      allow read: if true;
      allow write: if isAdmin()
        && request.resource.size < 10 * 1024 * 1024   // < 10 MB
        && request.resource.contentType.matches('image/.*');
    }

    // Images galerie — admin uniquement
    match /galerie/{filename} {
      allow read: if true;
      allow write: if isAdmin()
        && request.resource.size < 10 * 1024 * 1024   // < 10 MB
        && request.resource.contentType.matches('image/.*');
    }

    // Deny all else
    match /{allPaths=**} {
      allow read: if false;
      allow write: if false;
    }
  }
}

```

📋 **À déployer via:** `firebase deploy --only storage:rules`

### 5. Collections Firestore à créer

**Créer manuellement 6 collections avec structure suivante:**

#### 1. **admins** (Document ID = UID utilisateur)

Rajoute l'utilisateur comme admin:

```json

{
  "role": "admin",
  "email": "admin@grec.group",
  "createdAt": "2024-01-15T10:30:00Z"
}

```

- `role` (string): "admin" (requis)
- `email` (string): email utilisateur
- `createdAt` (timestamp): date d'ajout

#### 2. **membres** (Document ID = UID utilisateur)

Créé automatiquement lors de l'inscription:

```json

{
  "uid": "user123abc",
  "nom": "John Doe",
  "email": "john@example.com",
  "telephone": "+33612345678",
  "secteur": "IT",
  "bio": "Directeur technique",
  "photoURL": "https://storage.googleapis.com/...",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}

```

- `uid` (string): Firebase Auth UID
- `nom` (string): Nom complet
- `email` (string): Email (indexé)
- `telephone` (string): Optionnel
- `secteur` (string): Domaine professionnel
- `bio` (string): Description courte
- `photoURL` (string): Lien photo de profil
- `createdAt`, `updatedAt` (timestamp): Dates

#### 3. **actualites** (Document ID = auto)

Créé via admin.html:

```json

{
  "titre": "Nouvelle année, nouveaux projets",
  "description": "Les actualités du groupe GREC...",
  "contenu": "Texte complet de l'article (Markdown optionnel)",
  "categorie": "news",
  "image": "https://storage.googleapis.com/.../article1.jpg",
  "auteur": "John Doe",
  "published": true,
  "publishedAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}

```

- `titre` (string): Titre article ⭐
- `description` (string): Résumé court
- `contenu` (string): Texte complet
- `categorie` (string): "news" | "event" | "update"
- `image` (string): URL image de couverture
- `auteur` (string): Nom de l'auteur
- `published` (boolean): Publié ou brouillon
- `publishedAt` (timestamp): Date de publication
- `createdAt`, `updatedAt` (timestamp): Dates

#### 4. **galerie** (Document ID = auto)

Créé via admin.html:

```json

{
  "titre": "Réunion Q1 2024",
  "url": "https://storage.googleapis.com/.../photo1.jpg",
  "categorie": "reunions",
  "description": "Photos de la réunion d'équipe",
  "uploadedAt": "2024-01-15T10:30:00Z"
}

```

- `titre` (string): Titre photo
- `url` (string): URL image dans Storage ⭐
- `categorie` (string): "events" | "reunions" | "workshops"
- `description` (string): Description courte
- `uploadedAt` (timestamp): Date d'upload

#### 5. **newsletter** (Document ID = auto)

Créé lors d'une subscription:

```json

{
  "email": "subscriber@example.com",
  "subscribedAt": "2024-01-15T10:30:00Z",
  "active": true
}

```

- `email` (string): Email abonné ⭐
- `subscribedAt` (timestamp): Date subscription
- `active` (boolean): Abonné actif

#### 6. **contacts** (Document ID = auto)

Créé via formulaire contact:

```json

{
  "nom": "Jean Dupont",
  "email": "contact@example.com",
  "telephone": "+33612345678",
  "sujet": "Demande de partenariat",
  "message": "Contenu du message...",
  "statut": "nouveau",
  "createdAt": "2024-01-15T10:30:00Z"
}

```

- `nom` (string): Nom contact
- `email` (string): Email réponse ⭐
- `telephone` (string): Optionnel
- `sujet` (string): Sujet du message
- `message` (string): Contenu
- `statut` (string): "nouveau" | "en cours" | "résolu"
- `createdAt` (timestamp): Date création

## 📦 Déploiement Firebase Hosting

### Installation CLI Firebase

```bash

npm install -g firebase-tools

```

### Login

```bash

firebase login

```

### Initialiser le projet (si nouveau projet)

```bash

firebase init
# Sélectionner: Firestore, Storage, Hosting, Authentication

# Public directory: . (racine du projet)

# Configure as SPA: Yes

```

### Configuration project ID

```bash

firebase use --add
# Sélectionner le projet GREC depuis console.firebase.google.com

```

### Publier le site + règles

```bash

# Tout déployer (hosting + règles)

firebase deploy

# OU déployer séparément:

firebase deploy --only hosting       # Site uniquement
firebase deploy --only firestore:rules  # Règles Firestore
firebase deploy --only storage:rules    # Règles Storage

```

### Vérifier le déploiement

```bash

firebase hosting:channel:list   # Voir tous les déploiements
firebase hosting:sites:list     # Sites déployés

```

## 🔐 Ajouter des administrateurs

### Étape 1: Obtenir l'UID utilisateur

1. Aller à Firebase Console → **Authentication** → Onglet **Users**
2. Créer un nouvel utilisateur avec email/password
3. Cliquer sur l'utilisateur, copier l'**UID** (ex: `g7Hx2kQ9mP8nR5vL`)

### Étape 2: Ajouter comme admin

1. Aller à **Firestore Database** → Collection `admins`
2. Cliquer **+ Ajouter un document**
3. **Document ID:** Coller l'UID copié
4. Ajouter les champs:
   - `role` (string): `admin`
   - `email` (string): `admin@grec.group`
   - `createdAt` (timestamp): Aujourd'hui

### Vérification

L'utilisateur peut maintenant:

- Accéder à `https://grec.group/admin/`
- Ajouter des articles, galerie
- Gérer les utilisateurs
- Publier des actualités

## 📱 Configuration domaine personnalisé

### 1. Configurer le domaine

```bash

firebase hosting:channel:deploy live --expires 30d

```

### 2. Pointer DNS vers Firebase

Dans les settings du domaine:

```

CNAME: grec.web.app

```

## ✅ Checklist déploiement complet

### 📋 Avant le déploiement

- [ ] **Firebase credentials** configurés dans `js/firebase-config.js`
  - Vérifier: `firebase.apps.length > 0` en console
- [ ] **Projet Firebase créé** sur console.firebase.google.com
- [ ] **Authentication** activé (Email/Mot de passe)
- [ ] **Firestore** créé (sélectionner région: `europe-west1`)
- [ ] **Storage** créé
- [ ] **Hosting** activé

### 🔒 Règles de sécurité

- [ ] **firestore.rules** déployées: `firebase deploy --only firestore:rules`
- [ ] **storage.rules** déployées: `firebase deploy --only storage:rules`
- [ ] Règles testées dans Firestore Rules Simulator

### 📊 Collections Firestore

- [ ] **admins** - Collection créée, administrateur(s) ajouté(s)
- [ ] **membres** - Collection créée (auto-populated lors inscription)
- [ ] **actualites** - Collection créée
- [ ] **galerie** - Collection créée
- [ ] **newsletter** - Collection créée
- [ ] **contacts** - Collection créée

### 👥 Administration

- [ ] Au moins 1 admin créé
  - UID ajouté dans collection `admins`
  - Email confirmé dans Firebase
- [ ] Admin peut accéder à `/admin/index.html`
- [ ] Admin peut créer articles/galerie sans erreurs

### 🌐 Hébergement

- [ ] `firebase deploy --only hosting` exécuté
- [ ] Site accessible via `<<https://greek-group.firebaseapp.com>>`
- [ ] Domaine personnalisé configuré (optionnel)
- [ ] HTTPS activé automatiquement ✅

### 🧪 Tests fonctionnels

- [ ] **Authentification**
  - Créer compte via `/pages/auth.html`
  - Vérifier email créé dans Firebase Auth
  - Vérifier document dans collection `membres`
- [ ] **Articles**
  - Admin crée article via `/admin/`
  - Article visible dans `/pages/actualites.html`
- [ ] **Galerie**
  - Admin upload photo via `/admin/`
  - Photo visible dans `/pages/galerie.html`
  - Lightbox fonctionne
- [ ] **Responsive**
  - Tester sur mobile (375px), tablet (768px), desktop (1920px)
  - Menu mobile fonctionne
  - Images se chargent
- [ ] **Erreurs console**
  - Pas d'erreur Firebase en ouvrant DevTools

### 📈 Performance & Analytics

- [ ] Google Analytics configuré (optionnel)
- [ ] Firestore Database Indexes créés pour recherche
- [ ] Cloud Functions pour tâches automatisées (optionnel)

### 📞 Support & Documentation

- [ ] REFONTE.md lu par équipe
- [ ] DEPLOYMENT.md accessible par administrateurs
- [ ] Contacts admin documentés

## 🧪 Tests avant déploiement

```javascript

// Test Firebase dans console du navigateur
console.log(firebase.app().name);  // "[DEFAULT]"

// Test authentification
auth.onAuthStateChanged(user => console.log(user));

// Test Firestore
db.collection('actualites').get().then(snap => console.log(snap.size));

// Test Storage
storage.ref().listAll().then(res => console.log(res.items));

```

## 📊 Monitoring

### Via Firebase Console:

- **Dashboard:** Vue d'ensemble
- **Firestore:** Requêtes et stockage
- **Storage:** Fichiers uploadés
- **Analytics:** Visiteurs
- **Performance:** Métriques

## 🆘 Troubleshooting courant

### ❌ Erreur: "Firebase not initialized"

**Cause:** Credentials incorrects ou non chargés

**Solution:**

```javascript

// Vérifier en console du navigateur:
console.log(firebase.apps.length);           // Doit être > 0
console.log(firebase.app().name);            // "[DEFAULT]"
console.log(firebase.auth().currentUser);    // Null avant login

```

**Vérifier js/firebase-config.js:**

- apiKey commence par AIza...?
- projectId sans "firebaseio"?
- authDomain contient ".firebaseapp.com"?

**Action:** Remplacer credentials depuis console.firebase.google.com → Project Settings

---

### ❌ Erreur: "Permission denied" lors création article

**Cause:** Utilisateur n'est pas admin

**Solution:**

```javascript

// Vérifier en console:
auth.currentUser.uid  // Copier cet UID

// Puis ajouter dans Firestore:
// Collection: admins
// Document ID: (l'UID)
// Champs: role="admin"

```

---

### ❌ Photos ne chargent pas dans galerie

**Cause 1:** URLs Storage incorrectes

```javascript

// Vérifier que URL commence par:
https://firebasestorage.googleapis.com/v0/b/

// Sinon télécharger JSON depuis Storage:
// Console → Storage → Cliquer image → "Copy URL"

```

**Cause 2:** Permissions Storage

```javascript

// Vérifier storage.rules permet read:
allow read: if true;  // Doit être présent

```

**Solution:** Redéployer les règles

```bash

firebase deploy --only storage:rules

```

---

### ❌ Admin.html inaccessible / "Access Denied"

**Cause:** Utilisateur pas marqué comme admin

**Solution rapide:**

1. Prendre UID utilisateur (Firebase Console → Auth)
2. Créer document dans `admins`:
   - Document ID = UID
   - role = "admin"
3. Rafraîchir la page admin

---

### ❌ Formulaire registration ne fonctionne pas

**Cause:** Email déjà utilisé ou règles Auth incorrect

**Solution:**

```javascript

// Ajouter try/catch dans console:
firebase.auth().createUserWithEmailAndPassword(email, password)
  .catch(error => console.error(error.message));

// Messages courants:
// "The email address is already in use"
// "Password should be at least 6 characters"
// "The email address is not valid"

```

---

### ❌ Articles visibles en brouillon (ne devraient pas être public)

**Cause:** Règles Firestore permettent read sur tous documents

**Solution:** Ajouter filtre dans actualites.html

```javascript

// Avant deploy, vérifier firestore.rules:
allow read: if resource.data.published == true;  // ← Ajouter

```

---

### ❌ Déploiement Firebase échoue

```bash

# Vérifier le statut:

firebase --version        # Version CLI
firebase projects:list    # Projets disponibles
firebase use --add        # Sélectionner projet

# Vérifier répertoires:

ls firebase.json          # Doit exister
ls firestore.rules        # Doit exister
ls storage.rules          # Doit exister

# Deployer séparément pour debug:

firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

```

---

### ✅ Tester avant production

```javascript

// Test Firebase:
firebase.apps[0].name === "[DEFAULT]"  // true

// Test Authentification:
firebase.auth().onAuthStateChanged(user => {
  console.log("Auth state:", user?.email);
});

// Test Firestore:
firebase.firestore()
  .collection('actualites')
  .get()
  .then(snap => console.log("Articles:", snap.size));

// Test Storage:
firebase.storage().ref('galerie/').listAll()
  .then(res => console.log("Photos:", res.items.length));

// Test Règles (via simulator en Console):
// Firestore → Rules → Simulator
// - Sélectionner collection
// - Entrer UID (ou "anonymous")
// - Voir qui peut read/write

```

---

### 📊 Logs & Monitoring

**Firebase Console - Firestore:**

1. Aller à Firestore Database
2. Onglet **Metrics** → voir lectures/écritures
3. Onglet **Indexes** → vérifier index actifs

**Firebase Console - Storage:**

1. Aller à Storage
2. Voir fichiers uploadés
3. Vérifier règles violations en logs

**Navigateur - DevTools:**

```javascript

// Console Network tab:
// - XHR requests à firestore.googleapis.com
// - "Access denied" = problème règles
// - "404" = collection/doc n'existe pas

// Console JS errors:
// Chercher firebase.* errors
// Copier exactement pour Google search

```

---

### 🆘 Besoin d'aide?

1. **Vérifier les logs Firebase:**
   - Console → Firestore → Exceptions
   - Voir les requêtes rejetées

2. **Stack Overflow:**
   - Tag: `firebase`
   - Fournir: error message exact, code snippet, règles

3. **Documentation:**
   - <<https://firebase.google.com/docs/firestore/security/rules-query>>
   - <<https://firebase.google.com/docs/storage/security>>

---

## 📞 Support

Pour assistance:
