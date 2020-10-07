module.exports = app => {
    const userController = require("../controllers/user.controller.js");
  
    var router = require("express").Router();
  
    // Create a new user
    router.post("/", userController.create);
  
    // // Retrieve a single user 
    router.get("/self", userController.findSelf);
    router.put("/self", userController.updateUserPut);

  
    app.use('/v1/user', router);
  };
  