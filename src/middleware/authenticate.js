const User = require('../models/User.model');
const Session = require('../models/Session.model');
const { HelperTimeZone } = require('../helpers');

const authenticate = async (req, res, next) => {
  try {
    const token= req.headers.authorization.split(" ")[1];
    if (typeof token !== 'string') {
      throw new Error('Request token is invalid.');
    }
    const currentTime = HelperTimeZone.unixDateTimeFormat(); // show in miliseconds in current time

    const session = await Session.findOne({ token, status: 'valid',expiresIn:{ $gt:currentTime} });
    if (!session) {
      throw new Error('Your token has expired. You need to log in.');
    }
    req.session = session;
    next();
  } catch (err) {
       res.status(403).json({
                title: 'Unauthorized',
                message: 'Authentication credentials expired',
                errorMessage: err.message,
               status:false
        });
  }
};

module.exports = { authenticate };