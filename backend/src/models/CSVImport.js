const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CSVImport = sequelize.define("CSVImport", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
    defaultValue: "PENDING",
  },
});

module.exports = CSVImport;
