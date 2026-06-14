const express = require("express");
const router = express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

router.get(
  "/profile",
  authMiddleware,
  async (req, res) => {

    res.json({
      message: "Protected Route",
      user: req.user
    });

  }
);

module.exports = router;