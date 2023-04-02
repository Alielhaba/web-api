const Utils = require("../../utils/utils");
const routeUtils = require("../../utils/route.utils");
const {
  SearchAddress,
  Setting,
  Location,
  Route,
  RouteStop,
  RouteDetail,
} = require("../../models");
const _ = require("lodash");
const objectIdToTimestamp = require("objectid-to-timestamp");
const moment = require("moment-timezone");
const { HelperCustom } = require('../../helpers')


module.exports = {
  generateFare: async (req, res) => {
    try {
      const { route_id,bus_id,pickup_stop_id, drop_stop_id,seat_no,has_return,start_date } = req.body;
 
 //console.log('sadasdasd  ',req.body);
 
      const getFare = await HelperCustom.generateBookingFare(route_id,bus_id,pickup_stop_id,drop_stop_id,seat_no,has_return,start_date); // helper generate fare

      res.status(200).json({
        status: true,
        message: "Successfully generate fare. ",
        data:{
            pnr_no: getFare.pnr_no,
            created_date:getFare.created_date,
            route_id:getFare.route_id,
			bus_id:getFare.bus_id,
            pickup_stop_id:getFare.pickup_stop_id,
            pickup_name:getFare.pickup_name,
            pickup_time:getFare.pickup_time,
            drop_stop_id:getFare.drop_stop_id,
            drop_name:getFare.drop_name,
            drop_time:getFare.drop_time,
            distance: getFare.distance,
            has_return:getFare.has_return,
            seat_no:getFare.seat_no,
            no_of_seats:getFare.no_of_seats,
            sub_total:getFare.sub_total,
            final_total_fare:getFare.final_total_fare,
            tax_amount:getFare.tax_amount,
            tax : getFare.tax,
            fee : getFare.fee
           }
      });

    } catch (err) {
	
		  res.status(404).json({
			status: true,
			message: "error while : "+err
		});
	}
  },
};
