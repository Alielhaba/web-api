const Utils = require("../../utils/utils");
const routeUtils = require("../../utils/route.utils");
const {
    SearchAddress,
    Setting,
    Location,
    Route,
    RouteStop,
    RouteDetail,
    Bus,
    BusLayout,
    UserReferral,
	Wallet
} = require("../../models");
const _ = require("lodash");
const objectIdToTimestamp = require("objectid-to-timestamp");
const moment = require("moment-timezone");
const {
    HelperCustom
} = require('../../helpers')

    module.exports = {
    searchseats: async(req, res) => {
        try {
            const {
                route_id,
                pickup_stop_id,
                drop_stop_id,
                type,
                has_return,
                 current_date,
                end_date,
            } = req.body;

            const busId = req.params.busId;
			const {
                walletId,
                userId
            } = req.session;
			
            const getbus = await Bus.findOne({
                _id: busId
            })
                .populate({
                path: "bustypeId",
                select: "name"
            })
                .populate({
                path: "buslayoutId",
                model: BusLayout
            })
                // .lean();
                const getbuses = await Bus.transformdata(getbus);
        
            let created_date = moment().tz("Asia/kolkata").format("YYYY-MM-DD");
            const getFare = await HelperCustom.generateBookingFare(route_id, busId, pickup_stop_id, drop_stop_id, "[A1]",has_return,current_date); // helper generate fare
           console.log("getFare ",getFare)
	   getbuses.final_total_fare = getFare.final_total_fare;
            getbuses.tax = getFare.tax;
              getbuses.tax_amount = getFare.tax_amount;

            if (type === 'office') {
                    getbuses.buslayoutId = await BusLayout.transformData(route_id, busId, getbuses.buslayoutId,current_date,end_date);
                const getPassFare = await HelperCustom.generatePassFare(route_id,pickup_stop_id, drop_stop_id, "[A1]",has_return); // helper generate fare
              //  console.log("getPassFare",getPassFare)
                getbuses.final_pass_fare = getPassFare;
                getbuses.pickup_name = getFare.pickup_name;
                getbuses.pickup_time = getFare.pickup_time;
                getbuses.drop_name = getFare.drop_name;
                getbuses.drop_time = getFare.drop_time;
                getbuses.seat_no = getFare.seat_no;
                getbuses.created_date = getFare.created_date;
            }else{

                 getbuses.buslayoutId = await BusLayout.transformData(route_id, busId, getbuses.buslayoutId,current_date,'');
            }

			const wallet = await Wallet.findById({
                _id: walletId
            });
			 const credamount = await UserReferral.totalRefAmount(userId);
			getbuses.user_total_wallet_amount =  parseInt(wallet.amount) + parseInt(credamount);
			
            res.status(200).json({
                status: true,
                message: "Successfully found bus seats ",
                data: getbuses
            });

        } catch (err) {
            console.log(err);
            res.status(404).json({
                status: false,
                message: "bus seat not found",
                errorMessage: err.message,
            });
        }
    },
};
