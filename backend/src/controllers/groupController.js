const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");
const User = require("../models/user");

// Create Group
exports.createGroup = async (req, res) => {
  try {
    const { name, joinDate } = req.body;

    const group = await Group.create({
      name,
      creatorId: req.user.id,
    });

    // Automatically add creator as a member
    await GroupMember.create({
      GroupId: group.id,
      UserId: req.user.id,
      joinDate: joinDate || new Date().toISOString().split("T")[0],
      status: "ACTIVE",
    });

    res.status(201).json(group);

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// Add Member
exports.addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email, joinDate } = req.body; // Add by email makes more sense for a premium app!

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    // Check if already a member
    const existing = await GroupMember.findOne({
      where: { GroupId: groupId, UserId: user.id }
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return res.status(400).json({ message: "User is already an active member of this group" });
      } else {
        // Re-activate member
        existing.status = "ACTIVE";
        existing.joinDate = joinDate || new Date().toISOString().split("T")[0];
        existing.leaveDate = null;
        await existing.save();
        return res.status(200).json(existing);
      }
    }

    const member = await GroupMember.create({
      GroupId: groupId,
      UserId: user.id,
      joinDate: joinDate || new Date().toISOString().split("T")[0],
      status: "ACTIVE",
    });

    res.status(201).json(member);

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// Remove Member (Member Leaves Group)
exports.removeMember = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { leaveDate } = req.body;

    const member = await GroupMember.findByPk(membershipId);

    if (!member) {
      return res.status(404).json({
        message: "Membership not found",
      });
    }

    member.leaveDate = leaveDate || new Date().toISOString().split("T")[0];
    member.status = "LEFT";

    await member.save();

    res.status(200).json({
      message: "Member marked as LEFT successfully",
      member,
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// Get all groups for the logged-in user
exports.getUsersGroups = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Group,
          through: { where: { status: "ACTIVE" } }
        }
      ]
    });

    res.json(user ? user.Groups : []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get members of a specific group
exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const members = await GroupMember.findAll({
      where: { GroupId: groupId },
      include: [
        { model: User, attributes: ["id", "name", "email"] }
      ]
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};