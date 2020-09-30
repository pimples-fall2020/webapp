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

// class User extends Model {}

// User.init({
//   id: {
//     type: DataTypes.UUID,
//     defaultValue: Sequelize.UUIDV4, // Or Sequelize.UUIDV1
//     primaryKey: true
//     //readOnly: true
//   },
//   first_name: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   last_name: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   email_address: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true,
//     validate: {
//       isEmail: true
//     }
//   },
//   password: {
//     type: DataTypes.STRING,
//     is: /(?=^.{8,}$)(?=.*\d)(?=.*[!@#$%^&*]+)(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/i,
//     validate: {
//       len: [8,200]
//     }
//   }
// },
// {
//   timestamps: true,
//   createdAt: 'account_created',
//   updatedAt: 'account_updated',
//   underscored: true,
//   //model options above this
//   sequelize,
//   modelName: 'User'
// });

// console.log(User === sequelize.models.User); // true

//TODO remove below code after all tests run properly and grading is done

module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("user", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4, // Or Sequelize.UUIDV1
        primaryKey: true
        //readOnly: true
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email_address: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: Sequelize.STRING,
        is: /(?=^.{8,}$)(?=.*\d)(?=.*[!@#$%^&*]+)(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/i,
        validate: {
          len: [8,200]
        }
      }
    },
    {
      timestamps: true,
      createdAt: 'account_created',
      updatedAt: 'account_updated',
      underscored: true,
      //model options above this
      // sequelize,
      // modelName: 'User'
    });
  
    return User;
  };
  