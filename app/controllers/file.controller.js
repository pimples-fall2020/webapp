const db = require("../models");
const Question = db.question;
const Answer = db.answer;
const User = db.user;
const File = db.file;
const auth = require('../utils/auth');
var currentUserId;
// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
var fs = require('fs');
var path = require('path');
const {
    v4: uuidv4
} = require('uuid');
let StatsD = require('node-statsd');
let statsDclient = new StatsD();
let startApiTime, endApiTime, startDbTime, endDbTime,startS3time;
const statsDutil = require('../utils/statsd.utils');
const logger = require('../config/logger.config');
//TODO: For file upload handle uploading the duplicate files == check for conflict policy replace
exports.attachToQuestion = (req, res) => {
    logger.info("Attaching file to question");
    startApiTime = Date.now();
    statsDclient.increment('question_file_upload_count');
    let qid = req.params.question_id;
    let creds;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
                logger.info("User authenticated!");
                creds = resultObj.cred;
                return true;
            } else {
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .then((isAuth) => {
            if (isAuth) {
                let currentUserId = creds.username;
                fetchCurrentUser(currentUserId).then((user) => { //TODO: use single query with eager loading instead of multiple, for associations.
                    getQuestionFromId(qid).then((ques) => {
                            if (ques.user_id != user.id) {
                                throw new Error("Unauthorized: Only owners of the question are allowed to attach file!");
                            }
                            // console.log(req.file);
                            // res.send();
                            var file = req.file;

                            let ext = path.extname(file.originalname);
                            if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
                                throw new Error("File type error. Please upload image files");
                            }

                            startS3time = Date.now();
                            let uploadResult = uploadToS3(file, qid);

                            uploadResult.upload_promise
                                .then((uploadData) => {
                                        //Upload done , no error         
                                        if (uploadData) {
                                            console.log("Upload Success", uploadData.Location);
                                            logger.info("Upload success");
                                            statsDutil.stopTimer(startS3time, statsDclient, 's3_file_upload_time');
                                            let createFileObject = {
                                                file_id: uploadResult.file_id,
                                                file_name: file.originalname,
                                                s3_object_name: uploadResult.s3_obj,
                                                etag: uploadData.ETag != undefined ? uploadData.ETag : '',
                                                server_side_encryption: uploadData.ServerSideEncryption != undefined ? uploadData.ServerSideEncryption : '',
                                                location: uploadData.Location != undefined ? uploadData.Location : '',
                                                question_id: qid
                                            };
                                            startDbTime = Date.now();
                                            File.create(createFileObject)
                                                .then((createResult) => {
                                                    statsDutil.stopTimer(startDbTime, statsDclient, 'db_createfile_ques_time');
                                                    console.log("file inserted in db");
                                                    logger.info("File created and added in DB");
                                                    let resJson = {
                                                        file_name: createResult.file_name,
                                                        s3_object_name: createResult.s3_object_name,
                                                        file_id: createResult.file_id,
                                                        created_date: createResult.created_date
                                                    }
                                                    statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ques_api_time');
                                                    res.status(201).send(resJson);
                                                })
                                                .catch(err => {
                                                    logger.error(err.toString());
                                                    statsDutil.stopTimer(startDbTime, statsDclient, 'db_createfile_ques_time');
                                                    statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ques_api_time');
                                                    console.log(err);
                                                    res.status(400).send({
                                                        message: err.toString()
                                                    });
                                                });
                                        }
                                    },
                                    (err) => {
                                        //Error in uploading to S3
                                        throw err;
                                    });

                        })
                        .catch((err) => {
                            statsDutil.stopTimer(startS3time, statsDclient, 's3_file_upload_ques_time');
                            logger.error(err.toString());
                            statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ques_api_time');
                            //TODO: handle 400 and 401 thrown above
                            if (err.toString().includes('Unauthorized')) {
                                res.status(401).send({
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
                    statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ques_api_time');
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
            } else {
                throw new Error("Auth failure, please check your credentials");
            }
        })
        .catch((err) => {
            logger.error(err.toString());
            statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ques_api_time');
            console.log("error---" + err);
            if (err.toString().includes("username") ||
                err.toString().includes("Username") ||
                err.toString().includes("password") ||
                err.toString().includes("Password") ||
                err.toString().includes("credentials") ||

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

// ---------------------------------------------------------------Attach to Answer------------------------------------------------------------------------

exports.attachToAnswer = (req, res) => {
    logger.info("Attaching file to answer");
    startApiTime = Date.now();
    statsDclient.increment('answer_file_upload_count');
    let qid = req.params.question_id;
    let ansId = req.params.answer_id;
    let creds;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
                logger.info("Authenticated!");
                creds = resultObj.cred;
                return true;
            } else {
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .then((isAuth) => {
            if (isAuth) {
                let currentUserId = creds.username;
                fetchCurrentUser(currentUserId).then((user) => {
                    getQuestionFromId(qid).then((ques) => {
                        startDbTime = Date.now();
                            Answer.findByPk(ansId, {
                                include: [{
                                        model: Question
                                    },
                                    {
                                        model: User
                                    }
                                ]
                            }).then((ans) => {
                                statsDutil.stopTimer(startDbTime, statsDclient, 'db_attachfile_ans_findByPk_time');
                                //TODO: Eliminate extra querying for user and questions as answer Eager query is returning all associations. Also check if params qid == answer's question_id
                                // console.log("---check eager loading---");
                                // console.log(ans);
                                if (ans == undefined || ans == null) {
                                    throw new Error("Error obtaining the answer. Please ensure the answer id is correct!");
                                }
                                if (ans.user_id != user.id) {
                                    throw new Error("Unauthorized: Only owners of the question are allowed to attach file!");
                                }
                                // console.log(req.file);
                                // res.send();
                                var file = req.file;

                                let ext = path.extname(file.originalname);
                                if (ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
                                    throw new Error("File type error. Please upload image files");
                                }
                                startS3time = Date.now();
                                let uploadResult = uploadToS3(file, ansId);

                                uploadResult.upload_promise
                                    .then((uploadData) => {
                                            //Upload done , no error         
                                            if (uploadData) {
                                                console.log("Upload Success", uploadData.Location);
                                                logger.info("Upload successful");
                                                statsDutil.stopTimer(startS3time, statsDclient, 's3_file_upload_ans_time');
                                                let createFileObject = {
                                                    file_id: uploadResult.file_id,
                                                    file_name: file.originalname,
                                                    s3_object_name: uploadResult.s3_obj,
                                                    etag: uploadData.ETag != undefined ? uploadData.ETag : '',
                                                    server_side_encryption: uploadData.ServerSideEncryption != undefined ? uploadData.ServerSideEncryption : '',
                                                    location: uploadData.Location != undefined ? uploadData.Location : '',
                                                    answer_id: ansId
                                                };
                                                let startCreateTime=Date.now();
                                                File.create(createFileObject)
                                                    .then((createResult) => {
                                                        logger.info("File added in DB");
                                                        statsDutil.stopTimer(startDbTime, statsDclient, 'db_insertfile_ans_time');
                                                        console.log("file inserted in db");
                                                        let resJson = {
                                                            file_name: createResult.file_name,
                                                            s3_object_name: createResult.s3_object_name,
                                                            file_id: createResult.file_id,
                                                            created_date: createResult.created_date
                                                        }
                                                        statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ans_api_time');
                                                        res.status(201).send(resJson);
                                                    })
                                                    .catch(err => {
                                                        logger.error(err.toString());
                                                        statsDutil.stopTimer(startDbTime, statsDclient, 'db_insertfile_ans_time');
                                                        statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ans_api_time');
                                                        console.log(err);
                                                        res.status(400).send({
                                                            message: err.toString()
                                                        });
                                                    });
                                            }
                                        },
                                        (err) => {
                                            //Error in uploading to S3
                                            throw err;
                                        });
                            }).catch(err => {
                                statsDutil.stopTimer(startS3time, statsDclient, 's3_file_upload_ans_time');
                                // console.log(err);
                                logger.error(err.toString());
                                statsDutil.stopTimer(startDbTime, statsDclient, 'db_attachfile_ans_findByPk_time');
                                statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ans_api_time');
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

                        })
                        .catch((err) => {
                            logger.error(err.toString());
                            statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ans_api_time');
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
                    statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ans_api_time');
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
            } else {
                throw new Error("Auth failure, please check your credentials");
            }
        })
        .catch((err) => {
            logger.error(err.toString());
            statsDutil.stopTimer(startApiTime, statsDclient, 'file_attach_ans_api_time');
            console.log("error---" + err);
            if (err.toString().includes("username") ||
                err.toString().includes("Username") ||
                err.toString().includes("password") ||
                err.toString().includes("Password") ||
                err.toString().includes("credentials") ||

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


//---------------Delete question attachment-------------------------------------------------

exports.deleteQuestionFile = (req, res) => {
    startApiTime = Date.now();
    logger.warn("File is being deleted from S3");
    statsDclient.increment('question_file_delete_count');
    let qid = req.params.question_id;
    let fileId = req.params.file_id;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                logger.info("Authenticated!");
                console.log(resultObj + " Authenticated!");
                startDbTime = Date.now();
                //get file by pk and include question, nested include question's user, compare + check
                File.findByPk(fileId, {
                        include: {
                            model: Question,
                            include: {
                                model: User
                            }
                        }
                    }).then((queryData) => {
                        statsDutil.stopTimer(startDbTime, statsDclient, 'db_findfileByPk_time');
                        // console.log(queryData.dataValues);
                        // console.log(queryData.question.dataValues);
                        // console.log(queryData.question.user.dataValues);
                        if (queryData == undefined || queryData == null) {
                            throw new Error("Unable to retrieve the file. Please check file id and other details");
                        }
                        if (queryData.question == undefined || queryData.question == null) {
                            throw new Error("There is no question associated with this file!");
                        }
                        //check if the user is authorized
                        if (queryData.question.user.dataValues.username == resultObj.cred.username) {
                            console.log("user is authorized to delete!");
                            logger.info("The user is authorized to delete");
                            //check if question id is correct
                            if (queryData.question.question_id == qid) {
                                // console.log("correct question!")
                                //proceed to delete!
                                logger.info("Deleting question attachment");
                                startS3time = Date.now();
                                console.log("deleting" + queryData.s3_object_name);
                                deleteS3Object(queryData.s3_object_name)
                                    .then((deleteData) => {
                                        console.log(deleteData);
                                        console.log("object deleted!");
                                        logger.info("Object deleted!");
                                        statsDutil.stopTimer(startS3time, statsDclient, 's3_file_del_ques_time');
                                        let startdelete = Date.now();
                                        File.destroy({
                                            where: {
                                                file_id: fileId
                                            }
                                        }).then(num => {
                                            // console.log(num);
                                            statsDutil.stopTimer(startDbTime, statsDclient, 'db_filedestroy_ques_time');
                                            if (num == 1) {
                                                //deleted successfully
                                                logger.info("File deleted successfully!");
                                                statsDutil.stopTimer(startApiTime, statsDclient, 'file_del_ques_api_time');
                                                res.status(204).send();
                                            } else {
                                                //could not delete. maybe question not found
                                                throw new Error(`Could not delete the File with id=${fileId}`);
                                            }
                                        });
                                    });
                            } else {
                                throw new Error("This file isn't associated with given question. Please check question id!");
                            }
                        } else {
                            console.log("not allowed to delete!");
                            throw new Error("Unauthorized : This user is not allowed to delete this file!");
                        }


                    })
                    .catch((err) => {
                        if(startS3time!=undefined && startS3time!=null){
                            statsDutil.stopTimer(startS3time, statsDclient, 's3_file_upload_ans_time');
                        }
                        logger.error(err.toString());
                        if(startDbTime!=undefined && startDbTime!=null){
                            statsDutil.stopTimer(startDbTime, statsDclient, 'db_filedestroy_ques_time'); //WARN:this might create inconsistent result (stopping timer without starting)
                            statsDutil.stopTimer(startDbTime, statsDclient, 'db_findfileByPk_time');
                        }
                        if(startApiTime!=undefined && startApiTime!=null){
                            statsDutil.stopTimer(startApiTime, statsDclient, 'file_del_ques_api_time');
                        }
                        console.log("error---" + err);
                        if (err.toString().includes("username") ||
                            err.toString().includes("Username") ||
                            err.toString().includes("password") ||
                            err.toString().includes("Password") ||

                            err.toString().includes("credentials") ||

                            err.toString().includes('Unauthorized') ||
                            err.toString().includes("Auth")) {
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
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .catch((err) => {
            logger.error(err.toString());
            statsDutil.stopTimer(startApiTime, statsDclient, 'file_del_ques_api_time');
            console.log("error---" + err);
            if (err.toString().includes("username") ||
                err.toString().includes("Username") ||
                err.toString().includes("password") ||
                err.toString().includes("Password") ||

                err.toString().includes("credentials") ||

                err.toString().includes('Unauthorized') ||
                err.toString().includes("Auth")) {
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
}


//---------------Delete answer attachment-------------------------------------------------

exports.deleteAnswerFile = (req, res) => {
    startApiTime = Date.now();
    logger.warn("About to delete answer attachment file");
    statsDclient.increment('question_file_delete_count');
    let qid = req.params.question_id;
    let fileId = req.params.file_id;
    let ansId = req.params.answer_id;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                let startdestroy;
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
                logger.info("Authenticated");
                let startFind = Date.now();
                //get file by pk and include question, nested include question's user, compare + check
                File.findByPk(fileId, {
                        include: {
                            model: Answer,
                            include: [{
                                    model: User
                                },
                                {
                                    model: Question
                                }
                            ]
                        }
                    }).then((queryData) => {
                        statsDutil.stopTimer(startFind, statsDclient, 'db_filedestroy_findbyPk_time');
                        // console.log(queryData.dataValues);
                        // console.log(queryData.question.dataValues);
                        // console.log(queryData.question.user.dataValues);
                        if (queryData == undefined || queryData == null) {
                            throw new Error("Unable to retrieve the file. Please check file id and other details");
                        }
                        if (queryData.answer == undefined || queryData.answer == null) {
                            throw new Error("There is no answer associated with this file!");
                        }
                        //check if the user is authorized
                        if (queryData.answer.user.dataValues.username == resultObj.cred.username) {
                            console.log("user is authorized to delete!");
                            //check if question id is correct
                            if (queryData.answer.answer_id == ansId) {
                                if (queryData.answer.question.question_id != qid) {
                                    throw new Error("This question id isn't associated with given answer. Please check question id!");
                                }
                                // console.log("correct question!")
                                //proceed to delete!
                                logger.info("Deleting Answer attachment file from S3..");
                                startS3time = Date.now();
                                console.log("deleting" + queryData.s3_object_name);
                                deleteS3Object(queryData.s3_object_name)
                                    .then((deleteData) => {
                                        console.log("object deleted!");
                                        statsDutil.stopTimer(startS3time, statsDclient, 's3_file_del_ans_time');
                                        console.log(deleteData);
                                        startdestroy = Date.now();
                                        File.destroy({
                                            where: {
                                                file_id: fileId
                                            }
                                        }).then(num => {
                                            statsDutil.stopTimer(startdestroy, statsDclient, 'db_filedestroy_ans_time');
                                            console.log(num);
                                            if (num == 1) {
                                                logger.info("Deleted successfully)");
                                                //deleted successfully
                                                statsDutil.stopTimer(startApiTime, statsDclient, 'file_del_ans_api_time');
                                                res.status(204).send();
                                            } else {
                                                //could not delete. maybe question not found
                                                throw new Error(`Could not delete the File with id=${fileId}`);
                                            }
                                        });
                                    });
                            } else {
                                throw new Error("This file isn't associated with given answer. Please check answer id!");
                            }
                        } else {
                            console.log("not allowed to delete!");
                            throw new Error("Unauthorized : This user is not allowed to delete this file!");
                        }


                    })
                    .catch((err) => {
                        if(startS3time!=undefined && startS3time!=null){
                            statsDutil.stopTimer(startS3time, statsDclient, 's3_file_del_ans_time');
                        }
                        logger.error(err.toString());
                        if(startdestroy && startdestroy!==undefined && startdestroy!=null){
                            statsDutil.stopTimer(startdestroy, statsDclient, 'db_filedestroy_ans_time');
                        }
                        if(startFind!=undefined && startFind!=null){
                            statsDutil.stopTimer(startFind, statsDclient, 'db_filedestroy_findbyPk_time');
                        }
                        if(startApiTime!=undefined && startApiTime!=null){
                            statsDutil.stopTimer(startApiTime, statsDclient, 'file_del_ans_api_time');
                        }
                        console.log("error---" + err);
                        if (err.toString().includes("username") ||
                            err.toString().includes("Username") ||
                            err.toString().includes("password") ||
                            err.toString().includes("Password") ||

                            err.toString().includes("credentials") ||

                            err.toString().includes('Unauthorized') ||
                            err.toString().includes("Auth")) {
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
                // return res.status(400).send({
                throw new Error("Error: Please check the credentials");
                // });
            }
        })
        .catch((err) => {
            logger.error(err.toString());
            statsDutil.stopTimer(startApiTime, statsDclient, 'file_del_ans_api_time');
            console.log("error---" + err);
            if (err.toString().includes("username") ||
                err.toString().includes("Username") ||
                err.toString().includes("password") ||
                err.toString().includes("Password") ||

                err.toString().includes("credentials") ||

                err.toString().includes('Unauthorized') ||
                err.toString().includes("Auth")) {
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
}

//TODO: use env
/**
 *Uploads to S3 bucket and also to MySQL/RDS
 *
 * @param {*} file
 * @param {*} modelId
 */
function uploadToS3(file, modelId) {

    AWS.config.update({

        region: 'us-east-1'
    });

    // Create S3 service object
    s3 = new AWS.S3({
        apiVersion: '2006-03-01'
    });

    // call S3 to retrieve upload file to specified bucket
    var uploadParams = {
        Bucket: process.env.Bucket,
        Key: '',
        Body: ''
    };
    //get the filename
    var file_name = file.originalname;
    let fileId = uuidv4();
    let buckelements = [modelId, fileId, file_name];
    let s3ObjectName = buckelements.join('/');
    // Configure the file stream and obtain the upload parameters

    // var fileStream = fs.createReadStream(file);
    // fileStream.on('error', function (err) {
    //     console.log('File Error', err);
    // });
    uploadParams.Body = file.buffer;

    // uploadParams.Key = path.basename(file_name);
    uploadParams.Key = s3ObjectName;
    // call S3 to retrieve upload file to specified bucket
    let returnObj = {};
    try {
        returnObj = {
            file: file,
            file_id: fileId,
            s3_obj: s3ObjectName,
            upload_promise: s3.upload(uploadParams).promise()
        }
        
    } catch (error) {
        throw error;
    }
    return returnObj;
}

function deleteS3Object(file) {
    AWS.config.update({

        region: 'us-east-1'
    });

    // Create S3 service object
    s3 = new AWS.S3({
        apiVersion: '2006-03-01'
    });

    var params = {
        Bucket: process.env.Bucket,
        Key: file
    };

    return s3.deleteObject(params).promise();
}
async function getQuestionFromId(qid) {
    let startt = Date.now();
    let ques = await Question.findOne({
        where: {
            question_id: qid
        }
    });
    statsDutil.stopTimer(startt, statsDclient, 'db_findOne_ques_time');
    if (ques != undefined && ques != null) {
        return ques.dataValues;
    }

}
async function fetchCurrentUser(userName) {
    // let currUser;
    let startt = Date.now()
    let currUser = await User.findOne({
        where: {
            username: userName
        }
    });
    statsDutil.stopTimer(startt, statsDclient, 'db_findOne_user_time');
    if (currUser != undefined && currUser != null) {
        return currUser.dataValues;
    }

}