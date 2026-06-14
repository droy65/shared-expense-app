const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AnomalyLog = sequelize.define("AnomalyLog", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  rowNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  rawRowData: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  anomalyType: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  status: {
    type: DataTypes.ENUM("DETECTED", "RESOLVED", "IGNORED"),
    defaultValue: "DETECTED",
  },

  resolutionAction: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = AnomalyLog;
