import { backupService } from "../services/backupService.js";

export const createBackup = async (req, res) => {
  try {
    const result = await backupService.create();
    res.status(200).json({
      success: true,
      message: "✅ Backup created successfully",
      file: result.filePath,
    });
  } catch (error) {
    console.error("❌ Backup failed:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listBackups = async (req, res) => {
  try {
    const backups = await backupService.list();
    res.status(200).json({ success: true, backups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ success: false, message: "Backup file required" });
    }
    await backupService.restore(file);
    res.status(200).json({ success: true, message: "✅ Backup restored successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
