const { bucket } = require('../config/storage');
const { Op } = require('sequelize');

const Word = require('../models/Word');
const WordStatistics = require('../models/WordStatistics');
const LikeDislikeLog = require('../models/LikeDislikeLog');
const Meaning = require('../models/Meaning'); // Import the Meaning model
const Definition = require('../models/Definition'); // Import the Definition model
const User = require('../models/User'); // Import the User model

const MAX_ACTIONS_PER_IP = 1; // Max likes/dislikes allowed per word per IP within the timeframe
const TIMEFRAME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const getIpAddress = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};


exports.getAllWords = async (req, res) => {
    try {
        const ipAddress = getIpAddress(req); // Get the user's IP address

        // Fetch all words with their associated statistics, meanings, and definitions
        const words = await Word.findAll({
            attributes: { exclude: ['status'] }, // Exclude the status field
            include: [
                { model: WordStatistics, as: 'statistics' },
                {
                    model: Meaning, as: 'meanings',
                    include: [{ model: Definition, as: 'definitions' }]
                },
                {
                    model: User, as: 'user',
                    attributes: ['username']
                }
            ]
        });

        // For each word, check if the user has liked or disliked it
        for (const word of words) {
            const likeLog = await LikeDislikeLog.findOne({
                where: {
                    wordId: word.id,
                    ipAddress,
                    action: 'like'
                }
            });

            const dislikeLog = await LikeDislikeLog.findOne({
                where: {
                    wordId: word.id,
                    ipAddress,
                    action: 'dislike'
                }
            });

            word.setDataValue('liked', !!likeLog); // Add 'liked' field to the word
            word.setDataValue('disliked', !!dislikeLog); // Add 'disliked' field to the word
        }

        res.json(words);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to fetch words' });
    }
};


exports.getWordById = async (req, res) => {
    try {
        // Include Meanings, Definitions, and WordStatistics
        const word = await Word.findByPk(req.params.id, {
            include: [
                { model: WordStatistics },
                {
                    model: Meaning, as: 'meanings',
                    include: [
                        { model: Definition, as: 'definitions' } // Include Definitions
                    ]
                }
            ]
        });
        if (word) {
            res.json(word);
        } else {
            res.status(404).json({ error: 'Word not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch word' });
    }
};

// Initialize Google Cloud Storage

async function uploadFileToGCS(base64File, originalName) {
    const destination = `${Date.now()}-${originalName}`; // Unique filename
    const blob = bucket.file(destination);
    const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: 'audio/mpeg',
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Decode the base64 string to a buffer
    const buffer = Buffer.from(base64File, 'base64');

    return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => reject(err));

        blobStream.on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
            resolve(publicUrl);
        });

        blobStream.end(buffer);
    });
}

exports.likeWord = async (req, res) => {
    try {
        const { wordId } = req.params;
        const ipAddress = getIpAddress(req);

        // Check if the user has already liked the word
        const existingLikeLog = await LikeDislikeLog.findOne({
            where: {
                wordId,
                ipAddress,
                action: 'like',
            }
        });

        if (existingLikeLog) {
            // If already liked, remove the like
            await existingLikeLog.destroy();
            const wordStatistics = await WordStatistics.findOne({ where: { wordId } });
            wordStatistics.likes -= 1;
            await wordStatistics.save();

            return res.status(200).json({ message: 'Like removed successfully', likes: wordStatistics.likes });
        }

        // If the word was previously disliked, remove the dislike
        const existingDislikeLog = await LikeDislikeLog.findOne({
            where: {
                wordId,
                ipAddress,
                action: 'dislike',
            }
        });

        if (existingDislikeLog) {
            await existingDislikeLog.destroy();
            const wordStatistics = await WordStatistics.findOne({ where: { wordId } });
            wordStatistics.dislikes -= 1;
            await wordStatistics.save();
        }

        // Log the like action
        await LikeDislikeLog.create({ wordId, ipAddress, action: 'like' });

        // Increment the likes count
        const wordStatistics = await WordStatistics.findOne({ where: { wordId } });
        wordStatistics.likes += 1;
        await wordStatistics.save();

        res.status(200).json({ message: 'Word liked successfully', likes: wordStatistics.likes });
    } catch (error) {
        console.error('Error liking word:', error);
        res.status(500).json({ error: 'Failed to like the word' });
    }
};

exports.dislikeWord = async (req, res) => {
    try {
        const { wordId } = req.params;
        const ipAddress = getIpAddress(req);

        // Check if the user has already disliked the word
        const existingDislikeLog = await LikeDislikeLog.findOne({
            where: {
                wordId,
                ipAddress,
                action: 'dislike',
            }
        });

        if (existingDislikeLog) {
            // If already disliked, remove the dislike
            await existingDislikeLog.destroy();
            const wordStatistics = await WordStatistics.findOne({ where: { wordId } });
            wordStatistics.dislikes -= 1;
            await wordStatistics.save();

            return res.status(200).json({ message: 'Dislike removed successfully', dislikes: wordStatistics.dislikes });
        }

        // If the word was previously liked, remove the like
        const existingLikeLog = await LikeDislikeLog.findOne({
            where: {
                wordId,
                ipAddress,
                action: 'like',
            }
        });

        if (existingLikeLog) {
            await existingLikeLog.destroy();
            const wordStatistics = await WordStatistics.findOne({ where: { wordId } });
            wordStatistics.likes -= 1;
            await wordStatistics.save();
        }

        // Log the dislike action
        await LikeDislikeLog.create({ wordId, ipAddress, action: 'dislike' });

        // Increment the dislikes count
        const wordStatistics = await WordStatistics.findOne({ where: { wordId } });
        wordStatistics.dislikes += 1;
        await wordStatistics.save();

        res.status(200).json({ message: 'Word disliked successfully', dislikes: wordStatistics.dislikes });
    } catch (error) {
        console.error('Error disliking word:', error);
        res.status(500).json({ error: 'Failed to dislike the word' });
    }
};

exports.createWord = async (req, res) => {
    try {

        const { headword,mp3Base64, pronunciation, origin, meanings } = req.body;

        let mp3Url = null;
        try
        {
            // Handle MP3 file upload if provided
            if (mp3Base64) {
                mp3Url = await uploadFileToGCS(mp3Base64,headword+".mp3");
            }
            else
            {
                console.log("No file provided")
            }
            
        }
        catch(error)
        {
            console.log("error: " + error)
        }
        // Create the word entry
        const word = await Word.create({
            headword,
            pronunciation,
            origin,
            userId: req.user.id, // Associate the word with the logged-in user
            status: 'pending', // Set initial status to pending
            mp3Url, // Set the MP3 URL if available
        });

        // Create associated statistics
        await WordStatistics.create({ wordId: word.id });

        // Handle meanings and their associated definitions
        if (meanings && Array.isArray(meanings)) {
            for (const meaning of meanings) {
                const createdMeaning = await Meaning.create({
                    partOfSpeech: meaning.partOfSpeech,
                    wordId: word.id,
                });

                if (meaning.definitions && Array.isArray(meaning.definitions)) {
                    const definitions = meaning.definitions.map(def => ({
                        ...def,
                        meaningId: createdMeaning.id,
                    }));
                    await Definition.bulkCreate(definitions);
                }
            }
        }

        res.status(201).json({ message: 'Word created successfully', word });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create word' });
    }
};

exports.updateWord = async (req, res) => {
    try {
        const word = await Word.findByPk(req.params.id);
        if (word) {
            await word.update(req.body);

            // Update meanings if provided
            if (req.body.meanings) {
                // First, clear existing meanings
                await Meaning.destroy({ where: { wordId: word.id } });

                // Add updated meanings
                const meanings = req.body.meanings.map(meaning => ({
                    ...meaning,
                    wordId: word.id
                }));
                await Meaning.bulkCreate(meanings);
            }

            res.json(word);
        } else {
            res.status(404).json({ error: 'Word not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update word' });
    }
};

exports.deleteWord = async (req, res) => {
    try {
        const word = await Word.findByPk(req.params.id);
        if (word) {
            // Optionally, delete associated meanings and statistics
            await Meaning.destroy({ where: { wordId: word.id } });
            await WordStatistics.destroy({ where: { wordId: word.id } });

            await word.destroy();
            res.status(204).json();
        } else {
            res.status(404).json({ error: 'Word not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete word' });
    }
};
