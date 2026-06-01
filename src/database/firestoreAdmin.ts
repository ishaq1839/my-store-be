import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { optionalEnv, requireEnv } from "../config/env";

let db: FirebaseFirestore.Firestore | undefined;
let auth: admin.auth.Auth | undefined;

function initAdminApp() {
  if (admin.apps.length) return;

  const jsonFromEnv = optionalEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  const pathFromEnv = optionalEnv("FIREBASE_SERVICE_ACCOUNT_PATH");

  let raw = jsonFromEnv;
  if (!raw && pathFromEnv) {
    raw = fs.readFileSync(pathFromEnv, "utf8");
  }

  // Local-dev fallback: if the user has a service account file in the repo
  // and didn't set env vars, load it automatically.
  if (!raw) {
    const defaultPath = path.resolve(process.cwd(), "firestore-keys.json");
    if (fs.existsSync(defaultPath)) {
      raw = fs.readFileSync(defaultPath, "utf8");
    }
  }

  if (!raw) {
    raw = requireEnv("FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
  } catch {
    throw new Error(
      "Firestore service account must be valid JSON. Set FIREBASE_SERVICE_ACCOUNT_JSON, or set FIREBASE_SERVICE_ACCOUNT_PATH, or provide ./firestore-keys.json."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getDb(): FirebaseFirestore.Firestore {
  if (db) return db;
  initAdminApp();
  db = admin.firestore();
  return db;
}

export function getAuth(): admin.auth.Auth {
  if (auth) return auth;
  initAdminApp();
  auth = admin.auth();
  return auth;
}

