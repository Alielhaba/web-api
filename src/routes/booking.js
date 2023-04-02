const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { csrfCheck } = require('../middleware/csrfCheck');
const bookingController = require('../controllers/booking');

const router = express.Router();


router.post('/create',authenticate, bookingController.create);

router.post('/cancel',authenticate, bookingController.cancel);

router.post('/payment',authenticate, bookingController.payment);

router.post('/payment-verify',authenticate, bookingController.paymentVerify);



router.post('/payment-pass',authenticate, bookingController.passPayment);

router.post('/pass-payment-verify',authenticate, bookingController.passPaymentVerify);

router.post('/verification-webhooks',bookingController.webHookVerfification);


module.exports = router;