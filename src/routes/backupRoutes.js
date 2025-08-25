import { Router } from "express";
import { createBackup, listBackups, restoreBackup } from "../controllers/backupController.js";

const router = Router();

// Trigger a manual backup
router.post("/create", createBackup);

// List available backups
router.get("/", listBackups);

// Restore from a backup
router.post("/restore", restoreBackup);

export default router;
