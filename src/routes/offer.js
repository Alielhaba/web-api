const express = require('express');

const { authenticate } = require('../middleware/authenticate');

const offerController = require('../controllers/offer/offer.controller');

const router = express.Router();


router.get('/', authenticate, offerController.allRouteOffer);

module.exports = router;