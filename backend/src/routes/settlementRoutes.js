const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { createSettlement, getGroupSettlements } = require("../controllers/settlementController");

router.post("/", authMiddleware, createSettlement);
router.get("/group/:groupId", authMiddleware, getGroupSettlements);

module.exports = router;
