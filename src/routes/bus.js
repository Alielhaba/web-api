const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { csrfCheck } = require('../middleware/csrfCheck');
const routebusController = require('../controllers/routes/bus');

const router = express.Router();



router.post('/:busId', authenticate,routebusController.searchseats);




module.exports = router;