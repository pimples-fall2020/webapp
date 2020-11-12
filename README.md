# CSYE 6225 Back-end application in NodeJS using express.js 
## Overview:
💻 This is a project for the course CSYE 6225. It is a NodeJs app with API endpoints as specified below in this document.
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Sequelize
- **Testing**: Mocha
> **Note**: This project uses GitHub Actions workflow and test cases are run on every PR

## Prerequisites for running the project
- Any OS with JavaScript compatibility
- MySQL server version 5.+
- A REST API client like [Postman](https://www.postman.com/)
- [NodeJS](https://nodejs.org/en) installed 

## Instructions to build and run:
- Fork and clone this repository
- Use a terminal to run the commands
- Go to `path/to/webapp`
- Run `npm install`
- After installation completes, run the server using `node server.js` 
OR `npm run start-dev` for development environment
- Run `npm test` to run all the test cases
- Open a REST client for testing the following [API endpoints](https://app.swaggerhub.com/apis-docs/csye6225/fall2020-csye6225/assignment-02):
    1. Creating a new user:
    `POST` call to `localhost:8080/v1/user/`
        - This call does not require authentication
        - Required fields (example request body):
            ```json
            {
                "first_name": "Jane",
                "last_name": "Doe",
                "password": "Cloud@123X",
                "username": "jane.doe@example.com"
            } 
            ```

    2. Making a `GET` call to `localhost:8080/v1/user/self` for getting your own user data:
        - This call uses Basic Authentication
        - Enter your username and password as credentials for basic authentication
        - You will get all the fields of user data except password

    3. Updating user fields using `PUT` request to `localhost:8080/v1/user/self`:
        - This call requires basic auth
        - Sample request body:
            ```json
            {
                "first_name": "Jane",
                "last_name": "Doe",
                "password": "newPass00@",
                "username": "jane.doe@example.com"
            }
            ```
        > - **Note**: Include only the following allowed fields in the request body, any other fields will be rejected and update will fail!

         *(Allowed fields)*
         - `first_name`
         - `last_name`
         - `password`

PS: This project has been setup with AWS for storage, DB and CI/CD
---
## Thank you!
*Sanket Pimple (pimple.s@northeastern.edu)*

*MS Information Systems (2019-2020),*

*Northeastern University, Boston*

