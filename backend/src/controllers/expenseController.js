const { Expense, ExpenseShare, User, Group, GroupMember, Settlement } = require("../models");
const sequelize = require("../config/db");

// Create Expense
exports.createExpense = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { groupId, amount, currency, description, expenseDate, splitType, paidBy, shares, category } = req.body;

    const expense = await Expense.create({
      GroupId: groupId,
      amount,
      currency: currency || "INR",
      description,
      expenseDate,
      splitType,
      paidBy,
      category: category || "Other",
    }, { transaction: t });

    // Create ExpenseShare entries
    for (const share of shares) {
      await ExpenseShare.create({
        ExpenseId: expense.id,
        UserId: share.userId,
        shareAmount: share.shareAmount,
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json(expense);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Get group expenses
exports.getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const expenses = await Expense.findAll({
      where: { GroupId: groupId },
      include: [
        { model: User, attributes: ["id", "name", "email"] },
        {
          model: User,
          through: { attributes: ["shareAmount"] },
          attributes: ["id", "name"],
        }
      ],
      order: [["expenseDate", "ASC"], ["id", "ASC"]],
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Calculate group balances
exports.getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    // Get all members
    const group = await Group.findByPk(groupId, {
      include: [{ model: User, attributes: ["id", "name", "email"] }],
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const members = group.Users;

    // Get all expenses
    const expenses = await Expense.findAll({
      where: { GroupId: groupId },
      include: [{ model: User, through: { attributes: ["shareAmount"] } }],
    });

    // Get all settlements
    const settlements = await Settlement.findAll({
      where: { groupId },
    });

    // Initialize balance map and category spending map
    const balanceMap = {};
    const categoryTotals = {};
    members.forEach((m) => {
      balanceMap[m.id] = {
        id: m.id,
        name: m.name,
        email: m.email,
        totalPaid: 0.0,
        totalOwed: 0.0,
        settlementsSent: 0.0,
        settlementsReceived: 0.0,
        breakdown: [], // Rohan's detail log
      };
    });

    // Add expenses to paid and owed
    expenses.forEach((exp) => {
      const paidBy = exp.paidBy;
      const amt = parseFloat(exp.amount);
      const cur = exp.currency || "INR";

      // Note: Assume conversion to INR for simplicity of balance calculation, e.g. 1 USD = 83 INR
      const rate = cur === "USD" ? 83.0 : 1.0;
      const amtInr = amt * rate;

      // Add to category spending totals
      const cat = exp.category || "Other";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amtInr;

      if (balanceMap[paidBy]) {
        balanceMap[paidBy].totalPaid += amtInr;
        balanceMap[paidBy].breakdown.push({
          type: "PAYMENT",
          expenseId: exp.id,
          description: exp.description,
          date: exp.expenseDate,
          amount: amtInr,
          originalAmount: amt,
          originalCurrency: cur,
          details: `Paid for "${exp.description}" (${cat})`,
        });
      }

      // Add shares
      exp.Users.forEach((u) => {
        const shareAmt = parseFloat(u.ExpenseShare.shareAmount);
        const shareAmtInr = shareAmt * rate;
        if (balanceMap[u.id]) {
          balanceMap[u.id].totalOwed += shareAmtInr;
          balanceMap[u.id].breakdown.push({
            type: "SHARE",
            expenseId: exp.id,
            description: exp.description,
            date: exp.expenseDate,
            amount: -shareAmtInr,
            originalAmount: -shareAmt,
            originalCurrency: cur,
            details: `Share of "${exp.description}" (Paid by ${exp.User ? exp.User.name : 'Unknown'})`,
          });
        }
      });
    });

    // Add settlements
    settlements.forEach((set) => {
      const paidById = set.paidById;
      const receivedById = set.receivedById;
      const amt = parseFloat(set.amount);
      const cur = set.currency || "INR";
      const rate = cur === "USD" ? 83.0 : 1.0;
      const amtInr = amt * rate;

      if (balanceMap[paidById]) {
        balanceMap[paidById].settlementsSent += amtInr;
        balanceMap[paidById].breakdown.push({
          type: "SETTLEMENT_SENT",
          settlementId: set.id,
          description: "Settlement Payment",
          date: set.settlementDate,
          amount: amtInr,
          originalAmount: amt,
          originalCurrency: cur,
          details: `Settled payment to ${balanceMap[receivedById] ? balanceMap[receivedById].name : 'Unknown'}`,
        });
      }

      if (balanceMap[receivedById]) {
        balanceMap[receivedById].settlementsReceived += amtInr;
        balanceMap[receivedById].breakdown.push({
          type: "SETTLEMENT_RECEIVED",
          settlementId: set.id,
          description: "Settlement Received",
          date: set.settlementDate,
          amount: -amtInr,
          originalAmount: -amt,
          originalCurrency: cur,
          details: `Settlement received from ${balanceMap[paidById] ? balanceMap[paidById].name : 'Unknown'}`,
        });
      }
    });

    // Compute net balances
    const balancesList = Object.values(balanceMap).map((b) => {
      const net = (b.totalPaid + b.settlementsSent) - (b.totalOwed + b.settlementsReceived);
      return {
        ...b,
        netBalance: Math.round(net * 100) / 100,
      };
    });

    // Greedy debt simplification (minimizing transactions)
    const debtors = [];
    const creditors = [];

    balancesList.forEach((b) => {
      if (b.netBalance < -0.01) {
        debtors.push({ id: b.id, name: b.name, amount: -b.netBalance });
      } else if (b.netBalance > 0.01) {
        creditors.push({ id: b.id, name: b.name, amount: b.netBalance });
      }
    });

    const debts = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const paymentAmount = Math.min(debtor.amount, creditor.amount);

      if (paymentAmount > 0.01) {
        debts.push({
          fromId: debtor.id,
          fromName: debtor.name,
          toId: creditor.id,
          toName: creditor.name,
          amount: Math.round(paymentAmount * 100) / 100,
          currency: "INR",
        });
      }

      debtor.amount -= paymentAmount;
      creditor.amount -= paymentAmount;

      if (debtor.amount < 0.01) dIdx++;
      if (creditor.amount < 0.01) cIdx++;
    }

    res.json({
      balances: balancesList,
      debts: debts,
      categoryTotals,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
