const db = require("../models");
const Question = db.question;
const Category = db.category;
const Answer = db.answer;
const User = db.user;
const File = db.file;
const sequelize = db.sequelize;
const auth = require('../utils/auth');
var payloadChecker = require('payload-validator');
const {
    category
} = require("../models");
var currentUserId;
var currentUser;
//TODO: Check all catch blocks and add response errors there
// ------------Create a question-------------------------------------------
exports.create = (req, res) => {

    const expectedPayload = {
        "question_text": ""
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
                        // console.log(user);
                        let ques = req.body;
                        ques.user_id = user.id;
                        let categories;
                        //Check if it has categories
                        if (ques.categories != undefined && ques.categories != null && ques.categories.length != 0) {
                            categories = ques.categories;
                        }
                        //insertion
                        Question.create(ques)
                            .then((createdQues) => {
                                //Inserted
                                // console.log(data);

                                // insertedQues.getAnswers().then((ans)=>{
                                //     console.log(ans);
                                // }).catch((err)=>{
                                //     console.log(err);
                                // });
                                let insertedQues = createdQues.dataValues;
                                insertedQues.answers = [];                                
                                insertedQues.attachments = [];
                                // Add categories
                                if (categories != undefined & categories != null) {


                                    let catPromises = [];

                                    categories.forEach(cat => {
                                        //Add new categories to the table if they don't exist
                                        //store those category objects in an array


                                        let cPromise = Category.findOrCreate({
                                            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('category')), cat.category.toLowerCase()),
                                            defaults: cat
                                        });
                                        catPromises.push(cPromise);
                                    });

                                    Promise.all(catPromises).then((values) => {
                                        let categoriesValueArr = [];
                                        let categoriesMappingArr = [];
                                        values.forEach(subArray => {
                                            // 0th element is category, 1st element = created flag 
                                            categoriesValueArr.push(subArray[0].dataValues);
                                            categoriesMappingArr.push(subArray[0]);
                                        });

                                        //Add an association between question-categories
                                        createdQues.addCategories(categoriesMappingArr).then((quesCat) => {
                                            // console.log(quesCat);
                                            console.log("--question created--");
                                            console.log(insertedQues);
                                            insertedQues.categories = categoriesValueArr;
                                            res.status(201).send({
                                                message: "Question created",
                                                data: insertedQues
                                            });

                                        }).catch((err) => {
                                            // console.log(err);
                                            if (err.toString().includes('SequelizeUniqueConstraintError')) {
                                                res.status(400).send({
                                                    message: "Error: Please do not add duplicate categories in same question!"
                                                });
                                            } else {
                                                res.status(400).send({
                                                    message: err.toString()
                                                });
                                            }

                                        });
                                    }).catch((err) => {
                                        console.log(err);
                                        res.status(400).send({
                                            message: "Error:" + err.toString()
                                        });
                                    });
                                    // Category.bulkCreate(categories, {
                                    //     validate: true,
                                    //     fields: ['category', 'category_id']
                                    // }).then((catArray) => {
                                    //     // console.log(catArray);
                                    //     let catValuesArray = [];
                                    //     catArray.forEach(cat => {
                                    //         catValuesArray.push(cat.dataValues);
                                    //     });

                                    //     //Add an association between question-categories
                                    //     createdQues.addCategories(catArray).then((quesCat) => {
                                    //         // console.log(quesCat);
                                    //         console.log("--question created--");
                                    //         console.log(insertedQues);
                                    //         insertedQues.categories = catValuesArray;
                                    //         res.status(201).send({
                                    //             message: "Question created",
                                    //             data: insertedQues
                                    //         });

                                    //     }).catch((err) => {
                                    //         console.log(err);
                                    //         res.status(400).send({
                                    //             message: err.toString()
                                    //         });
                                    //     });
                                    // }).catch((err) => {
                                    //     console.log(err);
                                    // });

                                } else {
                                    //Body doesn't have any categories
                                    res.status(201).send({
                                        message: "Question created",
                                        data: insertedQues
                                    });

                                }
                            })
                            .catch(err => {
                                console.log(err);
                                res.status(400).send({
                                    message: err.toString()
                                });
                            });


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

//--------------------------------------delete a question-----------------------------------------------------
//  wrong qid - TypeError: Cannot read property 'countAnswers' of null
// Only the user who posted the question can update or delete the question.
exports.deleteQuestion = (req, res) => {
    let qid = req.params.question_id;

    //perform auth
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated! let's delete this!
                console.log(" Authenticated!");
                console.log(resultObj);

                // Check if the question has answers
                Question.findByPk(qid).then((quesRow) => {
                    if (quesRow == undefined || quesRow == null) {
                        throw new Error("Question not found! Please provide correct question id");
                    }
                    console.log(quesRow.dataValues.user_id);
                    console.log(resultObj.cred.username);

                    quesRow.countAnswers().then(count => {
                        if (count == 0) {
                            //no answers, can delete
                            //get current userid
                            fetchCurrentUser(resultObj.cred.username).then((user) => {
                                    // console.log(user);
                                    if (quesRow.dataValues.user_id != user.id) {
                                        throw new Error("Unauthorized: Only question owner can delete a question!");
                                    }
                                    Question.destroy({
                                            where: {
                                                question_id: qid,
                                                user_id: user.id
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
                                            // console.log(err);
                                            if (err.toString().includes('not found')) {
                                                res.status(404).send({
                                                    message: err.toString()
                                                });
                                            } else if (err.toString().includes('Unauthorized')) {
                                                res.status(401).send({
                                                    message: err.toString()
                                                });
                                            } else {
                                                res.status(400).send({
                                                    message: err.toString()
                                                });
                                            }
                                        });
                                })
                                .catch(err => {
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
                            // has answers
                            throw new Error("This question has answers, deletion prohibited!")
                        }
                    }).catch((err) => {
                        // console.log(err);
                        res.status(400).send({
                            message: err.toString()
                        });
                    });
                }).catch((err) => {
                    // console.log(err);
                    if (err.toString().includes('found')) {
                        res.status(404).send({
                            message: err.toString()
                        });
                    } else if (err.toString().includes('Unauthorized')) {
                        res.status(401).send({
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
// The user who posted question can update or delete question categories.
exports.updateQuestionPut = (req, res) => {
    let qid = req.params.question_id;
    let fetchedQuestion;
    auth.authenticateCredentials(req.headers.authorization)
        .then((resultObj) => {
            if (resultObj.auth != undefined && resultObj.auth == true) {
                //All good, authenticated! let's update
                console.log(resultObj + " Authenticated!");

                Question.findByPk(qid).then((ques) => {
                        if (ques == undefined || ques == null) {
                            throw new Error(`Could not update the question with id=${qid}. The question was not found`);
                        }
                        fetchedQuestion = ques;
                        fetchCurrentUser(resultObj.cred.username).then((user) => {
                            if (fetchedQuestion.user_id != user.id) {
                                throw new Error("Unauthorized: Only owners of the question are allowed to update!");
                            }
                            if (req.body.question_text != undefined && req.body.question_text != null) {
                                let updateObject = {
                                    question_text: req.body.question_text,
                                };
                                if (req.body.categories != undefined && req.body.categories != null) {
                                    // updateObject.categories= req.body.categories;

                                    let catPromises = [];

                                    let givenCategories = req.body.categories;

                                    givenCategories.forEach(cat => {
                                        //Add new categories to the table if they don't exist
                                        //store those category objects in an array


                                        let cPromise = Category.findOrCreate({
                                            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('category')), cat.category.toLowerCase()),
                                            defaults: cat
                                        });
                                        catPromises.push(cPromise);
                                    });
                                    Promise.all(catPromises).then((values) => {
                                        // console.log(values);
                                        let categoriesValueArr = [];
                                        let categoriesMappingArr = [];
                                        values.forEach(subArray => {
                                            // 0th element is category, 1st element = created flag 
                                            categoriesValueArr.push(subArray[0].dataValues);
                                            categoriesMappingArr.push(subArray[0]);
                                        });

                                        console.log(categoriesValueArr);

                                        // update question 
                                        Question.update(updateObject, {
                                            where: {
                                                question_id: qid
                                            }
                                        }).then((num) => {

                                            if (num == 1) {
                                                //updated successfully
                                                // use the category array to add to mapping - foo.setBars([]) + foo.addBars(cats)
                                                // Question.findByPk(qid).then((ques) => {
                                                fetchedQuestion.setCategories(categoriesMappingArr).then((quesCat) => {
                                                    // console.log(quesCat);
                                                    console.log("--mappings created--");
                                                    res.status(204).send();
                                                }).catch((err) => {
                                                    console.log(err);
                                                    res.status(400).send({
                                                        message: err.toString()
                                                    });
                                                });
                                                // }).catch((error) => {
                                                //     console.log(error);
                                                // })


                                            } else {
                                                //could not update. maybe question not found
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

                                    }).catch((err) => {
                                        res.status(400).send({
                                            message: "Error: problem occurred while getting categories, please check request"
                                        });
                                    });
                                } else {
                                    //  if categories not given, update the ques text

                                    // update question 
                                    Question.update(updateObject, {
                                        where: {
                                            question_id: qid
                                        }
                                    }).then((num) => {

                                        if (num == 1) {
                                            //updated successfully
                                            res.status(204).send();

                                        } else {
                                            //could not update. maybe question not found
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

                                }
                                //TODO: Add conditions for mandatory fields and no extra fields -- 400 bad request



                            } else {
                                throw new Error("question_text field is mandatory in the request!")
                            }
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

// Get questions and their data
exports.getAllQuestions = (req, res) => {
    //TODO: Error handling
    Question.findAll({
            include: [{
                    model: Category,
                    through: {
                        attributes: []
                    }
                },
                // Category,         
                {
                    model: Answer,
                    include: {
                        model: File,
                        // as: 'attachments',
                        attributes: [
                            'file_name',
                            's3_object_name',
                            'file_id',
                            'created_date'
                        ]
                    }
                },
                {
                    model: File,
                    // as: 'attachments',
                    attributes: [
                        'file_name',
                        's3_object_name',
                        'file_id',
                        'created_date'
                    ]
                }

            ]
        })
        .then((questions) => {
            // console.log(questions);
            let respJson = [];
            questions.forEach(ques => {
                // console.log(ques.dataValues);
                // ques.categories.forEach(cat=> {
                //     cat = cat.get({ plain: true});
                // });

                // ques.answers.forEach( ans =>{
                //     ans = ans.get({ plain: true });
                // });

                ques = ques.get({
                    plain: true
                });
                ques.attachments = ques.files;
                delete ques.files;
                ques.answers.forEach(ans =>{
                    ans.attachments = ans.files;
                    delete ans.files;
                });
                
                console.log(ques);
                respJson.push(ques);
            });

            res.send(respJson);

        });

}


//Get a question by id
exports.getQuestionById = (req, res) => {
    let qid = req.params.question_id;
    Question.findOne({
            where: {
                question_id: qid
            },
            include: [{
                    model: Category,
                    through: {
                        attributes: []
                    }
                },
                // Category,         
                {
                    model: Answer,
                    include: {
                        model: File,
                        // as: 'attachments',
                        attributes: [
                            'file_name',
                            's3_object_name',
                            'file_id',
                            'created_date'
                        ]
                    }
                },
                {
                    model: File,
                    // as: 'attachments',
                    attributes: [
                        'file_name',
                        's3_object_name',
                        'file_id',
                        'created_date'
                    ]
                }

            ]
        })
        .then((question) => {
            question = question.get({
                plain: true
            });

            question.attachments = question.files;
            delete question.files;
            question.answers.forEach(ans =>{
                ans.attachments = ans.files;
                delete ans.files;
            });
            
            // console.log(ques);
            // respJson.push(ques);

            // console.log(question);

            res.send(question);

        }).catch(err => {
            res.status(404).send({
                message: "Unable to find the question, please check the id"
            });
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
    } else {
        throw new Error("Unable to find user for given id!");
    }

}