// services/settingsService.js
import { dbManager } from "../database/DatabaseManager.js";

function parseJSON(v) {
  try { return JSON.parse(v); } catch { return v; }
}

export async function loadSystemSettings() {
  const { rows } = await dbManager.pool.query(
    `SELECT category, key, value FROM system_settings`
  );

  const map = {};
  for (const r of rows) {
    const cat = r.category;
    map[cat] = map[cat] || {};
    map[cat][r.key] = parseJSON(r.value);
  }

  // Normalize shape for consumers
  const backup = map.backup || {};
  const reportGen = map.report_generation || {};

  return {
    backup: {
      autoBackup: backup.auto_backup ?? true,
      backupTime: backup.backup_time ?? "02:00",
      retentionDays: backup.retention_days ?? 30,
      backupLocation: backup.backup_location ?? "/backups",
    },
    reportGeneration: {
      timezone: reportGen.timezone ?? "Africa/Dar_es_Salaam",
    },
  };
}

/** Convert DB settings -> scheduler config */
export function toBackupSchedulerConfig(sys) {
  return {
    enabled: !!sys.backup.autoBackup,
    timeHHMM: sys.backup.backupTime,
    retentionDays: Number(sys.backup.retentionDays),
    timezone: sys.reportGeneration.timezone,
  };
}
