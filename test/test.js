const db = require("../app/models");
const UserModel = db.user;
const dbConfig = require("../app/config/db.config.js");
const {Sequelize} = require("sequelize");
var passwordValidator = require('password-validator');
var schema = new passwordValidator();
const fs = require('fs')
  schema
    .is().min(9) // Minimum length 9
    .is().max(150) // Maximum length 150
    .has().uppercase() // Must have uppercase letters
    .has().lowercase() // Must have lowercase letters
    .has().digits(2) // Must have at least 2 digits
    .has().symbols(1)
    .has().not().spaces() // Should not have spaces
    .is().not().oneOf(['Passw0rd', 'Password123', 'password', '1234567890', 'Password123@']); // Blacklist these values

var assert = require('assert');

describe('Test validations', function () {
  describe('Test Password', function () {
    it('Common passwords not allowed ', function () {
      assert.strictEqual( schema.validate("password"), false);
    });

    it('More than 8 characters', function () {
        assert.strictEqual( schema.validate("Xy1@"), false);
      });

    it('Should have uppercase, lowercase, number and symbol', function () {
        assert.strictEqual( schema.validate("Chintu5&123"), true);
     });  
  });
});

describe('Project structure', function () {
    
      it('Should contain a README', function () {
          let hasReadme = false;
          const path = '../README.md'
        
        assert.strictEqual( fs.existsSync('README.md'), true);
      });
  
      it('Should contain a .gitignore', function () {
     
      
      assert.strictEqual( fs.existsSync('.gitignore'), true);
    });


    it('Should have models, routes and controllers folders', function () {
     let result = false;
    //  console.log(fs.existsSync('app/models'));
        try {
            if(fs.existsSync('app/models') && fs.existsSync('app/routes') && fs.existsSync('app/controllers')){
                result = true;
            }
        } catch (error) {
            console.log(error);
        }
      
        assert.strictEqual( result, true);
      });
    //   it('More than 8 characters', function () {
    //       assert.strictEqual( schema.validate("Xy1@"), false);
    //     });
  
    //   it('Should have uppercase, lowercase, number and symbol', function () {
    //       assert.strictEqual( schema.validate("Chintu5&123"), true);
    //    });  
    
  });
  