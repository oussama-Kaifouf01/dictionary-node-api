'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Insert Users
    await queryInterface.bulkInsert('Users', [
      {
        username: 'admin',
        password: bcrypt.hashSync('adminpassword', 10),
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: 'contributor',
        password: bcrypt.hashSync('contributorpassword', 10),
        role: 'contributor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Fetch the inserted users
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE username IN ('admin', 'contributor');`
    );
    
    const [adminUser, contributorUser] = users[0];

    // Insert Words
    await queryInterface.bulkInsert('Words', [
      {
        headword: 'hello',
        pronunciation: 'həˈloʊ',
        origin: 'early 19th century',
        status: 'pending',
        userId: adminUser.id, // Associate with the admin user
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        headword: 'world',
        pronunciation: 'wɜrld',
        origin: 'Old English',
        status: 'approved',
        userId: contributorUser.id, // Associate with the contributor user
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Fetch the inserted words
    const words = await queryInterface.sequelize.query(
      `SELECT id, headword FROM Words WHERE headword IN ('hello', 'world');`
    );

    const [helloWord, worldWord] = words[0];

    // Insert Meanings
    await queryInterface.bulkInsert('Meanings', [
      {
        partOfSpeech: 'noun',
        wordId: helloWord.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        partOfSpeech: 'noun',
        wordId: worldWord.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Fetch the inserted meanings
    const meanings = await queryInterface.sequelize.query(
      `SELECT id FROM Meanings WHERE wordId IN (${helloWord.id}, ${worldWord.id});`
    );

    const [helloNoun, worldNoun] = meanings[0];

    // Insert Definitions
    await queryInterface.bulkInsert('Definitions', [
      {
        definition: 'A greeting or expression of goodwill.',
        example: 'He said hello to everyone in the room.',
        synonyms: JSON.stringify(['hi', 'greetings']),
        antonyms: JSON.stringify(['goodbye']),
        meaningId: helloNoun.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        definition: 'The earth, together with all of its countries, peoples, and natural features.',
        example: 'He traveled around the world.',
        synonyms: JSON.stringify(['globe', 'earth']),
        antonyms: JSON.stringify(['space']),
        meaningId: worldNoun.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Definitions', null, {});
    await queryInterface.bulkDelete('Meanings', null, {});
    await queryInterface.bulkDelete('Words', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
