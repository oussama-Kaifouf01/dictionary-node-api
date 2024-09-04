const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Definition = sequelize.define('Definition', {
    definition: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    example: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    synonyms: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    antonyms: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    meaningId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Meanings',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
}, {
    timestamps: true,
});

module.exports = Definition;
