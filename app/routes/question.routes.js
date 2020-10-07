// module.exports = app => {
    const questionController = require("../controllers/question.controller.js");
    const answerController = require("../controllers/answer.controller.js");

    var router = require("express").Router();
  
    // Create a new question
    router.post("/", questionController.create);
  
    //delete a question
    router.delete("/:question_id", questionController.deleteQuestion);
    
    //update the question
    router.put("/:question_id", questionController.updateQuestionPut);
    
    //-----------------ANSWERS-------------------------

    //Answer a question
    router.post("/:question_id/answer", answerController.postAnswer);

    //Update a question's answer
    router.put("/:question_id/answer/:answer_id", answerController.updateAnswer);

    //Delete a question's answer
    router.delete("/:question_id/answer/:answer_id", answerController.deleteAnswer);

module.exports = router;