let dbConfig;
if (process.env.IS_EC2 == true) {
  dbConfig = require("../config/db.config-ec2.js");
} else {

  dbConfig = require("../config/db.config.js");
}

const {
  Sequelize,
  Op,
  Model,
  DataTypes
} = require("sequelize");
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
db.answer = require("./answer.model.js")(sequelize, Sequelize);
db.category = require("./category.model.js")(sequelize, Sequelize);
//--------Associations-----------
const User = db.user;
const Question = db.question;
const Answer = db.answer;
const Category = db.category;
//1) User-question
User.hasMany(Question, {
  foreignKey: 'user_id'
});
Question.belongsTo(User, {
  foreignKey: 'user_id'
});

//2) Question-answer
Question.hasMany(Answer, {
  foreignKey: 'question_id'
});
Answer.belongsTo(Question, {
  foreignKey: 'question_id'
});

//3) User-answer
User.hasMany(Answer, {
  foreignKey: 'user_id'
});
Answer.belongsTo(User, {
  foreignKey: 'user_id'
});

// 4) Question - categories
Question.belongsToMany(Category, {
  through: 'question_categories_mapping'
});
Category.belongsToMany(Question, {
  through: 'question_categories_mapping'
});

module.exports = db;