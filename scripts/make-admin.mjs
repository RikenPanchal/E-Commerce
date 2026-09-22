#!/usr/bin/env node
// Promotes an existing account to the "admin" role.
// Usage: npm run make-admin -- <email>
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

function loadEnvLocal() {
  const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exitCode = 1;
    return;
  }

  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI (checked the environment and .env.local).");
    process.exitCode = 1;
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const result = await client
      .db()
      .collection("users")
      .updateOne({ email: email.toLowerCase() }, { $set: { role: "admin" } });

    if (result.matchedCount === 0) {
      console.error(`No user found with email "${email}".`);
      process.exitCode = 1;
      return;
    }

    console.log(`"${email}" is now an admin.`);
  } finally {
    await client.close();
  }
}

main();
