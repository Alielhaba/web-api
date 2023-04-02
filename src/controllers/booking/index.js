const Utils = require("../../utils/utils");
const routeUtils = require("../../utils/route.utils");
const {
    Setting,
    Location,
    Passenger,
    Booking,
    Wallet,
    Payment,
    User,
    Ticket,
    Offer,
    BookingLog
} = require("../../models");
const _ = require("lodash");
const objectIdToTimestamp = require("objectid-to-timestamp");
const moment = require("moment-timezone");
const {
    nanoid
} = require('nanoid');
const crypto = require("crypto");
const em = require("../../events/listener");
const {
    HelperCustom
} = require('../../helpers')
const {
    user
} = require("../../notifications");
const mongoose = require("mongoose");
const { walletPayment,bookingPayment,bookingPassPayment} = require('../payment'); // function for webhooks




module.exports = {
    cancel: async (req, res) => {
        const session = await mongoose.startSession();
        try {
            const {
                userId,
                walletId
            } = req.session;
            const {
                pnr_no,
                current_date
            } = req.body;
            // Start session
            await session.startTransaction();
            const getBooking = await Booking.findOne({
                pnr_no, travel_status: "SCHEDULED", booking_date: { $gt: current_date }
            }).populate({
                path: "payments"
            })
                .lean();
            if (getBooking) {
                const refundssettings = await Setting.getrefunds();
                if (refundssettings.refunds) {
                    let refundAmount = parseInt(refundssettings.refunds.amount); // refunds amount
                    let finalTotalFare = parseInt(getBooking.final_total_fare); // final total fare
                    let discount = parseInt(getBooking.discount);
                    let finalRefundAmount = 0;
                    if (refundssettings.refunds.type === "percentage") {
                        finalRefundAmount = Math.round(
                            finalTotalFare - ((finalTotalFare * refundAmount) / 100) - discount);
                        const createPayment = {
                            bookingId: getBooking._id,
                            walletId: walletId,
                            userId: userId,
                            orderId: "order_" + nanoid(10),
                            ferriOrderId: "FER_" + nanoid(15),
                            payment_status: "Refunded",
                            method: "wallet",
                            amount: finalRefundAmount,
                            title: "Trip Payment refund.",
                            type: 0,
                        };

                        await Payment.create(createPayment);
                        var wallet = await Wallet.findOne({
                            _id: walletId
                        });
                        var total = 0;
                        total = parseInt(wallet.amount) + parseInt(finalRefundAmount);
                        var updatedWallet = await Wallet.findOneAndUpdate({
                            _id: walletId
                        }, {
                            amount: total
                        });
                        if (updatedWallet) {
                            await Booking.updateOne({
                                _id: getBooking._id
                            }, {
                                travel_status: "CANCELLED"
                            });
                            await Payment.updateOne({
                                _id: getBooking.payments._id
                            }, {
                                payment_status: "Cancelled"
                            });

                            const getUser = await User.findById(userId);
                            if (getUser.device_token){
                               user.UserNotification(
                                "Booking cancelled",
                                "Booking cancelled Successfully",
                                "",
                                getUser.device_token); //title,message,data,token
                             }

                            // finish transcation
                            await session.commitTransaction();
                            session.endSession();
                            res.status(200).json({
                                status: true,
                                data: {
                                    refund_amount: finalRefundAmount,
                                    final_total_fare: finalTotalFare
                                },
                                message: "Booking amount refunded successfully.",
                            });
                        }
                    } else if (refundssettings.refunds.type === "number") {
                        finalRefundAmount = ((finalTotalFare - refundAmount) - discount);
                        const createPayment = {
                            bookingId: getBooking._id,
                            walletId: walletId,
                            userId: userId,
                            orderId: "order_" + nanoid(10),
                            ferriOrderId: "FER_" + nanoid(15),
                            payment_status: "Completed",
                            method: "wallet",
                            amount: finalRefundAmount,
                            title: "Trip Payment refund.",
                            type: 0,
                        };

                        await Payment.create(createPayment);
                        var wallet = await Wallet.findOne({
                            _id: walletId
                        });
                        var total = 0;
                        total = parseInt(wallet.amount) + parseInt(finalRefundAmount);
                        var updatedWallet = await Wallet.findOneAndUpdate({
                            _id: walletId
                        }, {
                            amount: total
                        });
                        if (updatedWallet) {
                            await Booking.updateOne({
                                _id: getBooking._id
                            }, {
                                travel_status: "CANCELLED"
                            });
                            await Payment.updateOne({
                                _id: getBooking.payments._id
                            }, {
                                payment_status: "Cancelled"
                            });


                            const getUser = await User.findById(userId);
                            if (getUser.device_token){
                               user.UserNotification(
                                "Booking cancelled",
                                "Booking cancelled Successfully",
                                "",
                                getUser.device_token); //title,message,data,token
                             }

                            // finish transcation
                            await session.commitTransaction();
                            session.endSession();
                            res.status(200).json({
                                status: true,
                                data: {
                                    refund_amount: finalRefundAmount,
                                    final_total_fare: finalTotalFare
                                },
                                message: "Booking amount refunded successfully.",
                            });
                        }
                    }
                }
            } else {
                res.status(200).json({
                    status: false,
                    message: "PNR No will cancel one day before.",
                });
            }
        } catch (err) {
            console.log(err);
            await session.abortTransaction();
            session.endSession();
            res.status(200).json({
                status: false,
                message: "error while : " + err,
            });
        }
    },
    create: async (req, res) => {
        const session = await mongoose.startSession();
        try {
            const {
                userId,
                walletId
            } = req.session;
            const {
                fareData,
                passengerDetailsItem,
                offer_code
            } = req.body;
            // Start session
          //  console.log("req.body",req.body)
            await session.startTransaction();
            const seats = fareData.seat_no.replace(/\[|\]/g, "").split(","); // convert string to Array
            const passengers = seats.length;
            const walletBalance = await Wallet.findById(walletId);
            var saveObj = {};
            var offer_id = null;
            var attempt = 0;
            var offer_discount_amount = 0;
            if (offer_code.trim() != '') {
                if (await Offer.check(offer_code.trim(), fareData.route_id)) {
                    const getOffer = await Offer.findOne({
                        code: offer_code.trim(),
                        status: true
                    }).lean();

                    if (getOffer) {
                        offer_discount_amount = Math.round(
                            parseFloat(fareData.final_total_fare) * parseInt(getOffer.discount) / 100);
                        offer_id = getOffer._id;
                        attempt = getOffer.attempt;
               
               console.log("2323",await Booking.isOfferApplied(userId, fareData.route_id,offer_id,attempt))
                        if (await Booking.isOfferApplied(userId, fareData.route_id,offer_id,attempt)) {
                            if (await Booking.exists({ pnr_no: fareData.pnr_no })) {

                                await Booking.updateOne({ pnr_no: fareData.pnr_no }, { offerId: offer_id, discount: offer_discount_amount });
                                const getBooking = await Booking.findOne({
                                    pnr_no: fareData.pnr_no,
                                })
                                    .populate({
                                        path: "routeId",
                                        select: "title"
                                    })
                                    .populate({
                                        path: "pickupId",
                                        select: "title"
                                    })
                                    .populate({
                                        path: "dropoffId",
                                        select: "title"
                                    })
                                    .populate({
                                        path: "busId",
                                        select: "name model_no"
                                    })
                                    .lean();

                                const getPassenger = await Passenger.find({
                                    bookingId: getBooking._id,
                                }).lean();

                                res.status(200).json({
                                    status: true,
                                    message: "booking already saved.",
                                    data: {
                                        getbookingData: await Booking.singletransformData(getBooking),
                                        persistedPassenger: await Passenger.transformFormatData(
                                            getPassenger),
                                        walletBalance: walletBalance.amount,
                                    },
                                });



                            } else {
                                res.status(200).json({
                                    status: false,
                                    message: "booking ticket failed.",
                                });
                            }
                        } else {

                            res.status(200).json({
                                status: false,
                                message: "Offer already applied.",
                            });
                        }
                    } else {

                        // const seat_count
                        //const getticket = await Ticket.fetch(fareData.bus_id);
                        // saveObj.ticketId = getticket ? getticket._id : null;

                        saveObj = {
                            pnr_no: fareData.pnr_no,
                            routeId: fareData.route_id,
                            pickupId: fareData.pickup_stop_id,
                            dropoffId: fareData.drop_stop_id,
                            busId: fareData.bus_id,
                            offerId: offer_id ? offer_id : null,
                            userId,
                            seat_nos: seats,
                            distance: fareData.distance,
                            has_return: fareData.has_return === "1" ? false : true,
                            start_time: fareData.pickup_time,
                            start_date: fareData.created_date,
                            drop_time: fareData.drop_time,
                            drop_date: fareData.created_date,
                            passengers,
                            sub_total: fareData.sub_total,
                            final_total_fare: fareData.final_total_fare,
                            discount: offer_discount_amount ? offer_discount_amount.toString() : '0',
                            tax_amount: fareData.tax_amount,
                            tax: fareData.tax,
                            fee: fareData.fee,
                            ip: req.ip,
                            travel_status: "PROCESSING",
                            booking_date: new Date(fareData.created_date + ' ' + fareData.pickup_time),
                            bus_depature_date: new Date(moment(fareData.created_date).tz('Asia/Kolkata').format("YYYY-MM-DD"))
                        };
                        const getbookingData = await new Booking(saveObj).save();
                        if (getbookingData) {
                            const bookingId = getbookingData._id;
                            const getBooking = await Booking.findOne({
                                pnr_no: fareData.pnr_no,
                            })
                                .populate({
                                    path: "routeId",
                                    select: "title"
                                })
                                .populate({
                                    path: "pickupId",
                                    select: "title"
                                })
                                .populate({
                                    path: "dropoffId",
                                    select: "title"
                                })
                                .populate({
                                    path: "busId",
                                    select: "name model_no"
                                })
                                .lean();

                            const passenger = await Passenger.passengerFormatData(
                                bookingId,
                                fareData.bus_id,
                                userId,
                                passengerDetailsItem);
                            const persistedPassenger = await Passenger.insertMany(passenger);
                            // finish transcation
                            await session.commitTransaction();
                            session.endSession();
                            res.status(200).json({
                                status: true,
                                message: "Successfully booked ticket",
                                data: {
                                    getbookingData: await Booking.singletransformData(getBooking),
                                    persistedPassenger: await Passenger.transformFormatData(
                                        persistedPassenger),
                                    walletBalance: walletBalance.amount,
                                },
                            });

                        }

                    }
                } else {
                    res.status(200).json({
                        status: false,
                        message: "Offer is Expired or not Valid.",
                    });
                }


            } else {
                saveObj = {
                    pnr_no: fareData.pnr_no,
                    routeId: fareData.route_id,
                    pickupId: fareData.pickup_stop_id,
                    dropoffId: fareData.drop_stop_id,
                    busId: fareData.bus_id,
                    offerId: null,
                    userId,
                    seat_nos: seats,
                    distance: fareData.distance,
                    has_return: fareData.has_return === "1" ? false : true,
                    start_time: fareData.pickup_time,
                    start_date: fareData.created_date,
                    drop_time: fareData.drop_time,
                    drop_date: fareData.created_date,
                    passengers,
                    sub_total: fareData.sub_total,
                    final_total_fare: fareData.final_total_fare,
                    discount: "0",
                    tax_amount: fareData.tax_amount,
                    tax: fareData.tax,
                    fee: fareData.fee,
                    ip: req.ip,
                    travel_status: "PROCESSING",
                    booking_date: new Date(fareData.created_date + ' ' + fareData.pickup_time),
                    bus_depature_date: new Date(moment(fareData.created_date).tz('Asia/Kolkata').format("YYYY-MM-DD"))
                };

                if (!await Booking.exists({
                    pnr_no: fareData.pnr_no
                })) {
                    // const seat_count
                    const getticket = await Ticket.fetch(fareData.bus_id);
                    saveObj.ticketId = getticket ? getticket._id : null;
                    const getbookingData = await new Booking(saveObj).save();
                    if (getbookingData) {
                        const bookingId = getbookingData._id;
                        const getBooking = await Booking.findOne({
                            pnr_no: fareData.pnr_no,
                        })
                            .populate({
                                path: "routeId",
                                select: "title"
                            })
                            .populate({
                                path: "pickupId",
                                select: "title"
                            })
                            .populate({
                                path: "dropoffId",
                                select: "title"
                            })
                            .populate({
                                path: "busId",
                                select: "name model_no"
                            })
                            .lean();

                        const passenger = await Passenger.passengerFormatData(
                            bookingId,
                            fareData.bus_id,
                            userId,
                            passengerDetailsItem);
                        const persistedPassenger = await Passenger.insertMany(passenger);
                        // finish transcation
                        await session.commitTransaction();
                        session.endSession();
                        res.status(200).json({
                            status: true,
                            message: "Successfully booked ticket",
                            data: {
                                getbookingData: await Booking.singletransformData(getBooking),
                                persistedPassenger: await Passenger.transformFormatData(
                                    persistedPassenger),
                                walletBalance: walletBalance.amount,
                            },
                        });
                    } else {
                        res.status(200).json({
                            status: false,
                            message: "booking ticket failed.",
                        });
                    }
                } else {
                    await Booking.updateOne({ pnr_no: fareData.pnr_no }, { offerId:null,discount: '0' });
                    const getBooking = await Booking.findOne({
                        pnr_no: fareData.pnr_no
                    })
                        .populate({
                            path: "routeId",
                            select: "title"
                        })
                        .populate({
                            path: "pickupId",
                            select: "title"
                        })
                        .populate({
                            path: "dropoffId",
                            select: "title"
                        })
                        .populate({
                            path: "busId",
                            select: "name model_no"
                        })
                        .lean();

                    const getPassenger = await Passenger.find({
                        bookingId: getBooking._id,
                    }).lean();
                    res.status(200).json({
                        status: true,
                        message: "booking already saved.",
                        data: {
                            getbookingData: await Booking.singletransformData(getBooking),
                            persistedPassenger: await Passenger.transformFormatData(
                                getPassenger),
                            walletBalance: walletBalance.amount,
                        },
                    });
                }
            }
        } catch (err) {
            console.log(err);
            await session.abortTransaction();
            throw err;
        }
        finally {
            // ending the session
            session.endSession();
        }
    },
    passPayment: async (req, res) => {
        try {
            const {
                bus_id,
                pass_id,
                pass_amount,
                pass_no_of_rides,
                route_id,
                pickup_stop_id,
                drop_stop_id,
                seat_no,
                has_return,
                payment_mode,
                date
            } = req.body;

            // console.log("req.body", req.body);
            const {
                userId,
                walletId
            } = req.session;

            if (payment_mode === "WALLET") {
                let checkBalance = await Wallet.findOne({
                    users: userId
                });
                if (parseInt(checkBalance.amount) >= parseInt(pass_amount)) {

                    let orderId = "order_" + nanoid(10);
                    let ferriOrderId = "FER_" + nanoid(15);
                    // const getBookingIds = await HelperCustom.generateSinglePass(payment_mode, userId, bus_id, route_id, pickup_stop_id, drop_stop_id, seat_no, has_return, pass_id, parseInt(pass_no_of_rides), req.ip);
                    const getBookingLogId = await BookingLog.createLog(date, pass_amount, payment_mode, userId, bus_id, route_id, pickup_stop_id, drop_stop_id, seat_no, has_return, pass_id, parseInt(pass_no_of_rides), req.ip);
                  //   console.log("getBookingLogId", getBookingLogId, "pass_amount", pass_amount);
                    if (getBookingLogId) {
                        if (await Payment.exists({ bookingLogId: mongoose.Types.ObjectId(getBookingLogId._id) })) {

                           var PaymentObj = {
                                orderId: orderId,
                                total_pass_amount: parseInt(pass_amount),
                                amount: (parseInt(pass_amount) / parseInt(pass_no_of_rides)),
                                ferriOrderId: ferriOrderId
                            }
                            await Payment.updateOne({ bookingLogId: mongoose.Types.ObjectId(getBookingLogId._id) }, updateObj);
                        } else {
                           var  PaymentObj = {
                                bookingId: mongoose.Types.ObjectId(getBookingLogId._id.toString()),
                                walletId: checkBalance._id,
                                userId: userId,
                                passId:mongoose.Types.ObjectId(pass_id),
                                is_pass: true,
                                total_pass_amount: parseInt(pass_amount),
                                amount: (parseInt(pass_amount) / parseInt(pass_no_of_rides)),
                                orderId: orderId,
                                ferriOrderId: ferriOrderId,
                                payment_status: "Completed",
                                method: payment_mode,
                                title: "Ride paid",
                                type: 1
                            };

                            const createPayment = await Payment.create(PaymentObj);
                        }

                        const getBookingLog = await BookingLog.findById(mongoose.Types.ObjectId(getBookingLogId._id.toString())).lean();
                        if (getBookingLog) {
                           // console.log("getBookingLog", getBookingLog)
                            const getBookingIds = await HelperCustom.generateSinglePass(getBookingLog.booking_date, "SCHEDULED", getBookingLog.payment_mode, getBookingLog.userId, getBookingLog.busId, getBookingLog.routeId, getBookingLog.pickupId, getBookingLog.dropoffId, getBookingLog.seat_no, getBookingLog.has_return, getBookingLog.passId, getBookingLog.pass_no_of_rides, getBookingLog.ip);
                            if (getBookingIds) {
                                if (await Payment.exists({ orderId })) {
                                    const updatePayment = await Payment.updateOne({ orderId }, {
                                        bookingLogId: getBookingLog._id,
                                        bookingId: getBookingIds,
                                        payment_status: "Completed"
                                    });

                                    // call balance deduct
                                    if (updatePayment.n > 0) {
                                        const BalanceAmount = parseInt(checkBalance.amount) - parseInt(pass_amount); // deduct amount
                                        const updateWallet = await Wallet.updateOne({
                                            users: userId
                                        }, {
                                            amount: BalanceAmount
                                        });


                                          const getUser = await User.findById(userId);
                                        if (getUser.device_token){
                                           user.UserNotification(
                                            "Pass Purchased",
                                            `Thanks for booking ferri shuttle. Pass has been added to ticket history. Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
                                            "",
                                            getUser.device_token); //title,message,data,token
                                         }


                                        res.status(200).json({
                                            status: true,
                                            data: { payment_mode },
                                            message: "booking  payment successful completed with wallet.",
                                        });

                                    }
                                }
                            }
                        }

                    } else {
                        res.status(200).json({
                            status: false,
                            message: "booking not found.",
                        });
                    }
                }

            } else if (payment_mode === "UPI" || payment_mode === "CARD" || payment_mode === "PAYTM") {
                const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
                const currency = razorPaySetting.payment_settings.currency;
                const receipt = razorPaySetting.ferriOrderId;
                const payment_capture = razorPaySetting.payment_settings.payment_capture;

                // const getBookingIds = await HelperCustom.generateSinglePass(payment_mode, userId, bus_id, route_id, pickup_stop_id, drop_stop_id, seat_no, has_return, pass_id, parseInt(pass_no_of_rides), req.ip); 
                const getBookingLogId = await BookingLog.createLog(date, pass_amount, payment_mode, userId, bus_id, route_id, pickup_stop_id, drop_stop_id, seat_no, has_return, pass_id, parseInt(pass_no_of_rides), req.ip);
                //  console.log("getBookingLogId", getBookingLogId, "pass_amount", pass_amount);
                if (getBookingLogId) {
                    let parameters = {
                        amount: parseInt(pass_amount) * 100,
                        currency,
                        receipt,
                        payment_capture,
                        notes: {
                            bookingLogId: getBookingLogId._id.toString(),
                        },
                    };
                    // console.log("parameters", parameters);
                    const razordata = await razorPaySetting.razor.orders.create(parameters);
                    if (await Payment.exists({ bookingLogId: mongoose.Types.ObjectId(getBookingLogId._id.toString()) })) {
                        const updateObj = {
                            orderId: razordata.id,
                            total_pass_amount: pass_amount,
                            amount: (parseInt(pass_amount) / parseInt(pass_no_of_rides)),
                            ferriOrderId: receipt
                        }
                        await Payment.updateOne({ bookingLogId: mongoose.Types.ObjectId(getBookingLogId._id.toString()) }, updateObj);

                    } else {
                        const PaymentObj = {
                            bookingLogId: mongoose.Types.ObjectId(getBookingLogId._id.toString()),
                            walletId: walletId,
                            userId: userId,
                            passId:mongoose.Types.ObjectId(pass_id),
                            is_pass: true,
                            amount: (parseInt(pass_amount) / parseInt(pass_no_of_rides)),
                            total_pass_amount: pass_amount,
                            orderId: razordata.id,
                            ferriOrderId: receipt,
                            payment_status: "Processing",
                            method: payment_mode,
                            title: "Ride paid",
                            type: 1
                        };
                        // console.log("PaymentObj", PaymentObj);
                        await Payment.create(PaymentObj);
                    }

                    const getuser = await User.findById(userId);
                    const result = {
                        status: true,
                        message: "successfully generate booking order.",
                        verify_url: `${process.env.BASE_URL}api/booking/pass-payment-verify`,
                        data: {
                            orderId: razordata.id,
                            amount: pass_amount,
                            payment_mode,
                            name: `Booking Ride - ${receipt}`,
                            prefill: {
                                name: getuser.firstname + " " + getuser.lastname,
                                email: getuser.email,
                                contact: getuser.phone.toString(),
                            },
                            notes: {
                                ferri_order_id: receipt,
                                booking_pnr_no: '',
                                bookingLogId: getBookingLogId._id.toString()
                            },
                            payment_settings: razorPaySetting.payment_settings,
                        },
                    }
                    // console.log("result", result);
                    res.status(200).json(result);
                }
            }
        } catch (err) {
            console.log(err);
            res.status(404).json({
                status: false,
                message: "error while : " + err,
            });

        }
    },
    payment: async (req, res) => {
        try {
            const {
                amount,
                pnr_no,
                payment_mode,
                date
            } = req.body;

            const {
                userId,
                walletId
            } = req.session;
            if (payment_mode === "WALLET") {
                const checkBalance = await Wallet.findOne({
                    users: userId
                }).populate({
                    path: "users",
                    select: "device_token",
                });

                if (parseInt(checkBalance.amount) >= parseInt(amount)) {
                    const BalanceAmount = parseInt(checkBalance.amount) - parseInt(amount); // deduct amount
                    const updateWallet = await Wallet.updateOne({
                        users: userId
                    }, {
                        amount: BalanceAmount
                    });
                    if (updateWallet.n > 0) {

                        if (await Booking.exists({
                            pnr_no
                        })) { // booking exists
                            const updateObj = {
                                travel_status: "SCHEDULED",
                            };
                            const updateBooking = await Booking.findOneAndUpdate({
                                pnr_no
                            },
                                updateObj, {
                                new: true
                            });
                            if (updateBooking) {
                                const createPayment = {
                                    bookingId: updateBooking._id,
                                    walletId: checkBalance._id,
                                    userId: userId,
                                    orderId: "order_" + nanoid(10),
                                    ferriOrderId: "FER_" + nanoid(15),
                                    payment_status: 'Completed',
                                    method: payment_mode.toLowerCase(),
                                    amount: parseInt(amount),
                                    title: "Ride paid",
                                    type: 1

                                }


                                await Payment.create(createPayment);
                                if (checkBalance.users.device_token) {
                                    user.UserNotification(
                                        "Booking Confirmed",
                                        `Thanks for booking ferri shuttle for ${updateBooking.start_date}, Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
                                        "",
                                        checkBalance.users.device_token); //title,message,data,token
                                }
                                res.status(200).json({
                                    status: true,
                                    message: "booking  payment successful with wallet.",
                                    data: {
                                        payment_mode,
                                        amount
                                    }
                                });
                            }
                        } else {
                            res.status(200).json({
                                status: false,
                                message: "booking not found.",
                            });
                        }
                    }
                } else {
                    res.status(200).json({
                        status: false,
                        message: "you don't have enough balance.",
                    });
                }

            } else if (payment_mode === "FREE" && amount === "0") {
                 const checkBalance = await Wallet.findOne({
                    users: userId
                }).populate({
                    path: "users",
                    select: "device_token",
                });

                if (await Booking.exists({
                    pnr_no
                })) { // booking exists
                    const updateObj = {
                        travel_status: "SCHEDULED",
                        payment_mode,
                    };
                    const updateBooking = await Booking.findOneAndUpdate({
                        pnr_no
                    },
                        updateObj, {
                        new: true
                    });
                    if (updateBooking) {
                        const createPayment = {
                            bookingId: updateBooking._id,
                            walletId: checkBalance._id,
                            userId: userId,
                            orderId: "order_" + nanoid(10),
                            ferriOrderId: "FER_" + nanoid(15),
                            payment_status: 'Completed',
                            method: payment_mode.toLowerCase(),
                            amount: parseInt(amount),
                            title: "Ride paid",
                            type: 1

                        }

                        await Payment.create(createPayment);
                        if (checkBalance.users.device_token) {
                            user.UserNotification(
                                "Booking Confirmed",
                               `Thanks for booking ferri shuttle for ${updateBooking.start_date}, Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,        
                                "",
                                checkBalance.users.device_token); //title,message,data,token
                        }
                        res.status(200).json({
                            status: true,
                            message: "booking  payment successful with wallet.",
                            data: {
                                payment_mode,
                                amount
                            }
                        });
                    }
                } else {
                    res.status(200).json({
                        status: false,
                        message: "Booking not found.",
                    });
                }
            } else if (
                payment_mode === "UPI" ||
                payment_mode === "CARD" ||
                payment_mode === "PAYTM") {

                if (await Booking.exists({
                    pnr_no
                })) {
                    const getBooking = await Booking.findOne({
                        pnr_no
                    }, "_id pnr_no");
                    const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
                    const currency = razorPaySetting.payment_settings.currency;
                    const receipt = razorPaySetting.ferriOrderId;
                    const payment_capture = razorPaySetting.payment_settings.payment_capture;
                    let parameters = {
                        amount: (parseInt(amount) * 100),
                        currency,
                        receipt,
                        payment_capture,
                        notes: {
                            booking_pnr_no: getBooking.pnr_no
                        }
                    };

                    const data = await razorPaySetting.razor.orders.create(parameters);
                    // console.log('data', data)
                    const createPayment = {
                        bookingId: getBooking._id,
                        walletId: walletId,
                        userId: userId,
                        orderId: data.id,
                        ferriOrderId: receipt,
                        payment_status: "Processing",
                        amount: amount,
                        method: payment_mode.toLowerCase(),
                        title: "Ride paid",
                        type: 1
                    };
                    const getpayment = await Payment.create(createPayment);
                    const getuser = await User.findById(userId);

                    res.status(200).json({
                        status: true,
                        message: "successfully generate booking order.",
                        verify_url: `${process.env.BASE_URL}api/booking/payment-verify`,
                        data: {
                            orderId: data.id,
                            payment_mode,
                            amount: getpayment.amount,
                            name: `Booking Ride - ${receipt}`,
                            prefill: {
                                name: getuser.firstname + " " + getuser.lastname,
                                email: getuser.email,
                                contact: getuser.phone,
                            },
                            notes: {
                                ferri_order_id: receipt,
                                booking_pnr_no: getBooking.pnr_no,
                            },
                            payment_settings: razorPaySetting.payment_settings,
                        },
                    });
                } else {
                    res.status(200).json({
                        status: false,
                        message: "no booking pnr found.",
                    });
                }

            }
        } catch (err) {
            console.log(err);
            res.status(404).json({
                status: false,
                message: "error while : " + err,
            });
        }
    },
    paymentVerify: async (req, res) => {
        try {
            const {
                orderId,
                paymentId,
                signature,
                status
            } = req.body;

           const {
                userId,
                walletId
            } = req.session;

            let getUser = await User.findById(userId);

            if (await Payment.exists({
                orderId
            })) {
                const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
                const secret = razorPaySetting.payment_settings.secret;
                let body = orderId + "|" + paymentId;
                //  const secret = process.env.RAZOR_KEY_SECRET;
                let expectedSignature = crypto
                    .createHmac("sha256", secret)
                    .update(body.toString())
                    .digest("hex");
                if (expectedSignature == signature && status === 'true') {
                    const razorPaymentStatus = await razorPaySetting.razor.payments.fetch(
                        paymentId);
                    if (
                        (razorPaymentStatus && razorPaymentStatus.status == "captured") ||
                        razorPaymentStatus.status == "authorized") {
						
							if (await Payment.exists({ orderId, payment_status: "Processing"})) {
									const updated_payment = await Payment.findOneAndUpdate({
										orderId: orderId,
									}, {
										method: razorPaymentStatus.method,
										paymentId: paymentId,
										payment_signature: signature,
										payment_created: razorPaymentStatus.created_at,
										payment_status: "Completed",
									});
									const pnr_no = razorPaymentStatus.notes.booking_pnr_no;
									const updateBooking = await Booking.findOneAndUpdate({
										pnr_no
									}, {
										travel_status: "SCHEDULED"
									}, {
										new: true
									});

									if (getUser.device_token) {
										user.UserNotification(
											"Booking Confirmed",
											`Thanks for booking ferri shuttle for ${updateBooking.start_date}, Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,        
											"",
											getUser.device_token); //title,message,data,token
									}


								res.status(200).json({
									status: true,
									message: "payment verified successfully.",
									verification: "success",
									data: {
										pnr_no: updateBooking.pnr_no,
										final_total_fare: updateBooking.final_total_fare,
									},
								});
						}else if(await Payment.exists({ orderId, payment_status: "Completed"})){
							
							  res.status(200).json({
									status: true,
									message: "payment verified successfully.",
									verification: "success",
									data: {
									  pnr_no: razorPaymentStatus.notes.booking_pnr_no,
									  final_total_fare: razorPaymentStatus.amount,
									},
						  });	   
						  
						}
                    } else if (razorPaymentStatus && razorPaymentStatus.status == "failed") {
                        const updated_payment = await Payment.findOneAndUpdate({
                            orderId: orderId
                        }, {
                            method: razorPaymentStatus.method,
                            payment_created: razorPaymentStatus.created_at,
                            paymentId: paymentId,
                            payment_signature: signature,
                            payment_status: "Failed"
                        });
                        const pnr_no = razorPaymentStatus.notes.booking_pnr_no;
                        const updateBooking = await Booking.findOne({
                            pnr_no
                        }, {
                            travel_status: false
                        });

                            if(getUser.device_token) {
                                  user.UserNotification(
                                "Booking payment failed",
                                "Booking payment failed",
                                "",
                                getUser.device_token); //title,message,data,token
                            }


                        res.status(200).json({
                            status: false,
                            message: razorPaymentStatus.error_description + ' ' + razorPaymentStatus.error_reason,
                            verification: "failed",
                        });

                    }
                } else {
                    res.status(200).json({
                        status: false,
                        message: "payment signature not matched.",
                    });
                }
            } else {
                res.status(200).json({
                    status: false,
                    message: "payment already completed.",
                });
            }
        } catch (err) {
            console.log("err ehile : " + err);
            res.status(404).json({
                status: false,
                message: "error while : " + err,
            });
        }
    },
    passPaymentVerify: async (req, res) => {
        try {
            const {
                orderId,
                paymentId,
                signature,
                status
            } = req.body;
             const {
                userId,
                walletId
            } = req.session;

            let getUser = await User.findById(userId);
            const session = await mongoose.startSession(); // start transaction session

            session.startTransaction();

            if (await Payment.exists({
                orderId,
                payment_status: "Processing"
            })) {
                const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
                const secret = razorPaySetting.payment_settings.secret;
                let body = orderId + "|" + paymentId;
                let expectedSignature = crypto.createHmac("sha256", secret).update(body.toString()).digest("hex");
                if (expectedSignature == signature && status == "true") {
                    const razorPaymentStatus = await razorPaySetting.razor.payments.fetch(paymentId);
                    if ((razorPaymentStatus && razorPaymentStatus.status === "captured") || razorPaymentStatus.status === "authorized") {

                        const bookingLogId = razorPaymentStatus.notes.bookingLogId;
                        const getBookingLog = await BookingLog.findById(mongoose.Types.ObjectId(bookingLogId.toString())).lean();
                        if (getBookingLog) {
                            const getBookingIds = await HelperCustom.generateSinglePass(getBookingLog.booking_date, "SCHEDULED", getBookingLog.payment_mode, getBookingLog.userId, getBookingLog.busId, getBookingLog.routeId, getBookingLog.pickupId, getBookingLog.dropoffId, getBookingLog.seat_no, getBookingLog.has_return, getBookingLog.passId, getBookingLog.pass_no_of_rides, getBookingLog.ip);
                            if (getBookingIds) {
                                let ObjPayment = {
                                    bookingId: getBookingIds,
                                    bookingLogId: getBookingLog._id,
                                    method: razorPaymentStatus.method,
                                    paymentId: paymentId,
                                    payment_signature: signature,
                                    payment_created: razorPaymentStatus.created_at,
                                    payment_status: "Completed",
                                    payment_details: {
                                        notes: razorPaymentStatus.notes,
                                        description: razorPaymentStatus.description,
                                        wallet: razorPaymentStatus.wallet
                                            ? razorPaymentStatus.wallet
                                            : "",
                                        invoice_id: razorPaymentStatus.invoice_id
                                            ? razorPaymentStatus.invoice_id
                                            : "",
                                        bank: razorPaymentStatus.bank ? razorPaymentStatus.bank : "",
                                        card_id: razorPaymentStatus.card_id
                                            ? razorPaymentStatus.card_id
                                            : "",
                                        vpa: razorPaymentStatus.vpa ? razorPaymentStatus.vpa : "",
                                        fee: razorPaymentStatus.fee,
                                        tax: razorPaymentStatus.tax,
                                        created_at: razorPaymentStatus.created_at,
                                        captured: razorPaymentStatus.captured,
                                    }
                                }
                                const updatePayment = await Payment.updateOne({ orderId }, ObjPayment);

                                if (updatePayment.n > 0) {



   
                                        if (getUser.device_token) {
                                            user.UserNotification(
                                                "Pass Purchased",
                                                `Thanks for booking ferri shuttle. Pass has been added to ticket history. Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
                                                "",
                                                getUser.device_token); //title,message,data,token
                                        }
                                        

                                    res.status(200).json({
                                        status: true,
                                        message: "payment verified successfully.",
                                        verification: "success",
                                        data: {
                                            pnr_no: "",
                                            final_total_fare: getBookingLog.total_amount,
                                        },
                                    });
                                }


                            }

                        } else {

                            res.status(200).json({
                                status: false,
                                message: "payment verified successfully. Booking is not found.",
                            });
                        }

                    }
                } else {
                    res.status(200).json({
                        status: false,
                        message: "payment signature not matched.",
                    });
                }
           } else if(await Payment.exists({orderId,payment_status: "Completed"})){
				
						res.status(200).json({
                                        status: true,
                                        message: "payment verified successfully.",
                                        verification: "success",
                                        data: {
                                            pnr_no: "",
                                            final_total_fare: "",
                                        },
                                });
				
			} else {
                res.status(200).json({
                    status: false,
                    message: "payment orderId failed.",
                });
            }
            await session.commitTransaction();
        } catch (err) {
            console.log("err ehile : " + err);
            await session.abortTransaction();
            res.status(404).json({
                status: false,
                message: "error while : " + err,
            });
        }
    },
    setreminder: async (req, res) => {
        try {
            const {
                pnr_no,
                every,
                time
            } = req.body;
            const {
                userId
            } = req.session;
            if (await Booking.exists({
                pnr_no
            })) {
                const getBooking = await Booking.findOne({
                    pnr_no
                },
                    "_id start_time start_date");
                const bookingId = getBooking._id;
                const bookedDateTime = getBooking.start_date + ' ' + getBooking.start_time;
                console.log('sadasd ', getBooking.start_date + ' ' + getBooking.start_time)
                const datetime = moment(bookedDateTime, 'YYYY-MM-DD hh:mm A').subtract(parseInt(time), 'minutes');

                console.log('new datetime : ', moment(datetime).format('LLL'))

                await Reminder.create(userId, bookingId, datetime, every);

                res.status(200).json({
                    status: true,
                    message: "booking reminder set successfully.",
                });
            } else {
                res.status(200).json({
                    status: false,
                    message: "booking pnr no not exists.",
                });
            }
        } catch (err) {
            console.log("err ehile : " + err);
            res.status(404).json({
                status: false,
                message: "error while : " + err,
            });
        }
    },
	webHookVerfification: async (req, res) => {
	  const secret = "FERRI2022@123#";
    if (req.body) {
      const shasum = crypto.createHmac("sha256", secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest("hex");

      if (req.body.event === "payment.captured" || req.body.event === "payment.authorized") {
        //console.log(digest, req.headers["x-razorpay-signature"]);
        if (digest === req.headers["x-razorpay-signature"]) {
          // console.log("request is legit");
          const type = req.body.payload.payment.entity.notes["type"];
          if (type === "wallet_recharge") {
            const resData = await walletPayment(
              req.body.payload.payment,
              digest
            );
            res.status(200).json(resData);
          } else if (type === "booking") {
            const resData = await bookingPayment(
              req.body.payload.payment,
              digest
            );
            res.status(200).json(resData);
          } else if (type === "booking_pass") {
            const resData = await bookingPassPayment(
              req.body.payload.payment,
              digest
            );
            res.status(200).json(resData);
          } else {
            res.status(403).json({ message: "Invalid" });
          }
        }else {
            res.status(403).json({ message: "Invalid" });
        }
      } else if (req.body.event === "payment.failed") {
        const orderId = req.body.payload.payment.entity.order_id;
        const updated_payment = await Payment.findOneAndUpdate(
          {
            orderId: orderId,
          },
          {
            method: req.body.payload.payment.entity.method,
            payment_created: req.body.payload.payment.entity.created_at,
            paymentId: req.body.payload.payment.entity.id,
            payment_signature: digest,
            payment_status: "Failed",
          }
        );
		 const getUser = await User.findbyId(Payment.userId);
        if (getUser && getUser.device_token) {
            user.UserNotification(
              "Payment failed.",
              `Your booking payment is failed.`,
              "",
              getUser.device_token
            ); //title,message,data,token
          }
		  
        res.status(200).json({ message: "ok" });
       }
     }
    }
};
