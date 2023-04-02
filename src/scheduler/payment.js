const Utils = require("../utils/utils");
const cron = require("node-cron");
const { Booking, Payment, User } = require("../models");
const moment = require("moment-timezone");

module.exports = {
  bookingPaymentCheck: async () => {
    cron.schedule("*/10 * * * *", async function () {
      console.log("******** Process running every minute payment *********");
      try {
        const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
        const currentDate = moment()
          .tz("Asia/Kolkata")
          .startOf("day")
          .toString();
      //  console.log("currentDate", currentDate);
        const payments = await Payment.find({
          payment_status: "Proccessing",
          method: { $ne: "wallet" },
          createdAt: { $gte: currentDate },
        }).lean();
        if (payments.length > 0) {
          for (const payment of payments) {
            const fetchPayments =
              await razorPaySetting.razor.orders.fetchPayments(payment.orderId); // order_8rxvBwFoOD
            if (fetchPayments.items.length > 0) {
              for (const item of fetchPayments.items) {
                if (item.status === "captured" && item.captured == true) {
                  const updatePayment = await Payment.findByIdAndUpdate(
                    payment._id,
                    {
                      payment_status: "Completed",
                      payment_created: item.created_at,
                      paymentId: item.id,
                    }
                  );
                  if (updatePayment) {
                    await Booking.findOneAndUpdate(
                      { _id: { $in: updatePayment.bookingId } },
                      { travel_status: "SCHEDULED" }
                    );
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.log("err", err);
        return err;
      }
    });
  },
};
