const express = require('express');

const usersRoute = require('./users');
const driversRoute = require('./drivers');
const locationRoute = require('./location');
const settingRoute = require('./setting');
const routeRoute = require('./route');
const busRoute = require('./bus');
const fareRoute = require('./fare');
const bookingRoute = require('./booking');
const offerRoute = require('./offer');
const suggestRoute = require('./suggest');
const router = express.Router();


router.use('/users', usersRoute);
router.use('/drivers', driversRoute);
router.use('/searches', locationRoute);
router.use('/routes', routeRoute);
router.use('/buses', busRoute);
router.use('/fare', fareRoute);
router.use('/booking', bookingRoute);
router.use('/settings', settingRoute);
router.use('/offers', offerRoute);
router.use('/suggest', suggestRoute);
module.exports = router;