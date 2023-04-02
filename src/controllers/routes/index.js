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

module.exports = {
  searchroute: async (req, res) => {
    try {
      var {
        pickup_lat,
        pickup_long,
        drop_lat,
        drop_long,
        search_type,
        current_date,
        type,
      } = req.body;

      // const appSettings = await Utils.getSetting() // get application Settings
      const tax = 5;
      var rId = [];
       var day = moment(current_date).tz('Asia/Kolkata').format("dddd").toLowerCase();
        if (day === 'saturday') {
          day = 'monday';
          current_date = moment(current_date).add(2, "days").format('YYYY-MM-DD');
        } else if (day === 'sunday') {
          day = 'monday';
          current_date = moment(current_date).add(1, "days").format('YYYY-MM-DD');
        }
        
      if (type == "oneway") {
        const pickupData = await RouteStop.formatpickup(
          await RouteStop.getNearestStop(
            "pickup",
            pickup_long,
            pickup_lat,
            day,
            current_date
          )
        );
        const dropData = await RouteStop.formatdrop(
          await RouteStop.getNearestStop(
            "drop",
            drop_long,
            drop_lat,
            day,
            current_date
          )
        );

	//console.log('pickupData',pickupData,'dropData',dropData)
        if (pickupData != "" && dropData != "") {
          var mergeroutes = pickupData.map((item, i) =>
            Object.assign({}, item, dropData[i])
          );

          res.status(200).json({
            status: true,
            message: "Successfully found route",
            data: {  date:current_date,
              routes: await Utils.transformRouteData(current_date, mergeroutes)
			  }
          });
        } else {
          res.status(200).json({
            status: false,
            message: "No Route Found",
          });
        }
      } else if (type == "office") {
	
        const pickupData = await RouteStop.formatpickup(
          await RouteStop.getNearestStop(
            "pickup",
            pickup_long,
            pickup_lat,
            day,
            current_date
          )
        );
        const dropData = await RouteStop.formatdrop(
          await RouteStop.getNearestStop(
            "drop",
            drop_long,
            drop_lat,
            day,
            current_date
          )
        );
      //  console.log('pickupData',pickupData,'dropData',dropData)
        if (pickupData != "" && dropData != "") {
          var mergeroutes = pickupData.map((item, i) =>
            Object.assign({}, item, dropData[i])
          );

          res.status(200).json({
            status: true,
            message: "Successfully found route",
            data: {  date:current_date,
              routes: await Utils.transformRouteData(current_date, mergeroutes)
            }
           
          });
        } else {
          res.status(200).json({
            status: true,
            message: "No Route Found",
          });
        }  
		   
	  }else if (search_type == "google") {
        loc1 = await SearchAddress.get(from); // from
        loc2 = await SearchAddress.get(to); // to

        lat1 = loc1.location.coordinates[1];
        long1 = loc1.location.coordinates[0];
        lat2 = loc2.location.coordinates[1];
        long2 = loc2.location.coordinates[0];
        distance = Utils.findDistance(
          loc1.location.coordinates,
          loc2.location.coordinates
        );

        var location1 = await SearchAddress.nearBy(
          loc1.location.coordinates,
          5
        ); // near 5 km fetch data
        var location2 = await SearchAddress.nearBy(
          loc2.location.coordinates,
          5
        ); // near 5 km fetch data

        //console.log("location2", location2, "location1", location1);

        var routes = [];
        location2.forEach((item) => {
          routes.push(item._id);
        });
        location1.forEach((item) => {
          routes.push(item._id);
        });

        const routeIds = await RouteDetail.find(
          { locationId: routes },
          { routeId: 1, _id: 0 }
        );

        routeIds.forEach(async (item) => {
          rId.push(item.routeId);
        });
      }
    } catch (err) {
      console.log(err);
      res.status(404).json({
        status: false,
        message: "Location not found",
        errorMessage: err.message,
      });
    }
  },
  fetchroutes: async (req, res) => {
    try {
      const { pickup_stop_id, drop_stop_id } = req.body;

      const getdata = await RouteStop.findOne(
        { routeId: req.params.routeId },
        "stops"
      ).lean();

      res.status(200).json({
        status: true,
        message: "Successfully found route",
        data: await RouteStop.formatstops(
          getdata.stops,
          objectIdToTimestamp(pickup_stop_id),
          objectIdToTimestamp(drop_stop_id)
        ),
      });
    } catch (err) {
      console.log(err);
      res.status(404).json({
        status: false,
        message: "Location not found 23",
        errorMessage: err.message,
      });
    }
  },
  fetchroutetiming: async (req, res) => {
    try {   
      const {route_id,pickup_stop_id,drop_stop_id} = req.body;


      res.status(200).json({
        status: true,
        message: "Successfully found route",
        data: { 
          route_id,pickup_stop_id,drop_stop_id
        }
      });
     } catch (err) {
      console.log(err);
      res.status(404).json({
        status: false,
        message: "stops not found",
        errorMessage: err.message,
      });
    }
  },
  seatprice: async (req, res) => {
    try { 
      const { routeId,pickup_stop_id,drop_stop_id,seat_no,busId} = req.body;

        const getdata= await RouteStop.findOne({routeId:routeId}).select({ stops: {$elemMatch: {id: {$in:[pickup_stop_id,drop_stop_id]} }}})


        
        res.status(200).json({
          status: true,
          message: "Successfully found route",
          data: getdata
        });

    } catch (err) {
      console.log(err);
      res.status(404).json({
        status: false,
        message: "stops not found",
        errorMessage: err.message,
      });
    }
  },
  explore: async (req, res) => {
    try { 
      const getdata= await RouteStop.find({})
         .populate({path:'routeId',select:"title"}).lean();

        //  getdata.stops = await Route.filterStops(getdata.routedestops.stops)
          res.status(200).json({
            status: true,
            message: "Successfully found route",
            data: await RouteStop.transformData(getdata)
          });

    } catch (err) {
      console.log(err);
      res.status(404).json({
        status: false,
        message: "stops not found",
        errorMessage: err.message,
      });
    }
  },
};
