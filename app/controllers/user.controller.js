const db = require("../models");
// const User = require("../models/user.model.js");
const User = db.user;
const Op = db.Sequelize.Op;
const bcrypt = require('bcrypt');
const saltRounds = 10;
// console.log(db.Sequelize.models);
// Create and Save a new user
/*{
  "first_name": "Jane",
  "last_name": "Doe",
  "password": "skdjfhskdfjhg",
  "email_address": "jane.doe@example.com"
}*/
exports.create = (req, res) => {

  console.log(req.headers);
  // Validate request
  // if (!req.body.title) {
  //   res.status(400).send({
  //     message: "Content can not be empty!"
  //   });
  //   return;
  // }

  // console.log(db);
  // Create a Tutorial

  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    if (err) {
      return res.status(500).json({
        statusCode: '409',
        message: 'Internal Server Error occurred'
      });
    } else {
      //TODO: validate password as per NIST and insert on success

      const user = {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        password: hash,
        username: req.body.username,
      };

      // Save Tutorial in the database
      User.create(user)
        .then(data => {
          let resp = data.dataValues;
          delete resp.password;
          res.send(resp);
        })
        .catch(err => {
          res.status(500).send({
            message: err.message || "Some error occurred while creating the Tutorial."
          });
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

  getHash(cred.username).then(hash => {
      console.log(hash);
      bcrypt.compare(cred.password, hash)
        .then((result) => {
          // console.log("in then");
          // console.log(result);
          console.log("isValid" + result);
          if (result == true) {
            User.findOne({
                where: {
                  username: cred.username
                },
                attributes: {
                  exclude: ['password']
                }
              })
              .then(data => {
                res.send(data);
              })
              .catch(err => {
                res.status(500).send({
                  message: "error " + err
                });
              });
          } else {
            //wrong password
            res.status(401).send({
              message: "Error: Wrong password"
            });
          }
        })
        .catch(err => {
          res.status(500).send({
            message: "Error occurred:" + err
          });
        });

    })
    .catch(err => {
      res.status(500).send({
        message: "Error:" + err
      });
    });


  // Tutorial.findByPk(id)
  //   .then(data => {
  //     res.send(data);
  //   })
  //   .catch(err => {
  //     res.status(500).send({
  //       message: "Error retrieving Tutorial with id=" + id
  //     });
  //   });
};


// // Update a Tutorial by the id in the request
// exports.update = (req, res) => {
//   const id = req.params.id;

//   Tutorial.update(req.body, {
//     where: { id: id }
//   })
//     .then(num => {
//       if (num == 1) {
//         res.send({
//           message: "Tutorial was updated successfully."
//         });
//       } else {
//         res.send({
//           message: `Cannot update Tutorial with id=${id}. Maybe Tutorial was not found or req.body is empty!`
//         });
//       }
//     })
//     .catch(err => {
//       res.status(500).send({
//         message: "Error updating Tutorial with id=" + id
//       });
//     });
// };


// // Delete a Tutorial with the specified id in the request
// exports.delete = (req, res) => {
//   const id = req.params.id;

//   Tutorial.destroy({
//     where: { id: id }
//   })
//     .then(num => {
//       if (num == 1) {
//         res.send({
//           message: "Tutorial was deleted successfully!"
//         });
//       } else {
//         res.send({
//           message: `Cannot delete Tutorial with id=${id}. Maybe Tutorial was not found!`
//         });
//       }
//     })
//     .catch(err => {
//       res.status(500).send({
//         message: "Could not delete Tutorial with id=" + id
//       });
//     });
// };

// // Delete all Tutorials from the database.
// exports.deleteAll = (req, res) => {
//   Tutorial.destroy({
//     where: {},
//     truncate: false
//   })
//     .then(nums => {
//       res.send({ message: `${nums} Tutorials were deleted successfully!` });
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while removing all tutorials."
//       });
//     });
// };

// // Find all published Tutorials
// exports.findAllPublished = (req, res) => {
//   Tutorial.findAll({ where: { published: true } })
//     .then(data => {
//       res.send(data);
//     })
//     .catch(err => {
//       res.status(500).send({
//         message:
//           err.message || "Some error occurred while retrieving tutorials."
//       });
//     });
// };

async function getHash(email) {
  // let hash = null;
  const data = await User.findAll({
    attributes: ['password'],
    where: {
      username: email
    }
  });
  // console.log(data);
  if (data === undefined || data.length == 0) throw new Error("Wrong Username!");

  const hash = data[0].dataValues.password;

  return hash;

}

function getCredentialsFromAuth(authHeader) {
  const b64auth = (authHeader || '').split(' ')[1] || '';
  const strauth = Buffer.from(b64auth, 'base64').toString();
  const splitIndex = strauth.indexOf(':');
  const login = strauth.substring(0, splitIndex);
  const password = strauth.substring(splitIndex + 1);
  let cred = {
    username: login,
    password: password
  };

  return cred;
}