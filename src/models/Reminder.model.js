const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const timezoneHelpers = require('../helpers/timezone');
var Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;


const routines = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const reminderSchema = new mongoose.Schema({
    userId: { type: ObjectId, ref: "User", required: true },
    bookingId: { type: ObjectId, ref: "Booking", required: true },
    datetime: { type: Date, required: true },
    every:{ type: [String],enum:routines,index:true},
}, { timestamps: true });

reminderSchema.statics = {

    async create(userId,bookingId,datetime,every){
        const obj = {
            userId,
            bookingId,
            datetime,
            every
        };
        return await new this(obj).save();
    }

}

module.exports = mongoose.model('Reminder', reminderSchema);