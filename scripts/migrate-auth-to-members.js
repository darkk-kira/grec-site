#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = {
    projectId: '',
    serviceAccount: '',
    dryRun: false,
    upsert: false,
    batchSize: 400,
    includeDisabled: true
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    const next = argv[i + 1];
    if (value === '--project-id' && next) {
      args.projectId = next;
      i += 1;
    } else if (value === '--service-account' && next) {
      args.serviceAccount = next;
      i += 1;
    } else if (value === '--dry-run') args.dryRun = true;
    else if (value === '--upsert') args.upsert = true;
    else if (value === '--skip-disabled') args.includeDisabled = false;
    else if (value === '--batch-size' && next) {
      args.batchSize = Number(next) || args.batchSize;
      i += 1;
    }
  }

  return args;
}

function readProjectId() {
  const rcPath = path.resolve(process.cwd(), '.firebaserc');
  try {
    const raw = fs.readFileSync(rcPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.projects?.default || '';
  } catch (error) {
    return '';
  }
}

function toTimestamp(value) {
  if (!value) return admin.firestore.FieldValue.serverTimestamp();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.Timestamp.fromDate(date);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function splitDisplayName(displayName, email) {
  const fallback = (email || '').split('@')[0] || 'Membre';
  const name = String(displayName || fallback).trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return {
    nom: name,
    prenom: parts[0] || fallback,
    nomFamille: parts.slice(1).join(' '),
    slug: slugify(name)
  };
}

function buildMemberData(user) {
  const nameParts = splitDisplayName(user.displayName, user.email);
  const createdAt = user.metadata?.creationTime || user.metadata?.lastSignInTime || null;
  const lastLoginAt = user.metadata?.lastSignInTime || null;

  return {
    uid: user.uid,
    authUid: user.uid,
    nom: nameParts.nom,
    prenom: nameParts.prenom,
    nomFamille: nameParts.nomFamille,
    slug: nameParts.slug,
    displayName: user.displayName || nameParts.nom,
    email: user.email || '',
    telephone: '',
    pays: '',
    ville: '',
    secteur: '',
    bio: '',
    poste: '',
    photoURL: user.photoURL || '',
    statut: user.disabled ? 'suspendu' : 'actif',
    codeEthique: true,
    role: 'membre',
    publicProfileEnabled: true,
    showPhoto: true,
    showBio: true,
    showLocation: true,
    migratedFromAuth: true,
    authCreatedAt: createdAt,
    authLastLoginAt: lastLoginAt,
    authProviderIds: (user.providerData || []).map((provider) => provider.providerId).filter(Boolean),
    createdAt: toTimestamp(createdAt),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function listAllUsers(includeDisabled = true) {
  const auth = admin.auth();
  const users = [];
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);
    page.users.forEach((user) => {
      if (includeDisabled || !user.disabled) {
        users.push(user);
      }
    });
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const projectId = args.projectId || process.env.FIREBASE_PROJECT_ID || readProjectId();
  const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

  if (!projectId) {
    throw new Error('Missing project id. Pass --project-id or set FIREBASE_PROJECT_ID.');
  }

  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId
    });
  } else {
    admin.initializeApp({ projectId });
  }

  const db = admin.firestore();
  const users = await listAllUsers(args.includeDisabled);

  let created = 0;
  let skipped = 0;
  let updated = 0;
  let batch = db.batch();
  let batchOps = 0;

  async function commitBatchIfNeeded(force = false) {
    if (batchOps === 0) return;
    if (!force && batchOps < args.batchSize) return;
    await batch.commit();
    batch = db.batch();
    batchOps = 0;
  }

  for (const user of users) {
    const ref = db.collection('membres').doc(user.uid);
    const snap = await ref.get();
    const payload = buildMemberData(user);

    if (snap.exists && !args.upsert) {
      skipped += 1;
      continue;
    }

    if (args.dryRun) {
      if (snap.exists) {
        if (args.upsert) updated += 1;
        else skipped += 1;
      } else {
        created += 1;
      }
      continue;
    }

    batch.set(ref, payload, { merge: true });
    batchOps += 1;
    if (snap.exists) updated += 1;
    else created += 1;

    await commitBatchIfNeeded(false);
  }

  if (!args.dryRun) {
    await commitBatchIfNeeded(true);
  }

  const summary = {
    projectId,
    usersTotal: users.length,
    created,
    updated,
    skipped,
    dryRun: args.dryRun,
    upsert: args.upsert
  };

  if (args.dryRun) {
    console.log('[dry-run]', JSON.stringify(summary, null, 2));
    return;
  }

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
