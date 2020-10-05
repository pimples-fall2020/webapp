// module.exports = app => {
    const questionController = require("../controllers/question.controller.js");
  
    var router = require("express").Router();
  
    // Create a new user
    router.post("/", questionController.create);
  
    router.delete("/:question_id", questionController.deleteQuestion);
    // // Retrieve all users
    // router.get("/", users.findAll);
  
    // // Retrieve all published Tutorials
    // router.get("/published", users.findAllPublished);
  
    // // Retrieve a single user 
    // router.get("/self", questionController.findSelf);
    router.put("/:question_id", questionController.updateQuestionPut);
    // // Update a user with id
    // router.put("/:id", users.update);
  
    // // Delete a user with id
    // router.delete("/:id", users.delete);
  
    // // Delete all users
    // router.delete("/", users.deleteAll);
  
    // app.use('/v1/question', router);
//   };
module.exports = router;