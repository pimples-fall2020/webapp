
module.exports = (sequelize, Sequelize) => {
    const File = sequelize.define("file", {
        file_id: {
            type: Sequelize.UUID,
            // defaultValue: Sequelize.UUIDV4, // Or Sequelize.UUIDV1
            primaryKey: true
            //readOnly: true
        },
        file_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        s3_object_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        etag: {
            type: Sequelize.STRING
        },
        server_side_encryption: {
            type: Sequelize.STRING
        },
        location: {
            type: Sequelize.STRING
        }
        // TODO: Create composite keys: questionId + filename , answerId + fileName ==check for conflict policy replace
    }, {
        timestamps: true,
        createdAt: 'created_date',
        // updatedAt: 'updated_timestamp', //TODO: check if you can remove updatedAt timestamp from the table
        underscored: true
        //model options above this only

    });

return File;
}