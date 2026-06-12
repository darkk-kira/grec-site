Admin setup — create admin Firestore document

Use this short snippet from the browser console after signing in with the admin account (auth and db are available via `../js/firebase-config.js`):

1. Open the site and sign in as the admin user (admin@grec.com).
2. Open the browser DevTools Console and paste the following (replace UID if needed):

(async () => {
try {
const uid = 'mK73mmFw4lPg1VbNWuWVF...'; // replace with the full UID from your console screenshot
const email = 'admin@grec.com';
const name = auth.currentUser?.displayName || 'Admin';

    if (!auth.currentUser) {
      console.error('No authenticated user. Sign in first.');
      return;
    }
    if (auth.currentUser.uid !== uid && auth.currentUser.email !== email) {
      console.warn('Signed-in user does not match the provided UID/email. Proceeding anyway with the signed-in user.');
    }

    const data = {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || email,
      name: name,
      photoURL: auth.currentUser.photoURL || '',
      role: ROLES.ADMIN,
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('admins').doc(auth.currentUser.uid).set(data, { merge: true });
    console.log('Admin document created/updated for', auth.currentUser.uid);

} catch (err) {
console.error('Failed to create admin doc:', err);
}
})();

Notes:

- Alternatively, you can rely on the allowlist: `js/firebase-config.js` already contains `ADMIN_EMAILS` which includes `admin@grec.com`. When that user next logs in, `ensureAdminBootstrap(user)` will auto-create the Firestore `admins` document.
- If you prefer, create the document directly from the Firebase Console → Firestore → create a document with id = UID and the fields shown above.

If you want, I can also embed a one-click helper in `admin/index.html` that will create the doc when clicked by an allowlisted user (only visible to them). Tell me if you want that.
