const mongoose = require('mongoose');
const timezoneHelpers = require('../helpers/timezone');

const HelperSchema = new mongoose.Schema({
     ticket_no: { type:String,index:true},
    firstname: { type: String, default: '',index:true },
    lastname: { type: String, default: '',index:true },
    gender: { type: String, default: '',index:true },
    email: {
        type: String,
        minlength: 1,
        trim: true,
	index:true
    },
    phone: {
        type: Number,
        trim: true
    },
    helpemail: {
        type: String,
        minlength: 1,
        trim: true
    },
    contact: {
        type: Number,
        trim: true
    },
    description: { type: String, default: '' },
    status:{type:String,enum:['Pending','Replied'],default:'Pending'}
}, { timestamps: true });

module.exports = mongoose.model('Helper', HelperSchema);