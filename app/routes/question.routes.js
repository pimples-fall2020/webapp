/**
 * Routes for Questions, Answers and Files
 * 
 */
var multer  = require('multer');
var upload = multer();
// ----------------------QUESTIONS--------------------------------
    
    const questionController = require("../controllers/question.controller.js");
    const answerController = require("../controllers/answer.controller.js");
    const fileController = require("../controllers/file.controller.js");

    var router = require("express").Router();
  
    // Create a new question
    router.post("/", questionController.create);
  
    //delete a question
    router.delete("/:question_id", questionController.deleteQuestion);
    
    //update the question
    router.put("/:question_id", questionController.updateQuestionPut);

    //get all questions, their categories and answers
    router.get("/", questionController.getAllQuestions);
    
    //get question by id
    router.get("/:question_id", questionController.getQuestionById);


    //-----------------ANSWERS-------------------------

    //Answer a question
    router.post("/:question_id/answer", answerController.postAnswer);

    //Update a question's answer
    router.put("/:question_id/answer/:answer_id", answerController.updateAnswer);

    //Delete a question's answer
    router.delete("/:question_id/answer/:answer_id", answerController.deleteAnswer);

    // get an answer
    router.get("/:question_id/answer/:answer_id", answerController.getAnswerFromId);

    // ---------------------------FILES--------------------------------------------

    router.post("/:question_id/file", upload.single('photos'), fileController.attachToQuestion);

    router.post("/:question_id/answer/:answer_id/file", upload.single('photos'), fileController.attachToAnswer);

module.exports = router;