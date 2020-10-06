const db = require("../models");
const Question = db.question;
const User = db.user;
const auth = require('../utils/auth');
var payloadChecker = require('payload-validator');
var currentUserId;
var currentUser;
exports.create = (req, res) => {

    const expectedPayload = {
        "question_text": "What is the meaning of life?"
        // "categories": [
        //   {
        // "category": "java"
        //   }
        // ]
    };
    console.log("Create ques");
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
                currentUserId = resultObj.cred.username;
                //validate req body
                var isBodyValid = payloadChecker.validator(req.body, expectedPayload, ["question_text" /*,"key2"*/ ], true);
                // Look for result.success key which will be true or false depending upon validation.
                // if false look for result.response.errorMessage key to know more about the validator error.

                if (isBodyValid.success == true) {

                    console.log("userid---" + currentUserId);
                    fetchCurrentUser(currentUserId).then((user) => {
                        console.log(user);
                        let ques = req.body;
                        ques.user_id = user.id;
                        //insertion
                        Question.create(ques)
                            .then((data) => {
                                //Inserted
                                console.log(data.dataValues);
                                res.status(201).send(data.dataValues);
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(400).send({
                                    message: err.toString()
                                });
                            })


                    }).catch(err => {
                        res.status(400).send({
                            message: "Error: Error while fetching user for associating with question"
                        });
                    });

                } else {
                    // return res.status(400).send({
                    throw new Error(isBodyValid.response.errorMessage);
                    // });
                }


            } else {
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .catch((err) => {
            console.log("error---" + err);
            if (err.toString().includes("username") ||
                err.toString().includes("Username") ||
                err.toString().includes("password") ||
                err.toString().includes("Password") ||
                err.toString().includes("credentials") ||
                err.toString().includes("user") ||
                err.toString().includes("Auth")) {
                res.status(401).send({
                    message: err.toString()
                });
            } else {
                res.status(400).send({
                    message: err.toString()
                });

            }
        });
}

exports.deleteQuestion = (req, res) => {
    let qid = req.params.question_id;

    //perform auth
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated! let's delete this!
                console.log(resultObj + " Authenticated!");
                Question.destroy({
                        where: {
                            question_id: qid
                        }
                    }).then(num => {
                        console.log(num);
                        if (num == 1) {
                            //success
                            res.status(204).send();
                        } else {
                            //could not delete. maybe question not found
                            throw new Error(`Could not delete the question with id=${qid}. The question was not found`);
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        if (err.toString().includes('not found')) {
                            res.status(404).send({
                                message: err.toString()
                            });
                        } else {
                            res.status(400).send({
                                message: err.toString()
                            });
                        }
                    });

            } else {
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .catch((err) => {
            console.log("error---" + err);
            if (err.toString().includes("username") ||
                err.toString().includes("Username") ||
                err.toString().includes("password") ||
                err.toString().includes("Password") ||
                err.toString().includes("credentials") ||
                err.toString().includes("user") ||
                err.toString().includes("Auth")) {
                res.status(401).send({
                    message: err.toString()
                });
            } else {
                res.status(400).send({
                    message: err.toString()
                });

            }
        });
}
//---------update a question---------------------
exports.updateQuestionPut = (req, res) => {
    let qid = req.params.question_id;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated! let's update
                console.log(resultObj + " Authenticated!");
                if (req.body.question_text != undefined) {
                    let updateObject = {
                        question_text: req.body.question_text
                    }
                    //TODO: Add conditions for mandatory fields and no extra fields -- 400 bad request
                    Question.update(updateObject, {
                        where: {
                            question_id: qid
                        }
                    }).then((num) => {
                        console.log(num);
                        if (num == 1) {
                            //updated successfully
                            res.status(204).send();
                        } else {
                            //could not delete. maybe question not found
                            throw new Error(`Could not update the question with id=${qid}. The question was not found`);
                        }

                    }).catch(err => {
                        console.log(err);
                        if (err.toString().includes('not found')) {
                            res.status(404).send({
                                message: err.toString()
                            });
                        } else {
                            res.status(400).send({
                                message: err.toString()
                            });
                        }
                    });
                } else {
                    throw new Error("question_text field is mandatory in the request!")
                }
            } else {
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .catch((err) => {
            console.log("error---" + err);
            if (err.toString().includes("username") ||
                err.toString().includes("Username") ||
                err.toString().includes("password") ||
                err.toString().includes("Password") ||
                err.toString().includes("credentials") ||
                err.toString().includes("user") ||
                err.toString().includes("Auth")) {
                res.status(401).send({
                    message: err.toString()
                });
            } else {
                res.status(400).send({
                    message: err.toString()
                });

            }
        });
}

async function fetchCurrentUser(userName) {
    // let currUser;
    let currUser = await User.findOne({
        where: {
            username: userName
        }
    });
    if (currUser != undefined && currUser != null) {
        return currUser.dataValues;
    }

}