const { Payment, Booking, User, Wallet,BookingLog } = require("../../models");
const { user } = require("../../notifications");
const { HelperCustom } = require("../../helpers");
const mongoose = require("mongoose");


module.exports = {
  walletPayment: async (paymentObj,signature) => {
    try {
      const ferriOrderId = paymentObj.entity.notes["ferriOrderId"];
      const getPayment = await Payment.findOne({
        ferriOrderId,
        payment_status: "Processing",
      }).lean();
      if (getPayment) {
        const updated_payment = await Payment.findByIdAndUpdate(
          {
            _id: getPayment._id,
          },
          {
            method: paymentObj.entity.method,
            paymentId: paymentObj.entity.id,
            payment_signature: signature,
            payment_created: paymentObj.entity.created_at,
            payment_status: "Completed",
            payment_details: {
              notes: paymentObj.entity.notes,
              description: paymentObj.entity.description,
              wallet: paymentObj.entity.wallet ? paymentObj.entity.wallet : "",
              invoice_id: paymentObj.entity.invoice_id
                ? paymentObj.entity.invoice_id
                : "",
              bank: paymentObj.entity.bank ? paymentObj.entity.bank : "",
              card_id: paymentObj.entity.card_id
                ? paymentObj.entity.card_id
                : "",
              vpa: paymentObj.entity.vpa ? paymentObj.entity.vpa : "",
              fee: paymentObj.entity.fee,
              tax: paymentObj.entity.tax,
              created_at: paymentObj.entity.created_at,
              captured: paymentObj.entity.captured,
            },
          }
        );
        var wallet = {};
        var updatedWallet = {};
        if (getPayment.walletId != undefined) {
          wallet = await Wallet.findOne({
            _id: getPayment.walletId,
          });
          var total = 0;
          total = parseInt(wallet.amount) + parseInt(getPayment.amount);
          updatedWallet = await Wallet.findOneAndUpdate(
            {
              _id: getPayment.walletId,
            },
            {
              amount: total,
            },
            { new: true }
          ).populate({
            path: "users",
            select: "firstname lastname device_token",
          });

          if (updatedWallet.users && updatedWallet.users.device_token) {
            user.UserNotification(
              "Wallet Recharge Successful",
              `Hey ${updatedWallet.users.firstname}, Amount Rs. ${getPayment.amount} has been added in your wallet. Your new balance is Rs. ${updatedWallet.amount}.`,
              "",
              updatedWallet.users.device_token
            ); //title,message,data,token
          }
          return {
            message: "OK",
          };
        }
      }
    } catch (err) {
      return { message: "failed" };
    }
  },
  bookingPayment: async (paymentObj,signature) => {
    try {
      const ferriOrderId = paymentObj.entity.notes["ferriOrderId"];
      const getPayment = await Payment.findOne({
        ferriOrderId,
        payment_status: "Processing",
      })
      .populate({path: "userId",select:"device_token"})
      .lean();
      if (getPayment) {
        const updated_payment = await Payment.findByIdAndUpdate(
          {
            _id: getPayment._id,
          },
          {
            method: paymentObj.entity.method,
            paymentId:  paymentObj.entity.id,
            payment_signature: signature,
            payment_created: paymentObj.entity.created_at,
            payment_status: "Completed",
          }
        );

        const pnr_no = paymentObj.entity.notes.booking_pnr_no;
        const updateBooking = await Booking.findOneAndUpdate(
          {
            pnr_no: pnr_no,
          },
          {
            travel_status: "SCHEDULED",
          },
          {
            new: true,
          }
        );
        if (getPayment.userId.device_token) {
          user.UserNotification(
            "Booking Confirmed",
            `Thanks for booking ferri shuttle for ${updateBooking.start_date}, Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
            "",
            getPayment.userId.device_token
          ); //title,message,data,token
        }
        return {
          message: "OK",
        };
      }
    } catch (err) {
      return { message: "failed" };
    }
  },
  bookingPassPayment: async (paymentObj) => {
    try {
      const getPayment = await Payment.findOne({
        ferriOrderId,
        payment_status: "Processing",
      })
        .populate({ path: "userId", select: "device_token" })
        .lean();
      if (getPayment) {
        const bookingLogId = paymentObj.entity.notes.bookingLogId;
        const getBookingLog = await BookingLog.findById(
          mongoose.Types.ObjectId(bookingLogId.toString())
        ).lean();
        if (getBookingLog) {
          const getBookingIds = await HelperCustom.generateSinglePass(
            getBookingLog.booking_date,
            "SCHEDULED",
            getBookingLog.payment_mode,
            getBookingLog.userId,
            getBookingLog.busId,
            getBookingLog.routeId,
            getBookingLog.pickupId,
            getBookingLog.dropoffId,
            getBookingLog.seat_no,
            getBookingLog.has_return,
            getBookingLog.passId,
            getBookingLog.pass_no_of_rides,
            getBookingLog.ip
          );

          if (getBookingIds) {
            let ObjPayment = {
              bookingId: getBookingIds,
              bookingLogId: getBookingLog._id,
              method: paymentObj.entity.method,
              paymentId: paymentObj.entity.id,
              payment_signature: signature,
              payment_created: paymentObj.entity.created_at,
              payment_status: "Completed",
              payment_details: {
                notes: paymentObj.entity.notes,
                description: paymentObj.entity.description,
                wallet: paymentObj.entity.wallet
                  ? paymentObj.entity.wallet
                  : "",
                invoice_id: paymentObj.entity.invoice_id
                  ? paymentObj.entity.invoice_id
                  : "",
                bank: paymentObj.entity.bank ? paymentObj.entity.bank : "",
                card_id: paymentObj.entity.card_id
                  ? paymentObj.entity.card_id
                  : "",
                vpa: paymentObj.entity.vpa ? paymentObj.entity.vpa : "",
                fee: paymentObj.entity.fee,
                tax: paymentObj.entity.tax,
                created_at: paymentObj.entity.created_at,
                captured: paymentObj.entity.captured,
              },
            };
            const updatePayment = await Payment.findByIdAndUpdate(
              { _id: getPayment._id },
              ObjPayment
            );

            if (updatePayment.n > 0) {
              if (getPayment.userId.device_token) {
                user.UserNotification(
                  "Pass Purchased",
                  `Thanks for booking ferri shuttle. Pass has been added to ticket history. Show your ticket Qr Code to Driver while boarding.We'll send driver detail in ticket when shuttle starts trip.`,
                  "",
                  getPayment.userId.device_token
                ); //title,message,data,token
              }

              return {
                message: "OK",
              };
            }
          }
        }
      }
    } catch (err) {
      return {
        message: "failed",
      };
    }
  },
};
