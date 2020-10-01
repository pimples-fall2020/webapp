const db = require("../models");
const User = db.user;
const Op = db.Sequelize.Op;

var passwordValidator = require('password-validator');
const commonPasswordList = require('fxa-common-password-list');

const bcrypt = require("bcrypt");
const saltRounds = 10;

//TODO: Fix and review all the error codes and error messages below. handle more cases!!! There are always more cases to handle!

// console.log(db.Sequelize.models);
// Create and Save a new user
/*{
  "first_name": "Jane",
  "last_name": "Doe",
  "password": "skdjfhskdfjhg",
  "email_address": "jane.doe@example.com"
}*/
exports.create = (req, res) => {
  // console.log(req.headers);

  //Validate password
  var schema = new passwordValidator();

  schema
    .is().min(9) // Minimum length 9
    .is().max(150) // Maximum length 150
    .has().uppercase() // Must have uppercase letters
    .has().lowercase() // Must have lowercase letters
    .has().digits(2) // Must have at least 2 digits
    .has().symbols(1)
    .has().not().spaces() // Should not have spaces
    .is().not().oneOf(['Passw0rd', 'Password123', 'password', '1234567890']); // Blacklist these values

  //check for empty fields
  if (req.body.first_name == undefined || req.body.first_name == '' ||
    req.body.last_name == undefined || req.body.last_name == '' ||
    req.body.password == undefined || req.body.password == '' ||
    req.body.username == undefined || req.body.username == '') {
    return res.status(400).json({
      message: "Mandatory fields (first name, last name, username, password) cannot be empty!"
    });
  }

  let pass = req.body.password;
  if ((schema.validate(pass) /*&& !commonPasswordList(pass)*/ ) == false) {
    //password is invalid
    return res.status(400).json({
      message: "Error: Weak / Invalid password.\nPlease use a strong and uncommon password with length more than 8, containing uppercase, lowercase, two digits, a symbol and no spaces"
    });

  }

  bcrypt.hash(pass, saltRounds, (err, hash) => {
    if (err) {
      return res.status(400).json({
        message: "Error occurred while password encryption:" + err.message
      });
    } else {

      const user = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        password: hash,
        username: req.body.username,
      };

      // Save Tutorial in the database
      User.create(user)
        .then((data) => {
          let resp = data.dataValues;
          delete resp.password;
          res.status(201).send({
            message: "User Created!",
            data: resp
          });
        })
        .catch((err) => {

          console.log(err.errors[0].message);
          if (err.errors[0].message == 'username must be unique') {
            res.status(400).send({
              message: "Error: The user already exists!",
            });

          } else if (err.message == 'Validation isEmail on username failed' || err.message.includes('isEmail')) {
            res.status(400).send({
              message: "Validation Error: Please enter a valid email ID!"
            });
          } else {
            res.status(400).send({
              message: "Error:" + err.message,
            });
          }
        });
    }
  });
};

// // Retrieve all Tutorials from the database.
// exports.findAll = (req, res) => {
//     const title = req.query.title;
//     var condition = title ? { title: { [Op.like]: `%${title}%` } } : null;

//     Tutorial.findAll({ where: condition })
//       .then(data => {
//         res.send(data);
//       })
//       .catch(err => {
//         res.status(500).send({
//           message:
//             err.message || "Some error occurred while retrieving tutorials."
//         });
//       });
//   };

// Find a single Tutorial with an id
exports.findSelf = (req, res) => {
  const cred = getCredentialsFromAuth(req.headers.authorization);
  if((cred.username==undefined || cred.username=='')
    || cred.password==undefined || cred.password==''){
      return res.status(400).send({
        message: "Error: Auth username, password cannot be empty"
      });
    }
  getHash(cred.username)
    .then((hash) => {
      console.log(hash);
      bcrypt
        .compare(cred.password, hash)
        .then((result) => {
          // console.log("in then");
          // console.log(result);
          console.log("isValid" + result);
          if (result == true) {
            User.findOne({
                where: {
                  username: cred.username,
                },
                attributes: {
                  exclude: ["password"],
                },
              })
              .then((data) => {
                res.send(data);
              })
              .catch((err) => {
                if (err.message == " ")
                  res.status(400).send({
                    message: "error " + err,
                  });
              });
          } else {
            //wrong password
            return res.status(401).send({
              message: "Error: Wrong password",
            });
          }
        })
        .catch((err) => {
          res.status(500).send({
            message: "Error occurred:" + err,
          });
        });
    })
    .catch((err) => {
      res.status(401).send({
        message: err,
      });
    });
};

// Update the user
exports.updateUser = (req, res) => {
  const cred = getCredentialsFromAuth(req.headers.authorization);
  if((cred.username==undefined || cred.username=='')
  || cred.password==undefined || cred.password==''){
    return res.status(400).send({
      message: "Error: Auth username, password cannot be empty"
    });
  }
  let updateObject = req.body;
  let userEmail = "";
  if ("username" in updateObject) {

    if (updateObject.username != cred.username) {
      return res.status(400).send({
        message: "Error: Please specify correct usernames!"
      });
      //unreachable code below
      // throw new Error("Please specify correct usernames!");
    }
    userEmail = updateObject.username;
    delete updateObject.username;
  } else {
    userEmail = cred.username;
  }
  getHash(userEmail)
    .then((hash) => {
      console.log(hash);
      bcrypt
        .compare(cred.password, hash)
        .then((result) => {
          // console.log("in then");
          // console.log(result);
          console.log("isValid" + result);
          if (result == true) {
            let notAllowedFields = [];
            for (const key in updateObject) {
              if (
                key != "first_name" &&
                key != "last_name" &&
                key != "password"
              ) {
                notAllowedFields.push(key);
              }
            }
            if (notAllowedFields.length > 0) {
              // res.status(400).send({
              //   message: "Update Failed: Fields not allowed:  " + notAllowedFields
              // });
              throw new Error("Update Failed: Fields not allowed:  " + notAllowedFields);

            }
            console.log("update object");
            console.log(updateObject);

            if ("password" in updateObject) {
              bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
                if (err) {
                  // return res.status(500).json({
                  //   message: "Hash encryption failed:" + err,
                  // });
                  throw new Error("Hash encryption failed:" + err);
                } else {
                  updateObject.password = hash;
                  //update the user here
                  User.update(updateObject, {
                      where: {
                        username: userEmail,
                      },
                    })
                    .then(() => {
                      res.status(204).send({
                        message: "User Updated successfully",
                      });
                    })
                    .catch((err) => {
                      res.status(400).send({
                        message: "error " + err,
                      });
                    });
                }
              });
            } else {
              //update body doesn't contain password field:

              //update the user here
              User.update(updateObject, {
                  where: {
                    username: userEmail,
                  },
                })
                .then(() => {
                  res.status(204).send({
                    message: "User Updated successfully",
                  });
                })
                .catch((err) => {
                  res.status(400).send({
                    message: "error " + err,
                  });
                });


            }
          } else {
            //wrong password
            return res.status(401).send({
              message: "Error: Wrong password",
            });
          }
        })
        .catch((err) => {
          res.status(400).send({
            message: err,
          });
        });
    })
    .catch((err) => {
      res.status(400).send({
        message: "Error:" + err,
      });
    });
};

async function getHash(email) {
  // let hash = null;
  const data = await User.findAll({
    attributes: ["password"],
    where: {
      username: email,
    },
  });
  // console.log(data);
  if (data === undefined || data.length == 0)
    throw new Error("Wrong Username!");

  const hash = data[0].dataValues.password;

  return hash;
}

//TODO: Add validation for empty username password
function getCredentialsFromAuth(authHeader) {
  const b64auth = (authHeader || "").split(" ")[1] || "";
  const strauth = Buffer.from(b64auth, "base64").toString();
  const splitIndex = strauth.indexOf(":");
  const login = strauth.substring(0, splitIndex);
  const password = strauth.substring(splitIndex + 1);
  let cred = {
    username: login,
    password: password,
  };

  return cred;
}