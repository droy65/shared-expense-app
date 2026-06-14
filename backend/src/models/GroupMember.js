const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GroupMember = sequelize.define("GroupMember", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  joinDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  leaveDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },

  status: {
    type: DataTypes.ENUM("ACTIVE", "LEFT"),
    defaultValue: "ACTIVE",
  },
});

module.exports = GroupMember;