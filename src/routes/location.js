const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { csrfCheck } = require('../middleware/csrfCheck');
const { initSession, isEmail } = require('../utils/utils');


const router = express.Router();

const locationController = require('../controllers/locations');


router.post('/location',authenticate, locationController.searchlocation);
router.post('/google',authenticate, locationController.findSearchAddress);
router.post('/savelocation',authenticate, locationController.savelocation);


module.exports = router;