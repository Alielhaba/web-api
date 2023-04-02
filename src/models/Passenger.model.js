const mongoose = require('mongoose');
const timezoneHelpers = require('../helpers/timezone');


const PassengerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    fullname: { type: String },
    age: { type: String },
    gender: { type: String },
    seat: { type: String },
    is_deleted:{type: Boolean, default: false},
    status: { type: Boolean, default: true }
}, { timestamps: true });

PassengerSchema.virtual('bookingdetails', {
    ref: 'Booking', // the model to use
    localField: 'bookingId', // find children where 'localField'
    foreignField: '_id', // is equal to foreignField
    justOne: false,
});

PassengerSchema.statics = {
   transformFormatData(data) {
        const selectableItems = [];
        data.forEach((item) => {
            selectableItems.push({
                userId:item.userId,
                bookingId: item.bookingId,
                busId: item.busId,
                fullname: item.fullname,
                age: item.age,
                gender: item.gender,
                seat: item.seat
            });
        });
        return selectableItems;
    },
    passengerFormatData(bookingId,busId,userId,data) {
        const selectableItems = [];
        console.log(data)
        data.forEach((item) => {
            selectableItems.push({
                userId:userId,
                bookingId: bookingId,
                busId: busId,
                fullname: item.fullname,
                age: item.age,
                gender: item.gender,
                seat: item.seat
            });
        });
        return selectableItems;
    },
}

module.exports = mongoose.model('Passenger', PassengerSchema);