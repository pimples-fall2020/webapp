const db = require("../models");
const logger = require('../config/logger.config');
const User = db.user;
const Op = db.Sequelize.Op;

var passwordValidator = require('password-validator');
const commonPasswordList = require('fxa-common-password-list');

const bcrypt = require("bcrypt");
const saltRounds = 10;
var StatsD = require('node-statsd'),
statsDclient = new StatsD();
var startTime, endTime;

//TODO: Fix and review all the error codes and error messages below. handle more cases!!! There are always more cases to handle!


// --------------------------------------Create and Save a new user---------------------------------------------

/**
 * Create and Save a new user
 * @param {JSON} req 
 * {
 *   "first_name": "Jane",
 *    "last_name": "Doe",
 *    "password": "skdjfhskdfjhg",
 *    "email_address": "jane.doe@example.com"
 *  }
 * @param {JSON} res 
 */
exports.create = (req, res) => {

  logger.info("Called create User");
  statsDclient.increment('create_user_counter');

  startTime = Date.now();
  try {
    //validates user fields and password pattern
    validateUserRequestFull(req.body, true);

  } catch (error) {

    return res.status(400).json({
      message: error.toString()
    });
  }

  let pass = req.body.password;
  bcrypt.hash(pass, saltRounds, (err, hash) => { //hash the password
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
          endTime = Date.now();
          let timing =endTime-startTime;
          statsDclient.timing('user_create_time', timing);
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


// ----------------------------------------GET self user data---------------------------------------------------
/**
 * GET self user data
 * @param {JSON} req 
 * @param {JSON} res 
 */
exports.findSelf = (req, res) => {

  //--------check for empty table--------
  isTableNotEmpty(User).then(() => {
    //nothing
  }).catch((err) => {
    res.status(400).send({
      message: err.toString()
    });
  })
  const cred = getCredentialsFromAuth(req.headers.authorization);


  try {
    //-----------check if credentials are empty    
    validateBasicAuth(cred);
  } catch (error) {
    return res.status(400).send({
      message: error.toString()
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
                res.status(400).send({
                  message: err.toString(),
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
          res.status(400).send({
            message: "Error occurred:" + err,
          });
        });
    })
    .catch((err) => {
      res.status(401).send({
        message: err.toString(),
      });
    });
};

//---------------------------------------------------------- Update the user------------------------------------------------

exports.updateUserPut = (req, res) => {

  //--------check for empty table--------
  isTableNotEmpty(User).then(() => {
    //nothing
  }).catch((err) => {
    res.status(400).send({
      message: err.toString()
    });
  })

  const cred = getCredentialsFromAuth(req.headers.authorization);
  try {
    validateBasicAuth(cred);
  } catch (error) {
    return res.status(400).send({
      message: error.toString()
    });
  }
  let updateObject = req.body;

  try {
    //validates user fields and password pattern
    validateUserRequestFull(updateObject, true);

  } catch (error) {

    return res.status(400).json({
      message: error.toString()
    });
  }

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
                        username: userEmail
                      },
                    })
                    .then(() => {
                      res.status(204).send({
                        message: "User Updated successfully"
                      });
                    })
                    .catch((err) => {
                      res.status(400).send({
                        message: err.toString()
                      });
                    });
                }
              });
            } else {
              //update body doesn't contain password field:

              //update the user here
              User.update(updateObject, {
                  where: {
                    username: userEmail
                  },
                })
                .then(() => {
                  res.status(204).send({
                    message: "User Updated successfully"
                  });
                })
                .catch((err) => {
                  res.status(400).send({
                    message: err.toString()
                  });
                });


            }
          } else {
            //wrong password
            return res.status(401).send({
              message: "Error: Wrong password"
            });
          }
        })
        .catch((err) => {
          res.status(400).send({
            message: err.toString()
          });
        });
    })
    .catch((err) => {
      res.status(400).send({
        message: err.toString()
      });
    });
};


exports.getUserById = (req, res) => {
  let user_id = req.params.user_id;

  User.findByPk(user_id).then((user) => {
      if (user == undefined || user == null) {
        throw new Error("User not found, please check the id");
      }
      let foundUser = user.get({
        plain: true
      });
      delete foundUser.password;
      res.send(foundUser);
    })
    .catch(err => {
      if (err.toString().includes("found")) {
        res.status(404).send({
          message: err.toString()
        });
      } else {
        res.status(400).send({
          message: "Error:" + err.toString()
        });
      }
    });
}

async function getHash(email) {
  // let hash = null;
  const data = await User.findAll({
    attributes: ["password"],
    where: {
      username: email,
    },
  });
  // console.log(data);
  if (data === undefined || data.length == 0) {
    console.log(data);
    throw new Error("Wrong Username!");
  }

  const hash = data[0].dataValues.password;

  return hash;
}

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

/**
 * This method is mostly for validating user body while inserting or updating a user entry, since both need all the fields. 
 * This method validates password pattern too! No need to do it separately
 * This method can be changed if all methods are required or not by adding a flag
 * @param {json} user user request body
 * @param {boolean} allFieldsRequired Whether all fields are strictly required. Defaults to false
 */
function validateUserRequestFull(user, allFieldsRequired = false) {

  if (allFieldsRequired == true) {

    //check for empty fields
    if (user.first_name == undefined || user.first_name == '' ||
      user.last_name == undefined || user.last_name == '' ||
      user.password == undefined || user.password == '' ||
      user.username == undefined || user.username == '') {

      throw new Error("Mandatory fields (first name, last name, username, password) cannot be empty!");
    }

  }

  // this try-catch might be nested into caller of this method
  try {
    validatePasswordPattern(user.password);
  } catch (error) {
    throw error;
  }
}


/**
 * Check password pattern 
 * 
 * NOTE: This method does not check the correctness of the password by comparing hash. 
 * @see bcryot.compare()
 * 
 * @param {string} password
 */
function validatePasswordPattern(password) {
  //Validate password
  var schema = new passwordValidator();
  console.log("checking password pattern for " + password + "......");
  schema
    .is().min(9) // Minimum length 9
    .is().max(150) // Maximum length 150
    .has().uppercase() // Must have uppercase letters
    .has().lowercase() // Must have lowercase letters
    .has().digits(2) // Must have at least 2 digits
    .has().symbols(1)
    .has().not().spaces() // Should not have spaces
    .is().not().oneOf(['Passw0rd', 'Password123', 'password', '1234567890', 'Password123@']); // Blacklist these values


  console.log(schema.validate(password));
  if ((schema.validate(password) /*&& !commonPasswordList(pass)*/ ) == false) {
    //password is invalid

    throw new Error("Weak / Invalid password. Please use a strong and uncommon password with length more than 8, containing uppercase, lowercase, two digits, a symbol and no spaces");

  }

}

/**
 * this function currently only checks for empty auth credentials
 *
 * @param {obj} cred
 */
function validateBasicAuth(cred) {

  if ((cred.username == undefined || cred.username == '') ||
    cred.password == undefined || cred.password == '') {

    throw new Error("Auth username, password cannot be empty");

  }
}

/**
 * Check if supplied table is empty
 *
 * @param {*} Model Table/model
 */
async function isTableNotEmpty(Model) {
  const data = await Model.findAll();
  if (data == undefined || data.length == 0) {
    throw new Error("The table is empty!");
  }
}