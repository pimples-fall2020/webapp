const dbConfig = require("../config/db.config.js");

module.exports = (sequelize, Sequelize) => {
    const Question = sequelize.define("question", {
        question_id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4, // Or Sequelize.UUIDV1
            primaryKey: true
            //readOnly: true
        },
        question_text: {
            type: Sequelize.STRING,
            allowNull: false
        }

    }, {
        timestamps: true,
        createdAt: 'created_timestamp',
        updatedAt: 'updated_timestamp',
        underscored: true
        //model options above this only

    });

return Question;
}

//Question and categories have many-to-many relationships defined in index.js