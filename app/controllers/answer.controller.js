const db = require("../models");
const Question = db.question;
const Answer = db.answer;
const User = db.user;
const File = db.file;
const auth = require('../utils/auth');
var payloadChecker = require('payload-validator');
var currentUserId;
let StatsD = require('node-statsd');
let statsDclient = new StatsD();
let startApiTime, endApiTime, startDbTime, endDbTime;
const statsDutil = require('../utils/statsd.utils');
const logger = require('../config/logger.config');
var AWS = require('aws-sdk');
// Set region
AWS.config.update({
    region: 'us-east-1'
});
const webapp_env = process.env.ENV;
var sns_params = {
    Message: '',
    /* required */
    TopicArn: process.env.SNS_ARN
};
// TODO: Assignment 10: remove www.api in links for SNS payload
exports.postAnswer = (req, res) => {
    startApiTime = Date.now();
    statsDclient.increment('create_answer_counter');
    let qid = req.params.question_id;
    //TODO: Simplify the nested promises below!!!!!!
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                logger.info("Authenticated!");
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

                                    startDbTime = Date.now();
                                    //insertion
                                    Answer.create(createAnswerObj)
                                        .then((data) => {
                                            statsDutil.stopTimer(startDbTime, statsDclient, 'db_create_ans_time');
                                            console.log(data.dataValues);
                                            data.dataValues.attachments = [];
                                            let createdAnswer = {
                                                message: "Answer Posted",
                                                data: data.dataValues
                                            }
                                            logger.info(JSON.stringify(ques));

                                            getEmailFromId(ques.user_id).then((qUser) => {

                                                // -----------------------------------SNS---------------------------------------
                                                let snsMessage = {
                                                    message: 'Answer Created',
                                                    question_id: qid,
                                                    username: qUser.username,
                                                    ans_user: user.username,
                                                    answer_id: createdAnswer.data.answer_id,
                                                    answer_text: createdAnswer.data.answer_text,
                                                    question_link:  webapp_env + '.sanketpimple.me/v1/question/' + qid,
                                                    answer_link: webapp_env + '.sanketpimple.me/v1/question/' + qid + '/answer/' + createdAnswer.data.answer_id
                                                }
                                                sns_params.Message = JSON.stringify(snsMessage);
                                                // Create promise and SNS service object
                                                var publishTextPromise = new AWS.SNS({
                                                    apiVersion: '2010-03-31'
                                                }).publish(sns_params).promise();

                                                publishTextPromise.then(
                                                    function (data) {
                                                        logger.info("Answer posted!");
                                                        statsDutil.stopTimer(startApiTime, statsDclient, 'create_ans_api_time');
                                                        res.status(201).send(createdAnswer);
                                                        logger.info(`Message ${JSON.stringify(sns_params.Message)} sent to the topic ${sns_params.TopicArn}`);
                                                        logger.info("MessageID is " + data.MessageId);
                                                    }).catch(
                                                    function (err) {
                                                        logger.error(err.toString());
                                                    });
                                            }).catch((err) => {
                                                throw err;
                                            });

                                        })
                                        .catch(err => {
                                            logger.error(err.toString());
                                            statsDutil.stopTimer(startApiTime, statsDclient, 'create_ans_api_time');
                                            statsDutil.stopTimer(startDbTime, statsDclient, 'db_create_ans_time');
                                            console.log(err);
                                            res.status(400).send({
                                                message: err.toString()
                                            });
                                        });
                                } else {
                                    throw new Error("Error: Unable to fetch question, please check the question_id");
                                }
                            })
                            .catch((err) => {
                                logger.error(err.toString());
                                statsDutil.stopTimer(startApiTime, statsDclient, 'create_ans_api_time');
                                res.status(404).send({
                                    message: "Error: Unable to fetch question, please check the question_id"
                                });
                            });



                    }).catch(err => {
                        logger.error(err.toString());
                        statsDutil.stopTimer(startApiTime, statsDclient, 'create_ans_api_time');
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
            logger.error(err.toString());
            statsDutil.stopTimer(startApiTime, statsDclient, 'create_ans_api_time');
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


//----------------update the answer--------------------------------
//TODO: Simplify the nested promises below!!!!!!
exports.updateAnswer = (req, res) => {
    startApiTime = Date.now();
    statsDclient.increment('update_answer_counter');
    let qid = req.params.question_id;
    let ansId = req.params.answer_id;

    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");

                logger.info("Authenticated");
                currentUserId = resultObj.cred.username;
                if (req.body.answer_text == undefined || req.body.answer_text == '') {
                    throw new Error("answer_text field with non-empty value is mandatory in the request!");
                } else {

                    fetchCurrentUser(currentUserId).then((user) => {
                        // console.log(user);
                        startDbTime = Date.now();
                        Answer.findByPk(ansId).then((ans) => {
                            statsDutil.stopTimer(startDbTime, statsDclient, 'db_ans_findByPk_time');
                            if (ans == undefined || ans == null) {
                                throw new Error(`Could not update the Answer with id=${ansId}. The answer was not found`);
                            }
                            if (ans.user_id != user.id) {
                                throw new Error("Unauthorized: Only owners of the question are allowed to update!");
                            }

                            getQuestionFromId(qid).then((ques) => {
                                    if (ques != undefined && ques != null) {
                                        //Question is valid

                                        let updateAnswerObj = {
                                            answer_text: req.body.answer_text,
                                            // question_id: qid,
                                            // user_id: user.id
                                        };

                                        //Update the answer
                                        startAnsUpdateTime = Date.now();
                                        Answer.update(updateAnswerObj, {
                                                where: {
                                                    answer_id: ansId

                                                }
                                            })
                                            .then((num) => {
                                                statsDutil.stopTimer(startAnsUpdateTime, statsDclient, 'db_update_ans_time');
                                                console.log(num);
                                                if (num == 1) {
                                                    //updated successfully
                                                    logger.info("Answer updated successfully!");
                                                    getEmailFromId(ques.user_id).then((qUser) => {

                                                        // --------------SNS---------------------------------------------------------------------

                                                        let snsMessage = {
                                                            message: 'Answer Updated',
                                                            question_id: qid,
                                                            username: qUser.username,
                                                            ans_user: user.username,
                                                            answer_id: ansId,
                                                            answer_text: updateAnswerObj.answer_text,
                                                            question_link: webapp_env + '.sanketpimple.me/v1/question/' + qid,
                                                            answer_link: webapp_env + '.sanketpimple.me/v1/question/' + qid + '/answer/' + ansId
                                                        }
                                                        sns_params.Message = JSON.stringify(snsMessage);
                                                        // Create promise and SNS service object
                                                        var publishTextPromise = new AWS.SNS({
                                                            apiVersion: '2010-03-31'
                                                        }).publish(sns_params).promise();

                                                        publishTextPromise.then(
                                                            function (data) {
                                                                logger.info("Answer updated");
                                                                logger.info(`Message ${JSON.stringify(sns_params.Message)} sent to the topic ${sns_params.TopicArn}`);
                                                                logger.info("MessageID is " + data.MessageId);

                                                                statsDutil.stopTimer(startApiTime, statsDclient, 'update_ans_api_time');
                                                                res.status(204).send();


                                                            }).catch(
                                                            function (err) {
                                                                logger.error(err.toString());
                                                            });


                                                        // -------------------------------------------------------------------------------------


                                                    }).catch((e) => {
                                                        throw e;
                                                    })


                                                } else {
                                                    //could not delete. maybe question not found
                                                    throw new Error(`Could not update the Answer with id=${ansId}. The answer was not found`);

                                                }
                                            })
                                            .catch(err => {
                                                logger.error(err.toString());
                                                statsDutil.stopTimer(startAnsUpdateTime, statsDclient, 'db_update_ans_time');
                                                statsDutil.stopTimer(startApiTime, statsDclient, 'update_ans_api_time');
                                                console.log(err);
                                                if (err.toString().includes('Unauthorized')) {
                                                    res.status(401).send({
                                                        message: err.toString()
                                                    });
                                                } else if (err.toString().includes('not found')) {
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
                                        throw new Error("Error: Unable to fetch question, please check the question_id");
                                    }
                                })
                                .catch((err) => {
                                    logger.error(err.toString());
                                    statsDutil.stopTimer(startApiTime, statsDclient, 'update_ans_api_time');
                                    res.status(404).send({
                                        message: "Error: Unable to fetch question, please check the question_id. " + err.toString()
                                    });
                                });

                        }).catch(err => {
                            logger.error(err.toString());
                            statsDutil.stopTimer(startDbTime, statsDclient, 'db_update_ans_time');
                            statsDutil.stopTimer(startApiTime, statsDclient, 'update_ans_api_time');
                            console.log(err);
                            if (err.toString().includes('Unauthorized')) {
                                res.status(401).send({
                                    message: err.toString()
                                });
                            }
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



                    }).catch(err => {
                        logger.error(err.toString());
                        statsDutil.stopTimer(startApiTime, statsDclient, 'update_ans_api_time');
                        if (err.toString().includes('Unauthorized')) {
                            res.status(401).send({
                                message: err.toString()
                            });
                        } else {
                            res.status(400).send({
                                message: "Error: Error while fetching user for associating with question"
                            });
                        }
                    });
                }


            } else {
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .catch((err) => {
            logger.error(err.toString());
            statsDutil.stopTimer(startApiTime, statsDclient, 'update_ans_api_time');
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

//--------------------------------DELETE AN ANSWER-------------------------------------------------

exports.deleteAnswer = (req, res) => {
    logger.warn("Deleting Answer!");
    startApiTime = Date.now();
    statsDclient.increment('delete_answer_counter');
    let qid = req.params.question_id;
    let ansId = req.params.answer_id;

    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
                logger.info("UserAuthenticated!");

                currentUserId = resultObj.cred.username;

                fetchCurrentUser(currentUserId).then((user) => {
                    console.log(user);
                    startDbTime = Date.now();
                    Answer.findByPk(ansId).then((ans) => {
                        statsDutil.stopTimer(startDbTime, statsDclient, 'db_findByPk_del_ans_time');
                        if (ans == undefined || ans == null) {
                            throw new Error(`Could not update the Answer with id=${ansId}. The answer was not found`);
                        }
                        if (ans.user_id != user.id) {
                            throw new Error("Unauthorized: Only owners of the question are allowed to update!");
                        }

                        getQuestionFromId(qid).then((ques) => {
                                if (ques != undefined && ques != null) {
                                    //Question is valid


                                    let startDelTime = Date.now();
                                    //delete the answer
                                    Answer.destroy({
                                            where: {
                                                answer_id: ansId
                                            }
                                        })
                                        .then((num) => {
                                            statsDutil.stopTimer(startDelTime, statsDclient, 'db_destroy_ans_time');
                                            console.log(num);
                                            if (num == 1) {
                                                getEmailFromId(ques.user_id).then((qUser) => {
                                                    // --------------SNS---------------------------------------------------------------------

                                                    let snsMessage = {
                                                        message: 'Answer Deleted',
                                                        question_id: qid,
                                                        username: qUser.username,
                                                        ans_user: user.username,
                                                        answer_id: ansId,
                                                        answer_text: ans.answer_text,
                                                        question_link: webapp_env + '.sanketpimple.me/v1/question/' + qid,
                                                        answer_link: webapp_env + '.sanketpimple.me/v1/question/' + qid + '/answer/' + ansId
                                                    }
                                                    sns_params.Message = JSON.stringify(snsMessage);
                                                    // Create promise and SNS service object
                                                    var publishTextPromise = new AWS.SNS({
                                                        apiVersion: '2010-03-31'
                                                    }).publish(sns_params).promise();

                                                    publishTextPromise.then(
                                                        function (data) {
                                                            logger.info(`Message ${JSON.stringify(sns_params.Message)} sent to the topic ${sns_params.TopicArn}`);
                                                            logger.info("MessageID is " + data.MessageId);

                                                            //deleted successfully
                                                            logger.info("Answer Deleted successfully");
                                                            statsDutil.stopTimer(startApiTime, statsDclient, 'del_ans_api_time');
                                                            res.status(204).send();

                                                        }).catch(
                                                        function (err) {
                                                            logger.error(err.toString());
                                                        });


                                                    // -------------------------------------------------------------------------------------

                                                }).catch((e) => {
                                                    throw e;
                                                });

                                            } else {
                                                //could not delete. maybe question not found
                                                throw new Error(`Could not delete the Answer with id=${ansId}. The answer was not found`);
                                            }
                                        })
                                        .catch(err => {
                                            logger.error(err.toString());
                                            statsDutil.stopTimer(startDelTime, statsDclient, 'db_destroy_ans_time');
                                            statsDutil.stopTimer(startApiTime, statsDclient, 'del_ans_api_time');
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
                                    throw new Error("Error: Unable to fetch question, please check the question_id");
                                }
                            })
                            .catch((err) => {
                                logger.error("Unable to fetch question: " + err.toString());
                                statsDutil.stopTimer(startApiTime, statsDclient, 'del_ans_api_time');
                                res.status(404).send({
                                    message: "Error: Unable to fetch question, please check the question_id. " + err.toString()
                                });
                            });

                    }).catch(err => {
                        logger.error(err.toString());
                        statsDutil.stopTimer(startDbTime, statsDclient, 'db_findByPk_del_ans_time');
                        statsDutil.stopTimer(startApiTime, statsDclient, 'del_ans_api_time');
                        console.log(err);
                        if (err.toString().includes('Unauthorized')) {
                            res.status(401).send({
                                message: err.toString()
                            });
                        }
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

                }).catch(err => {
                    logger.error(err.toString());
                    statsDutil.stopTimer(startApiTime, statsDclient, 'del_ans_api_time');
                    res.status(400).send({
                        message: "Error: Error while fetching user for associating with answer. " + err.toString()
                    });
                });



            } else {
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .catch((err) => {
            logger.error(err.toString());
            statsDutil.stopTimer(startApiTime, statsDclient, 'del_ans_api_time');
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


// --------------------GET ANSWER FROM ID -----------------------------
exports.getAnswerFromId = (req, res) => {
    startApiTime = Date.now();
    statsDclient.increment('get_answer_counter');
    //TODO: Error handling for wrong question ids
    let qid = req.params.question_id;
    let ansId = req.params.answer_id;
    startDbTime = Date.now();
    Answer.findOne({
        where: {
            answer_id: ansId
        },
        include: {
            model: File
        }
    }).then(ans => {
        statsDutil.stopTimer(startDbTime, statsDclient, 'db_get_findOne_ans_time');
        if (ans == undefined || ans == null) {
            throw new Error("Answer not found, wrong ID!")
        }
        let ansObj = ans.dataValues;
        console.log(ansObj);
        ans = ansObj;
        let attachments = [];
        // attachments = ans.files;
        ans.files.forEach(file => {
            let obj = {
                file_name: file.file_name,
                s3_object_name: file.s3_object_name,
                file_id: file.file_id,
                created_date: file.created_date
            };
            attachments.push(obj);
        });
        ans.attachments = attachments;
        delete ans.files;
        // res.send(ans.get({
        //     plain: true
        // }));
        logger.info("Answer for Id=" + ansId + " found");
        statsDutil.stopTimer(startApiTime, statsDclient, 'get_ans_api_time');
        res.send(ans);
    }).catch(err => {
        logger.error(err.toString());
        statsDutil.stopTimer(startDbTime, statsDclient, 'db_get_findOne_ans_time');
        statsDutil.stopTimer(startApiTime, statsDclient, 'get_ans_api_time');
        console.log(err);
        res.status(404).send({
            message: "Unable to get the answer from if, please check the id!"
        });
    });

}
async function fetchCurrentUser(userName) {
    // let currUser;
    let start = Date.now();
    let currUser = await User.findOne({
        where: {
            username: userName
        }
    });
    statsDutil.stopTimer(start, statsDclient, 'db_fetchCurrentUser_time');
    if (currUser != undefined && currUser != null) {
        return currUser.dataValues;
    }

}

async function getQuestionFromId(qid) {
    let starttime = Date.now();
    let ques = await Question.findOne({
        where: {
            question_id: qid
        }
    });
    statsDutil.stopTimer(starttime, statsDclient, 'db_getQuestionFromId_time');
    if (ques != undefined && ques != null) {
        return ques.dataValues;
    }

}

async function getEmailFromId(userid) {
    // let starttime = Date.now();
    let user = await User.findOne({
        where: {
            id: userid
        }
    });
    // statsDutil.stopTimer(starttime, statsDclient, 'db_getQuestionFromId_time');
    if (user != undefined && user != null) {
        return user.dataValues;
    }

}