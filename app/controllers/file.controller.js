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

exports.attachToQuestion = (req, res) => {
    let qid = req.params.question_id;
    let creds;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
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

                            let uploadResult = uploadToS3(file, qid);

                            uploadResult.upload_promise
                                .then((uploadData) => {
                                        //Upload done , no error         
                                        if (uploadData) {
                                            console.log("Upload Success", uploadData.Location);

                                            let createFileObject = {
                                                file_id: uploadResult.file_id,
                                                file_name: file.originalname,
                                                s3_object_name: uploadResult.s3_obj,
                                                etag: uploadData.ETag != undefined ? uploadData.ETag : '',
                                                server_side_encryption: uploadData.ServerSideEncryption != undefined ? uploadData.ServerSideEncryption : '',
                                                location: uploadData.Location != undefined ? uploadData.Location : '',
                                                question_id: qid
                                            };

                                            File.create(createFileObject)
                                                .then((createResult) => {
                                                    console.log("file inserted in db");
                                                    let resJson = {
                                                        file_name: createResult.file_name,
                                                        s3_object_name: createResult.s3_object_name,
                                                        file_id : createResult.file_id,
                                                        created_date : createResult.created_date
                                                    }
                                                    res.status(201).send(resJson);
                                                })
                                                .catch(err => {
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
                            //TODO: handle 400 and 401 thrown above
                            if (err.toString().includes('Unauthorized')) {
                                res.status(401).send({
                                    message: err.toString()
                                });
                            } else {
                            res.status(404).send({
                                message: "Error: Unable to fetch question, please check the question_id"
                            });
                        }
                        });

                }).catch(err => {
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

// ---------------------------------------------------------------Attach to Answer------------------------------------------------------------------------

exports.attachToAnswer = (req, res) => {

    let qid = req.params.question_id;
    let ansId = req.params.answer_id;
    let creds;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated!
                console.log(resultObj + " Authenticated!");
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
                        Answer.findByPk(ansId,{
                            include: [
                                {
                                    model: Question
                                },
                                {
                                    model: User
                                }
                            ]
                        }).then((ans) => {
                            //TODO: Eliminate extra querying for user and questions as answer Eager query is returning all associations. Also check if params qid == answer's question_id
                            // console.log("---check eager loading---");
                            // console.log(ans);
                            if (ans.user_id != user.id) {
                                throw new Error("Unauthorized: Only owners of the question are allowed to attach file!");
                            }
                            // console.log(req.file);
                            // res.send();
                            var file = req.file;

                            let uploadResult = uploadToS3(file, ansId);

                            uploadResult.upload_promise
                                .then((uploadData) => {
                                        //Upload done , no error         
                                        if (uploadData) {
                                            console.log("Upload Success", uploadData.Location);

                                            let createFileObject = {
                                                file_id: uploadResult.file_id,
                                                file_name: file.originalname,
                                                s3_object_name: uploadResult.s3_obj,
                                                etag: uploadData.ETag != undefined ? uploadData.ETag : '',
                                                server_side_encryption: uploadData.ServerSideEncryption != undefined ? uploadData.ServerSideEncryption : '',
                                                location: uploadData.Location != undefined ? uploadData.Location : '',
                                                answer_id : ansId
                                            };

                                            File.create(createFileObject)
                                                .then((createResult) => {
                                                    console.log("file inserted in db");
                                                    let resJson = {
                                                        file_name: createResult.file_name,
                                                        s3_object_name: createResult.s3_object_name,
                                                        file_id : createResult.file_id,
                                                        created_date : createResult.created_date
                                                    }
                                                    res.status(201).send(resJson);
                                                })
                                                .catch(err => {
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
                                    // console.log(err);
                                    if (err.toString().includes('Unauthorized')) {
                                        res.status(401).send({
                                            message: err.toString()
                                        });
                                    }
                                     else if (err.toString().includes('not found')) {
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

//TODO: use env
/**
 *Uploads to S3 bucket and also to MySQL/RDS
 *
 * @param {*} file
 * @param {*} modelId
 */
function uploadToS3(file, modelId) {

    AWS.config.update({
        accessKeyId: 'AKIARBIX7ML74LJOY4ND',
        secretAccessKey: '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',
        region: 'us-east-1'
    });

    // Create S3 service object
    s3 = new AWS.S3({
        apiVersion: '2006-03-01'
    });

    // call S3 to retrieve upload file to specified bucket
    var uploadParams = {
        Bucket: 'webapp.sanket.pimple',
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
    let returnObj = {
        file: file,
        file_id: fileId,
        s3_obj: s3ObjectName,
        upload_promise: s3.upload(uploadParams).promise()
    }
    return returnObj;
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