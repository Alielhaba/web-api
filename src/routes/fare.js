const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { csrfCheck } = require('../middleware/csrfCheck');
const fareController = require('../controllers/routes/fare');

const router = express.Router();





router.post('/generate-seat-fare', fareController.generateFare);




module.exports = router;