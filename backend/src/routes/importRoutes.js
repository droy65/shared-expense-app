const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { analyzeImport, commitImport, getImportReport } = require("../controllers/importController");

router.post("/analyze", authMiddleware, analyzeImport);
router.post("/commit", authMiddleware, commitImport);
router.get("/reports", authMiddleware, getImportReport);

module.exports = router;
