
module.exports = (sequelize, Sequelize) => {
    const Category = sequelize.define("category", {
        category_id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4, // Or Sequelize.UUIDV1
            primaryKey: true
            //readOnly: true
        },
        category: {
            type: Sequelize.STRING,
            allowNull: false
        }

    }, {
        timestamps: false,
        // createdAt: 'created_timestamp',
        // updatedAt: 'updated_timestamp',
        underscored: true
        //model options above this only

    });

return Category;
}