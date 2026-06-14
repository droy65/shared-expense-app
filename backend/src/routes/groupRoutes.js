const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createGroup,
  addMember,
  removeMember,
  getUsersGroups,
  getGroupMembers
} = require("../controllers/groupController");

// Get Users Groups
router.get(
  "/",
  authMiddleware,
  getUsersGroups
);

// Create Group
router.post(
  "/",
  authMiddleware,
  createGroup
);

// Get Group Members
router.get(
  "/:groupId/members",
  authMiddleware,
  getGroupMembers
);

// Add Member
router.post(
  "/:groupId/members",
  authMiddleware,
  addMember
);

// Remove Member
router.patch(
  "/members/:membershipId/leave",
  authMiddleware,
  removeMember
);

module.exports = router;