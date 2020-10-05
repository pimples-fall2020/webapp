const db = require("../models");
const Question = db.question;
const auth = require('../utils/auth');

exports.create = (req, res) => {

    console.log("Create ques")
    auth.authenticateCredentials(req.headers.authorization)
        .then((result) => {
            if (result == true) {
                //All good, authenticated!
                console.log(result + " Authenticated!")
                res.send("ok");
            } else {
                res.status(400).send({
                    message: "Error: Please check the credentials"
                });
            }
        })
        .catch((err) => {
            console.log("Problem while authenticating" + err);
            res.status(400).send({
                message: err.toString()
            });
        });
}

exports.deleteQuestion = (req, res) => {}

exports.updateQuestionPut = (req, res) => {}