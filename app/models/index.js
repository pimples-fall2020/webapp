const dbConfig = require("../config/db.config.js");

const {Sequelize, Op, Model, DataTypes} = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: false,

  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require("./user.model.js")(sequelize, Sequelize);
db.question = require("./question.model.js")(sequelize, Sequelize);

//--------Associations-----------
const User = db.user;
const Question = db.question;
User.hasMany(Question, {
    foreignKey: 'user_id'
});
Question.belongsTo(User, {
  foreignKey: 'user_id'
});

module.exports = db;
