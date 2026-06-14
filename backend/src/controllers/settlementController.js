const { Settlement, User } = require("../models");

exports.createSettlement = async (req, res) => {
  try {
    const { groupId, amount, currency, paidById, receivedById, settlementDate } = req.body;

    const settlement = await Settlement.create({
      groupId,
      amount,
      currency: currency || "INR",
      paidById,
      receivedById,
      settlementDate: settlementDate || new Date().toISOString().split('T')[0],
    });

    res.status(201).json(settlement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const settlements = await Settlement.findAll({
      where: { groupId },
      include: [
        { model: User, as: "paidBy", attributes: ["id", "name"] },
        { model: User, as: "receivedBy", attributes: ["id", "name"] },
      ],
      order: [["settlementDate", "ASC"]],
    });

    res.json(settlements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
