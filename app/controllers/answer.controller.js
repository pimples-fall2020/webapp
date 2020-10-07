const db = require("../models");
const Question = db.question;
const Answer = db.answer;
const User = db.user;
const auth = require('../utils/auth');
var payloadChecker = require('payload-validator');
var currentUserId;

exports.postAnswer = (req, res) => {
    let qid = req.params.question_id;
    //TODO: Simplify the nested promises below!!!!!!
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
                currentUserId = resultObj.cred.username;
                if (req.body.answer_text == undefined || req.body.answer_text == '') {
                    throw new Error("answer_text field with non-empty value is mandatory in the request!");
                } else {

                    fetchCurrentUser(currentUserId).then((user) => {
                        console.log(user);


                        getQuestionFromId(qid).then((ques) => {
                                if (ques != undefined && ques != null) {
                                    //Question is valid

                                    let createAnswerObj = {
                                        answer_text: req.body.answer_text,
                                        question_id: qid,
                                        user_id: user.id
                                    };

                                    //insertion
                                    Answer.create(createAnswerObj)
                                        .then((data) => {
                                            console.log(data.dataValues);
                                            let createdAnswer = {
                                                message: "Answer Posted",
                                                data: data.dataValues
                                            }
                                            res.status(201).send(createdAnswer);
                                        })
                                        .catch(err => {
                                            console.log(err);
                                            res.status(400).send({
                                                message: err.toString()
                                            });
                                        });
                                }else{
                                    throw new Error("Error: Unable to fetch question, please check the question_id");
                                }
                            })
                            .catch((err) => {
                                res.status(400).send({
                                    message: "Error: Unable to fetch question, please check the question_id"
                                });
                            });



                    }).catch(err => {
                        res.status(400).send({
                            message: "Error: Error while fetching user for associating with answer"
                        });
                    });
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

async function getQuestionFromId(qid) {

    let ques = await Question.findOne({
        where: {
            question_id: qid
        }
    });
    if (ques != undefined && ques != null) {
        return ques.dataValues;
    }

}