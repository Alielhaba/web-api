const express = require('express');

const { authenticate } = require('../middleware/authenticate');

const settingController = require('../controllers/settings');

const router = express.Router();


router.get('/', authenticate, settingController.appSettings);

module.exports = router;