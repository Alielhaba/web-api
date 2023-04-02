const express = require('express');

const { authenticate } = require('../middleware/authenticate');

const suggestController = require('../controllers/suggest/index.controller');

const router = express.Router();

router.post('/create', authenticate, suggestController.save);


module.exports = router;