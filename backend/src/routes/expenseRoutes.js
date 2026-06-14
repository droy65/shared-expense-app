const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { createExpense, getGroupExpenses, getGroupBalances } = require("../controllers/expenseController");

router.post("/", authMiddleware, createExpense);
router.get("/group/:groupId", authMiddleware, getGroupExpenses);
router.get("/group/:groupId/balances", authMiddleware, getGroupBalances);

module.exports = router;
