const { User,Booking,BookingAssign } = require('../models');
const { GoogleMap,Invoice } = require("../helpers")
const { Setting } = require("../models")
const moment = require('moment-timezone')


/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
 const getUserById = async (id) => {
    return User.findById(id);
  };
  

  /**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
    const user = await getUserById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
   // if (updateBody.phone && (await User.isPhoneTaken(updateBody.phone, userId))) {
   //   throw new ApiError(httpStatus.BAD_REQUEST, 'Phone already taken');
   // }
    Object.assign(user, updateBody);
    await user.save();
    return user;
  };

  const bookingTrack = async (pnr_no) => {
    try {
      
        if (await Booking.exists({ pnr_no })) {
            const getData = await Booking.findOne({ pnr_no }, "routeId bus_depature_date busId travel_status  pickupId")
                .populate({ path: "pickupId", select: "location" })
                .populate({ path: "busId", select: "model_no reg_no" })
                .lean();
            if (getData) {
                    const bus_depature_date = moment(getData.bus_depature_date).tz('Asia/Kolkata').format("YYYY-MM-DD");
                    const getBookingAssign = await BookingAssign.findOne(
                        {routeId:getData.routeId,
                         trip_status: { $in: ['RIDING', 'STARTED'] },
                          date_time : { $gte : new Date(bus_depature_date)} 
                          });
                    if(getBookingAssign){

                            return {
                               angle: getBookingAssign.angle ? getBookingAssign.angle : '0',
                            //   distance : getDistanceMatrix.distance_text,
                            //   duration : getDistanceMatrix.duration_text,
                               bus_model_no : getData.busId.model_no,
                               bus_reg_no : getData.busId.reg_no,
                               pickup_lat:getData.pickupId.location.coordinates[1].toString(),
                               pickup_lng:getData.pickupId.location.coordinates[0].toString(),
                               bus_lat:getBookingAssign.location.coordinates[1].toString(),
                               bus_lng:getBookingAssign.location.coordinates[0].toString()
                            }
                    }else{
                        return {
                            angle:'0',
                            bus_model_no:'', 
                            bus_reg_no:'',
                            pickup_lat:0.00,
                            pickup_lng:0.00,
                            bus_lat:0.00,
                            bus_lng:0.00

                        }

                    }
            }
        }
    } catch (err) {
        console.log(err)
        return 'err while :' + err;
    }

}


const invoiceGenerate = async (pnr_no,res) => {
    try {
        const generalSetting = await Setting.getgeneral();
        const company = generalSetting.general;
        const getData = await Booking.findOne({ pnr_no })
            .populate({ path: "userId", select: "firstname lastname email phone places" })
            .populate({ path: "routeId", select: "title" })
            .populate({ path: "pickupId", select: "title" })
            .populate({ path: "dropoffId", select: "title" })
            .populate({ path: "payments", select: "method" }).lean();


        if (getData) {
            const userDetails = {
                company: company,
                customer: {
                    fullname: getData.userId.firstname + ' ' + getData.userId.lastname,
                    phone: getData.userId.phone,
                    email: getData.userId.email,
                    address: getData.userId.places.home.address
                },
                route_name: getData.routeId.title,
                pickup_name: getData.pickupId.title,
                dropoff_name: getData.dropoffId.title,
                start_time: getData.start_time,
                start_date: getData.start_date,
                method: getData.payments.method,
                pnr_no: getData.pnr_no,
                booking_date: moment(getData.booking_date).tz('Asia/Kolkata').format('LLL'),
                discount: getData.discount,
                sub_total: getData.sub_total,
                tax_amount: getData.tax_amount,
                tax: getData.tax,
                final_total_fare: getData.final_total_fare,
                created_date: moment(getData.createdAt).tz('Asia/Kolkata').format('LLL')
            }
            return await Invoice.generatePDF(userDetails, 'invoice',res);
        }
        return false;

    } catch (err) {
        console.log(err)
        return 'err while :' + err;
    }

}

  module.exports = {
    getUserById,
    updateUserById,
    bookingTrack,
    invoiceGenerate

  }