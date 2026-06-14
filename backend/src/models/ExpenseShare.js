const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ExpenseShare = sequelize.define("ExpenseShare", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  shareAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
});

module.exports = ExpenseShare;