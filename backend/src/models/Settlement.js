const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Settlement = sequelize.define("Settlement", {
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

  settlementDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
});

module.exports = Settlement;
