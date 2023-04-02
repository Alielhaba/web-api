const {User,Driver,BookingAssign,Booking,RouteStop,Ticket,DriverNotification } = require('../models');
const { user } = require("../notifications")
const mongoose = require('mongoose');
const em = require("../events/listener");
const moment = require("moment-timezone");

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getDriverById = async(id) => {
    return await Driver.findById(id);
};

const verifyOTPExists = async(_id,otp) => {
    return await Driver.exists({_id,otp});
}

const updateOne = async(_id,device_token) =>{
    return await Driver.updateOne({_id},{device_token});
}



const getTrips = async(driverId) => {
    try{

     const getData = await BookingAssign.findOne({ driverId,trip_status:{$nin:["COMPLETED","EXPIRED"]} })
            .populate({
                path: 'routeId',
                select: "title routeId",
                populate: { path: "routestops", select: "stops" },
                // populate: {
                //     path: "bookings",
                //     populate: { path: "payments" },
                //     populate: { path: "passengerdetails" }
                // }
            })
            .populate({ path: 'assistantId', select: "firstname lastname phone" })
            .populate({
                path: 'timetables',
                populate: {
                    path: "busId", select: "model_no reg_no"
                }
            })
            .sort({ date_time: -1 })
            .lean();

        if(getData){
             return BookingAssign.transformData(getData);  
        }
        return false;
    }catch(err){
        console.log(err);
        return 'error while : '+err;
    }
}


const getBookings = async(routeId,pickupId,booking_date) => {
    try{
		const getBookings = await Booking.find({
                routeId,
                bus_depature_date: new Date(booking_date),
                pickupId,
                travel_status: { $in: ["SCHEDULED", "ONBOARDED"] }
            })
            .populate({ path: "payments", match: { payment_status: "Completed" } })
            .populate({
                path: "passengerdetails",
                populate: { path: "userId", select: "phone firstname lastname" }
            })
            .lean();
        return Booking.singletransformDataForDriver(getBookings);
    }catch(err){
        console.log(err);
        return 'error while : '+err;
    }
}

const updateBookingStatus = async(pnr_no,travel_status) => {
    try{
         const update = await Booking.findOneAndUpdate({ pnr_no: pnr_no }, { travel_status }, { new: true });
        if (update) {
            const userId = update.userId;
            let getUser = await User.findById(userId).select("device_token");
            if (getUser && getUser.device_token) {

                if(travel_status == 'ONBOARDED'){
                     user.UserNotification(
                        "Trip Verified",
                        `Your trip is now verified. enjoy your ferri shuttle trip.`,
                        "",
                        getUser.device_token
                    ); //title,message,data,token 
                }else{
                    user.UserNotification(
                        "Booking status",
                        `You are ${travel_status}. your is trip started.`,
                        "",
                        getUser.device_token
                    ); //title,message,data,token 
                }
            }
            return true;
        } else {
            return false
        }
    }catch(err){
        console.log(err);
        return 'error while : '+err;
    }
}

const getNotifications = async(driverId) => {
    try {
        const getNotifications = await DriverNotification.find({ driverId })
            .select('content read').sort({ _id: -1 }).limit(5)
        return getNotifications;
    } catch (err) {
        console.log(err);
        return 'error while : ' + err;
    }
}

const updateNotifications = async(notifyId, read) => {
    try {
        if (await DriverNotification.exists({ _id: notifyId })) {
            return await DriverNotification.updateOne({ _id: notifyId }, { read });
        }
    } catch (err) {
        console.log(err);
        return 'error while : ' + err;
    }
}

const assignTripStatus = async (assignId, trip_status, lat, lng,angle) => {
    try {
        if (await BookingAssign.isExistAssign(assignId)) {
            let update = {
                trip_status,
		          angle,
                location: {
                    type: "Point",
                    coordinates: [parseFloat(lng), parseFloat(lat)],
                    time_created:moment().tz('Asia/Kolkata').unix(),
                }
            }

            const getData = await BookingAssign.findOneAndUpdate({ _id: assignId }, update, { new: true });
            if (getData) {
                if(getData.trip_status === 'COMPLETED'){
                     getData.stop =   {};
                      return await BookingAssign.transformStatus(getData);
                }else if(getData.trip_status === 'STARTED'){
                      await em.eventsListener.emit('NOTIFY-ALL-BOOKING-CUSTOMER', getData.routeId,getData.date_time);
                       getData.stop =   {};
                      return await BookingAssign.transformStatus(getData);
                }else{
                    const getStop = await RouteStop.aggregate([
                        {
                            $geoNear: {
                                near: {
                                    type: "Point",
                                    coordinates: [parseFloat(lng), parseFloat(lat)],
                                },
                                distanceField: "distance",
                                maxDistance: 2000, // 2000 meter
                                distanceField: "actual_distance",
                                spherical: true,
                                includeLocs: "stops.location",
                            },
                        },
                        {
                            $match : {"routeId" : getData.routeId}
                        },
                        { $limit : 1 },
                        { $sort : { "stops.order" :1} }
                        ])

                    
                    if(getStop.length > 0 ) {
                          getData.stop =  getStop[0].stops
                           return await BookingAssign.transformStatus(getData);
                    }else{
                       getData.stop =   {};
                        return await BookingAssign.transformStatus(getData);
                    } 
                }
            }
        } else {
            return {};
        }
    } catch (err) {
        console.log(err);
        return 'error while : ' + err;
    }
}


module.exports = {
    getDriverById,
    verifyOTPExists,
     updateOne,
    getTrips,
    getBookings,
    updateBookingStatus,
    getNotifications,
    updateNotifications,
    assignTripStatus
}


