// services/backupService.js
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow override, else default to ../backups
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, "../backups");
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const {
  DB_USER,
  DB_PASSWORD,
  DB_HOST = "127.0.0.1",
  DB_PORT = "5432",
  DB_NAME,
} = process.env;

function ensureEnv(resThrow = true) {
  const missing = [];
  if (!DB_USER) missing.push("DB_USER");
  if (!DB_PASSWORD) missing.push("DB_PASSWORD");
  if (!DB_HOST) missing.push("DB_HOST");
  if (!DB_PORT) missing.push("DB_PORT");
  if (!DB_NAME) missing.push("DB_NAME");
  if (missing.length && resThrow) {
    throw new Error(`Missing DB env vars: ${missing.join(", ")}`);
  }
}

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...extraEnv },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      reject(new Error(`${cmd} spawn error: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`${cmd} failed with code ${code}\n${stderr || stdout}`));
    });
  });
}

export const backupService = {
  create: async () => {
    ensureEnv();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(BACKUP_DIR, `backup_${timestamp}.sql`);

    // Plain SQL (-F p) and write to file (-f)
    const args = [
      "-U",
      DB_USER,
      "-h",
      DB_HOST,
      "-p",
      String(DB_PORT),
      "-d",
      DB_NAME,
      "-F",
      "p",
      "-f",
      filePath,
    ];

    await run("pg_dump", args, { PGPASSWORD: DB_PASSWORD });
    return { filePath };
  },

  list: () => {
    return fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((file) => ({
        file,
        path: path.join(BACKUP_DIR, file),
      }));
  },

  restore: async (file) => {
    ensureEnv();

    const filePath = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error("Backup file not found");
    }

    // For plain SQL use psql with -f and ON_ERROR_STOP
    const args = [
      "-U",
      DB_USER,
      "-h",
      DB_HOST,
      "-p",
      String(DB_PORT),
      "-d",
      DB_NAME,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      filePath,
    ];

    await run("psql", args, { PGPASSWORD: DB_PASSWORD });
  },
};
