const express = require('express');
const authController = require('../controllers/authController');
const wordController = require('../controllers/wordController');

const router = express.Router();


const multer = require('multer');

const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// CRUD routes

router.get('/words/', wordController.getAllWords);
router.get('/words/:id',  wordController.getWordById);



router.post('/words/', authenticateToken, authorizeRole('admin'),upload.single('mp3'), wordController.createWord);
router.put('/words/:id', authenticateToken, authorizeRole('admin'), wordController.updateWord);
router.delete('/words/:id', authenticateToken, authorizeRole('admin'), wordController.deleteWord);
router.post('/likeWord/:wordId', wordController.likeWord);
router.post('/dislikeWord/:wordId', wordController.dislikeWord);

// Protected routes
router.post('/refresh-token', authController.refreshToken); // Refresh token route

// Registration route
router.post('/register/', authController.register);
// Login route
router.post('/login/', authController.login);

module.exports = router;
