const mongoose = require('mongoose');
const timezoneHelpers = require('../helpers/timezone');
const qr = require('qr-image');
const moment = require("moment-timezone");

const BookingSchema = new mongoose.Schema({
    pnr_no: {
        type: String,
        unique: true
    },
    pickupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
        required: true,
    },
    dropoffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location",
        required: true,
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Route",
        required: true,
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bus",
        required: true
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
        default:
            null
    },
    passId: { type: mongoose.Schema.Types.ObjectId, ref: "Pass", default: null },
    seat_nos: {
        type: [String],
        default:
            [""]
    },
    is_deleted: { type: Boolean, default: false },
    travel_status: {
        type: String,
        enum: [
            "SEARCHING",
            "PENDING",
            "CANCELLED",
            "ACCEPTED",
            "ASSIGNED",
            "STARTED",
            "ARRIVED",
            "ONBOARDED",
            "DROPPED",
            "COMPLETED",
            "SCHEDULED",
            "EXPIRED",
            "PROCESSING"
        ],
        default: "PROCESSING"
    },
    payment_mode: {
        type: String,
        enum: ["WALLET", "UPI", "PAYTM", "CARD","FREE"]
    },
    distance: {
        type: String,
        default:
            ""
    },
    duration: {
        type: String,
        default:
            ""
    },
    has_return: {
        type: Boolean,
        default:
            false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    start_time: {
        type: String,
        default:
            null
    },
    start_date: {
        type: String,
        default:
            null
    },
    drop_date: {
        type: String,
        default:
            null
    },
    drop_time: {
        type: String,
        default:
            null
    },
    return_routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Route"
    },
    passengers: {
        type: String
    },
    discount: {
        type: String,
        default:
            "0"
    },
    sub_total: {
        type: String,
        default:
            ""
    },
    tax_amount: { type: String, default: "" },
    tax: {
        type: String,
        default:
            ""
    },
    fee: {
        type: String,
        default:
            ""
    },
    final_total_fare: {
        type: String,
        default:
            ""
    },
    ip: { type: String, default: "0.0.0.0" },
    booking_date: { type: Date, default: null },
    bus_depature_date: { type: Date, default: null }
}, {
    timestamps: true
});

BookingSchema.virtual("passengerdetails", {
    ref: "Passenger", // the model to use
    localField: "_id", // find children where 'localField'
    foreignField: "bookingId", // is equal to foreignField
    justOne: false,
});

BookingSchema.virtual("routestops", {
    ref: "Route_Stop", // the model to use
    localField: "routeId", // find children where 'localField'
    foreignField: "routeId", // is equal to foreignField
    justOne: true,
});

BookingSchema.virtual("payments", {
    ref: "Payment", // the model to use
    localField: "_id", // find children where 'localField'
    foreignField: "bookingId", // is equal to foreignField
    justOne: true,
});

BookingSchema.virtual("bookingassigns", {
    ref: "BookingAssign", // the model to use
    localField: "routeId", // find children where 'localField'
    foreignField: "routeId", // is equal to foreignField
    justOne: true,
});


BookingSchema.statics = {
    async isOfferApplied(userId,routeId, offerId,offerAttempt) {
        try {
	     let attempt = parseInt(offerAttempt);
            const getBookingAttempt = await this.countDocuments({ routeId,userId,offerId, travel_status: { $in : ["COMPLETED","SCHEDULED","CANCELLED"]} });
          // console.log("getBookingAttempt",getBookingAttempt);
            if (parseInt(getBookingAttempt) < attempt) { // 2 <=5
                return true;
            } else {
                return false;
            }
        } catch (err) {
            console.log("err while : " + err);
            return false;
        }
    },
    async isBookingExists(bookIds, type) {
        try {
            let bIds = []
            if (type === 'multi') {

                bIds = bookIds.filter((el, i) => {
                    return mongoose.Types.ObjectId(el)
                })
                const bookingData = await this.find({ _id: { $in: bIds } }).select("_id").lean();
                return bookingData.map((el, i) => { return el._id })
            } else if (type == "single") {
                return bookIds;
            }
        } catch (err) {
            console.log("err while : " + err);
            return false;
        }
    },
    async totalBooking(routeId, pickupId, booking_date) {
        var total = [];
        const getBooking = await this.find({ travel_status: "SCHEDULED", routeId, pickupId, bus_depature_date: new Date(booking_date) }, "passengers");
        if (getBooking.length > 0) {
            getBooking.forEach((item) => {
                total.push(parseInt(item.passengers));
            });
        }
        return total.reduce((partialSum, a) => partialSum + a, 0);
    },
    async totalPassengers(routeId, booking_date) {
        var total = [];
        const getBooking = await this.find({  travel_status:"SCHEDULED", routeId, bus_depature_date: new Date(booking_date) }, "passengers");
        if (getBooking.length > 0) {
            getBooking.forEach((item) => {
                total.push(parseInt(item.passengers));
            });
        }
        return total.reduce((partialSum, a) => partialSum + a, 0);
    },
    singletransformData(item) {
        return {
            id: item._id,
            travel_status: item.travel_status,
            seat_nos: item.seat_nos,
            has_return: item.has_return ? "1" : "2",
            start_time: item.start_time,
            start_date: item.start_date,
            drop_date: item.drop_date ? item.drop_date : "",
            drop_time: item.drop_time ? item.drop_time : "",
            sub_total: item.sub_total,
            discount: item.discount ? item.discount : "0",
            tax: item.tax,
            fee: item.fee,
            final_total_fare: item.final_total_fare,
            pnr_no: item.pnr_no,
            passengers: item.passengers,
            routeId: item.routeId._id,
            route_name: item.routeId.title,
            pickupId: item.pickupId._id,
            pickup_name: item.pickupId.title,
            dropoffId: item.dropoffId._id,
            drop_name: item.dropoffId.title,
            busId: item.busId._id,
            bus_name: item.busId.name,
            bus_model_no: item.busId.model_no
        }
    },
    transformData(data) {
        const selectableItems = [];
        var png_string = '';
        data.forEach((item) => {

            if (item.travel_status) {
                const qrData = {
                    final_total_fare: item.final_total_fare,
                    pnr_no: item.pnr_no,
                    seat_nos: item.seat_nos,
                    travel_status: item.travel_status,
                    bus_name: item.busId.name,
                    bus_model_no: item.busId.model_no,
                    passengers: item.passengers,
                    has_return: item.has_return ? "NO" : "YES",
                    firstname: item.userId.firstname,
                    lastname: item.userId.lastname,
                    phone: item.userId.phone
                }
                png_string = qr.imageSync(JSON.stringify(qrData), {
                    type: "svg"
                });

            } else {

                png_string = '';
            }

            selectableItems.push({
                id: item._id,
                travel_status: item.travel_status,
                seat_nos: item.seat_nos,
                has_return: item.has_return ? "1" : "2",
                start_time: item.start_time,
                start_date: item.start_date,
                drop_date: item.drop_date ? item.drop_date : "",
                drop_time: item.drop_time ? item.drop_time : "",
                sub_total: item.sub_total,
                discount: item.discount ? item.discount : "0",
                bus_depature_date:item.bus_depature_date,
                tax: item.tax,
                fee: item.fee,
                final_total_fare: item.final_total_fare,
                pnr_no: item.pnr_no,
                passengers: item.passengers,
                routeId: item.routeId._id,
                route_name: item.routeId.title,
                pickupId: item.pickupId._id,
                pickup_name: item.pickupId.title,
                dropoffId: item.dropoffId._id,
                drop_name: item.dropoffId.title,
                busId: item.busId._id,
                bus_name: item.busId.name,
                bus_model_no: item.busId.model_no,
                png_string: png_string.toString('base64')
            });
        });
        return selectableItems;
    },
    async bookingExists(routeId, busId, seat_nos, current_date,end_date) {
        try {

            let currentDate = moment(current_date).tz("Asia/Kolkata").format('YYYY-MM-DD');
            let endDate = moment(end_date).tz("Asia/Kolkata").format('YYYY-MM-DD');
            let trimseat_nos = seat_nos.split(",").map(function (item) { return item.trim() })

            const getBookedSeats = await this.find({
                routeId,
                busId,
                seat_nos: { $in: trimseat_nos },
                 bus_depature_date: (end_date) ? {
                    $gte: new Date(currentDate),
                    $lte:new Date(endDate)
                } : new Date(currentDate),
                travel_status: "SCHEDULED"
            });
            var new_seat_nos = [];
            if (getBookedSeats) {
                for (dseats of getBookedSeats) {
                    if(dseats.seat_nos.length  == 1){
                        new_seat_nos.push(dseats.seat_nos.toString())
                    }else{
                        new_seat_nos.push(...dseats.seat_nos);
                    }
                }
                return new_seat_nos;
            } else {
                return [];
            }
        } catch (err) {
            console.log("err while : " + err);
            return false;
        }
    },
    singletransformDataForDriver(data) {
        const selectableItems = [];
        data.forEach(async (item) => {
            selectableItems.push({
                id: item._id,
                travel_status: item.travel_status,
                pnr_no: item.pnr_no,
                final_total_fare: item.final_total_fare,
                payment_status: item.payments ? item.payments.payment_status : "",
                passengerdetails: item.passengerdetails ? this.transformpassengerdetails(item.travel_status, item.passengerdetails) : [{}],
            });
        });
        return selectableItems;
    },
    transformpassengerdetails(status, data) {
        const selectableItems = [];
        data.forEach((item) => {
            selectableItems.push({
                travel_status: status,
                userId: item.userId._id,
                customer_phone: item.userId.phone,
                fullname: item.fullname,
                age: item.age,
                gender: item.gender,
                seat: item.seat
            });
        });
        return selectableItems;
    },
};
module.exports = mongoose.model('Booking', BookingSchema);
