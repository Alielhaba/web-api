const cron = require('node-cron');
const { Booking, BookingAssign,User } = require("../models");
const moment = require("moment-timezone")
const { user } = require("../notifications")


module.exports = {

    bookingCompletedTrip: async () => {
        cron.schedule('* * * * *', async function () {
            console.log('******** Process running every minute *********');
            const getBookingAssign = await BookingAssign.find({ trip_status: "COMPLETED" }).lean();
            if (getBookingAssign.length > 0) {
                getBookingAssign.forEach(async (trip, index) => {
                    const currentDate = moment(trip.date_time).tz('Asia/Kolkata').format("YYYY-MM-DD")
                    const getBookingOnboard = await Booking.find({travel_status: "ONBOARDED",routeId: trip.routeId, bus_depature_date: new Date(currentDate)});
                    if(getBookingOnboard){
                        getBookingOnboard.forEach(async (booking, index) => {
                            const updateObj = {
                                travel_status : "COMPLETED"
                            }
                            const updateOne = await Booking.updateOne({_id:booking._id},updateObj);
                            return updateOne;

                        })
                   
                    }

                    const getBookingSchedules = await Booking.find({travel_status: {$in:["SCHEDULED","PENDING"]},routeId: trip.routeId, bus_depature_date: new Date(currentDate)});
                    if(getBookingSchedules.length > 0){
                        getBookingSchedules.forEach(async (booking, index) => {
                            const updateObj = {
                                travel_status : "EXPIRED"
                            }
                            const updateOne = await Booking.updateOne({_id:booking._id},updateObj);
                            if (updateOne.n > 0) {
                                let getUser = await User.findById(booking.userId).select("device_token");
                                if (getUser && getUser.device_token) {
                                    user.UserNotification(
                                        "Trip Expired",
                                        `Your trip is expired.`,
                                        "",
                                        getUser.device_token
                                    ); //title,message,data,token 
                                }
                            }
                            return updateOne;
                        })
                    }

                })

            }
        },{
            timezone: "Asia/Kolkata"
        });
    },
        bookingExpiredTrip: async () => {
        try {
            cron.schedule('0 0 1 * * *', async function () {
                console.log('******** Process running every minute for expired *********');
                let yesterday = moment().tz('Asia/Kolkata').subtract(1, 'days').format('YYYY-MM-DD');
                const currentDate = moment(yesterday).tz('Asia/Kolkata').format("YYYY-MM-DD")
               console.log("currentDate", currentDate)
                const getBooking = await Booking.find({
                    bus_depature_date: {$lte: new Date(currentDate)},
                    travel_status: { $in: ["SCHEDULED", "PROCESSING"] }
                });
              //  console.log("getBooking",getBooking)
                if(getBooking.length > 0){
                    getBooking.forEach(async (booking, index) => {
                        const updateObj = {
                            travel_status: "EXPIRED"
                        }
                        await Booking.updateOne({ _id: booking._id }, updateObj);
                          const updateObj2 = {
                            trip_status: "EXPIRED",
                            date_time: {$lte: new Date(currentDate)}
                        }
                        await BookingAssign.updateOne({ routeId: booking.routeId }, updateObj2);
                    })
                }
            },{
            timezone: "Asia/Kolkata"
        });
        } catch (err) {

            console.log("err while : " + err);
            return err;
        }
    }
}