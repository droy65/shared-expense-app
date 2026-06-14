const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Expense = sequelize.define("Expense", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  currency: {
    type: DataTypes.STRING,
    defaultValue: "INR",
  },

  description: {
    type: DataTypes.STRING,
  },

  expenseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  splitType: {
    type: DataTypes.ENUM(
      "EQUAL",
      "EXACT",
      "PERCENTAGE"
    ),
    defaultValue: "EQUAL",
  },

  category: {
    type: DataTypes.STRING,
    defaultValue: "Other",
  },
});

module.exports = Expense;