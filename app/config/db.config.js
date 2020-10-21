module.exports = {
    HOST: "localhost",
    USER: "root",
    PASSWORD: "",
    DB: "webappdb",
    dialect: "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  };

//   require('dotenv').config();
// module.exports = {
//     HOST: "csye6225-f20.cwrk4sv4eywj.us-east-1.rds.amazonaws.com",
//     USER: "csye6225fall2020",
//     PASSWORD: "Cloud123#",
//     DB: "csye6225",
//     dialect: "mysql",
//     ssl: 'Amazon RDS',
//     pool: {
//       max: 5,
//       min: 0,
//       acquire: 30000,
//       idle: 10000
//     }
//   };
