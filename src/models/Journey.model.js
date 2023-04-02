const mongoose = require('mongoose');
const timezoneHelpers = require('../helpers/timezone');

const JourneySchema = new mongoose.Schema({
    bus: {
        type: String,
        minlength: 1,
        trim: true
    },
    city: {
        type: String,
        minlength: 1,
        trim: true
    },
    date: {
        type: Number,
        minlength: 1,
        trim: true
    },
    time: {
        type: Number,
        minlength: 1,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Journey', JourneySchema);