const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { csrfCheck } = require('../middleware/csrfCheck');
const routeController = require('../controllers/routes');

const router = express.Router();



router.post('/route-search', routeController.searchroute); //authenticate

router.post('/timing', routeController.fetchroutetiming);

router.post('/seatprice', routeController.seatprice);

router.get('/explore',routeController.explore);


router.post('/:routeId',routeController.fetchroutes);




module.exports = router;