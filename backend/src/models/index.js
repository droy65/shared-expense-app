const User = require("./user");
const Group = require("./Group");
const GroupMember = require("./GroupMember");
const Expense = require("./Expense");
const ExpenseShare = require("./ExpenseShare");
const Settlement = require("./Settlement");
const CSVImport = require("./CSVImport");
const AnomalyLog = require("./AnomalyLog");

// User ↔ Group
User.belongsToMany(Group, {
  through: GroupMember,
});

Group.belongsToMany(User, {
  through: GroupMember,
});

// Group creator
Group.belongsTo(User, {
  as: "creator",
  foreignKey: "creatorId",
});

// ======================
// Expense Associations
// ======================

// One Group -> Many Expenses
Group.hasMany(Expense);
Expense.belongsTo(Group);

// One User -> Many Expenses (payer)
User.hasMany(Expense, {
  foreignKey: "paidBy",
});

Expense.belongsTo(User, {
  foreignKey: "paidBy",
});

// Expense ↔ User through ExpenseShare
Expense.belongsToMany(User, {
  through: ExpenseShare,
});

User.belongsToMany(Expense, {
  through: ExpenseShare,
});

// ======================
// Settlement Associations
// ======================
Group.hasMany(Settlement, { foreignKey: "groupId" });
Settlement.belongsTo(Group, { foreignKey: "groupId" });

User.hasMany(Settlement, { as: "settlementsPaid", foreignKey: "paidById" });
Settlement.belongsTo(User, { as: "paidBy", foreignKey: "paidById" });

User.hasMany(Settlement, { as: "settlementsReceived", foreignKey: "receivedById" });
Settlement.belongsTo(User, { as: "receivedBy", foreignKey: "receivedById" });

// ======================
// Import Associations
// ======================
User.hasMany(CSVImport, { foreignKey: "importedById" });
CSVImport.belongsTo(User, { as: "importer", foreignKey: "importedById" });

CSVImport.hasMany(AnomalyLog, { foreignKey: "importId" });
AnomalyLog.belongsTo(CSVImport, { foreignKey: "importId" });

module.exports = {
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseShare,
  Settlement,
  CSVImport,
  AnomalyLog,
};