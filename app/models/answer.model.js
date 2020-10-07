
module.exports = (sequelize, Sequelize) => {
    const Answer = sequelize.define("answer", {
        answer_id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4, // Or Sequelize.UUIDV1
            primaryKey: true
            //readOnly: true
        },
        answer_text: {
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

return Answer;
}