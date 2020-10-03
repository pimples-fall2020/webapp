module.exports = app => {
    const userController = require("../controllers/user.controller.js");
  
    var router = require("express").Router();
  
    // Create a new user
    router.post("/", userController.create);
  
    // // Retrieve all users
    // router.get("/", users.findAll);
  
    // // Retrieve all published Tutorials
    // router.get("/published", users.findAllPublished);
  
    // // Retrieve a single user 
    router.get("/self", userController.findSelf);
    router.put("/self", userController.updateUserPut);
    // // Update a user with id
    // router.put("/:id", users.update);
  
    // // Delete a user with id
    // router.delete("/:id", users.delete);
  
    // // Delete all users
    // router.delete("/", users.deleteAll);
  
    app.use('/v1/user', router);
  };
  