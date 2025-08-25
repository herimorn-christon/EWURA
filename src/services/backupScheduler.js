// services/backupScheduler.js
import cron from "node-cron";
import { backupService } from "./backupService.js";
import fs from "fs";
import path from "path";

const TZ_DEFAULT = process.env.TZ || "Africa/Dar_es_Salaam";
let taskRef = null;
let currentConfig = null;

/**
 * config = {
 *   enabled: boolean,
 *   timeHHMM: "HH:MM",
 *   timezone: "Africa/Dar_es_Salaam",
 *   retentionDays: number
 * }
 */
export function startBackupScheduler(logger = console, config) {
  return reconfigureFromSettings(logger, config);
}

export function stopBackupScheduler() {
  if (taskRef) {
    taskRef.stop();
    taskRef = null;
  }
  currentConfig = null;
}

/** Reconfigure safely (stop old task, start new if enabled) */
export function reconfigureFromSettings(logger = console, config) {
  // Normalize + guard
  const cfg = normalizeConfig(config);

  // If nothing changed, keep current task
  if (isSameConfig(currentConfig, cfg)) {
    logger.info?.("🗓️ Backup scheduler unchanged");
    return taskRef;
  }

  // Stop any existing task
  if (taskRef) {
    taskRef.stop();
    taskRef = null;
  }
  currentConfig = cfg;

  if (!cfg.enabled) {
    logger.info?.("🛑 Auto-backup disabled by settings");
    return null;
  }

  // Convert HH:MM to cron "m h * * *"
  const [hh, mm] = cfg.timeHHMM.split(":").map((v) => parseInt(v, 10));
  const CRON_EXPR = `${mm} ${hh} * * *`; // daily at HH:MM

  logger.info?.(
    `🗓️  Auto-backup scheduled: "${CRON_EXPR}" (TZ=${cfg.timezone}), retentionDays=${cfg.retentionDays}`
  );

  taskRef = cron.schedule(
    CRON_EXPR,
    async () => {
      try {
        logger.info?.("💾 Running scheduled backup...");
        const result = await backupService.create();
        logger.info?.(`✅ Backup saved: ${result.filePath}`);

        // prune after successful backup
        try {
          await pruneOldBackups(logger, cfg.retentionDays);
        } catch (pruneErr) {
          logger.warn?.("⚠️ Retention prune failed:", pruneErr?.message || pruneErr);
        }
      } catch (err) {
        logger.error?.("❌ Scheduled backup failed:", err?.message || err);
      }
    },
    { timezone: cfg.timezone || TZ_DEFAULT }
  );

  taskRef.start();
  return taskRef;
}

/** One-off prune helper (can be called from anywhere) */
export async function pruneOldBackups(logger = console, retentionDays = 30) {
  const days = Math.max(0, Number(retentionDays) || 0);
  if (days === 0) return; // 0 means "disabled"

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const items = backupService.list(); // [{file, path}]
  let deleted = 0;

  for (const it of items) {
    try {
      const stat = fs.statSync(it.path);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(it.path);
        deleted++;
      }
    } catch (e) {
      logger.warn?.(`⚠️ Failed to inspect/delete ${it.path}: ${e?.message || e}`);
    }
  }
  logger.info?.(`🧹 Retention prune complete: removed ${deleted} old backup(s).`);
}

// ---------- utils ----------
function normalizeConfig(cfg = {}) {
  const out = {
    enabled: !!cfg.enabled,
    timeHHMM: isHHMM(cfg.timeHHMM) ? cfg.timeHHMM : "02:00",
    timezone: cfg.timezone || TZ_DEFAULT,
    retentionDays: isFiniteNumber(cfg.retentionDays) ? Number(cfg.retentionDays) : 30,
  };
  return out;
}
function isHHMM(s) {
  return typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
}
function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}
function isSameConfig(a, b) {
  if (!a || !b) return false;
  return (
    a.enabled === b.enabled &&
    a.timeHHMM === b.timeHHMM &&
    a.timezone === b.timezone &&
    Number(a.retentionDays) === Number(b.retentionDays)
  );
}
