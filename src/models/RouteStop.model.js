const mongoose = require("mongoose");
const { omitBy, isNil } = require("lodash");
const { Schema } = mongoose;
const moment = require("moment-timezone");

const { ObjectId } = Schema;
const { Location,Booking } = require('../models')
// const stopSchema = new Schema();
const objectIdToTimestamp = require('objectid-to-timestamp')

const RouteStopSchema = new Schema(
  {
    routeId: { type: ObjectId, ref: "Route", required: true },
    stops: [
      {
        id: { type: ObjectId, default: null },
        name: { type: String, default: "", index: true },
        type: { type: String, default: "out", index: true },
        location: {
          type: { type: String, default: "Point" },
          address: { type: String, default: "" },
          title: { type: String, default: "" },
          coordinates: [Number],
          default: [0, 0],
        },
        minimum_fare_pickup: { type: String, default: "", index: true },
        minimum_fare_drop: { type: String, default: "", index: true },
        price_per_km_drop: { type: String, default: "", index: true },
        price_per_km_pickup: { type: String, default: "", index: true },
        departure_time:{ type: Date, default: "", index: true },
        arrival_time:{ type: Date, default: "", index: true },
      },
    ],
  },
  { timestamps: true }
);


RouteStopSchema.index({ "stops.location": "2dsphere" });


RouteStopSchema.statics = {
	  async getStopNames(routeId) {
    try {
      const getStop = await this.findOne({ routeId }, "stops");
      if (getStop) {
        let lastIndex = getStop.stops.length - 1;
        var startStop = getStop.stops.filter((e, i) => {
          return i == 0;
        });
        var endStop = getStop.stops.filter((e, i) => {
          return i == lastIndex;
        });
        return {
          name: startStop[0].name + " - " + endStop[0].name,
          start_at:
            moment(startStop[0].departure_time)
              .tz("Asia/kolkata")
              .format("hh:mm A") +
            " - " +
            startStop[0].name,
          end_at:
            moment(endStop[0].arrival_time)
              .tz("Asia/kolkata")
              .format("hh:mm A") +
            " - " +
            endStop[0].name,
        };
      }
    } catch (err) {
      console.log("err : ", err);
      return "err while : " + err;
    }
  },
    async getNearestStop(trip,lng,lat,day,currentDate){
        try {
			
            const maxDistance = 5000; // 5000m == 5km
         const curentTime = moment('2022-05-16T12:10:00.000+05:30').tz('Asia/kolkata').format('HH:mm:ss A');
      const convertSec = moment(curentTime, 'HH:mm:ss: A').diff(moment().startOf('day'), 'seconds');
      console.log('curentTime', curentTime, 'sdd', convertSec);
      var timefilter = (convertSec <= 43200) ? { $gte: convertSec, $lte: 43200 } : { $gte: convertSec };
            return this.aggregate([
                {
                  $geoNear: {
                    near: {
                      type: "Point",
                      coordinates: [parseFloat(lng), parseFloat(lat)],
                    },
                    distanceField: "distance",
                    maxDistance: maxDistance,
                    distanceField: "actual_distance" ,
                    spherical: true,
                    includeLocs: "loc",
                  },
                },
 	        {
                  $lookup: {
                    from: "routes",
                    localField: "routeId",
                    foreignField: "_id",
                    as: "route",
                  },
                },
                { $unwind: "$route"},
               {
          $lookup: {
            from: "timetables",
            let: { routeId: "$routeId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$routeId", "$$routeId"],
                      },
                    ],
                  },
                  status: true,
                  every: { $in: [day] },
                  //time_sec:timefilter,
                  $and: [
                    {
                      start_date: { $lte: new Date(currentDate) },
                      end_date: { $gte: new Date(currentDate) },
                    },
                  ],
                },
              },
              {
                $project: {
                  status: 1,
                  every: 1,
                  busId: 1,
                },
              },
            ],
            as: "timetable",
          },
        },
        { $unwind: "$timetable" },
                {
                    $project: {
                        "route_name":"$route.title",
                        "routeId":"$route._id",
						"total_of_stops":{ $size: "$stops"},
                        actual_distance: 1,
                        route_bus:"$timetable",
                        stop:{ 
                            "$filter": {
                              "input": "$stops",
                              "as": "stop",
                              "cond": { $eq: [ "$$stop.location", "$loc" ] }
                            }
                          },
                        //   route_bus_start_date: {
                        //     $dateToString: {
                        //       format: "%Y-%m-%d",
                        //       date: "$route_bus.start_date",
                        //       timezone: "Asia/Kolkata",
                        //     },
                        //   },
                        //   route_bus_end_date: {
                        //     $dateToString: {
                        //       format: "%Y-%m-%d",
                        //       date: "$route_bus.end_date",
                        //       timezone: "Asia/Kolkata",
                        //     },
                        //   },
                        //   route_bus: 1,
                        //   busId: "$route_bus.busId"               
                    },
                    
                },
                { $addFields: {
                    "trip":trip

                  }
                }
            ]);
          } catch (err) {
            console.log(err);
            return err;
          }

    },
    formatpickup(data){
        const selectableItems = [];
        data.forEach(async (item) => {
         
            selectableItems.push({
              id: item._id,
              pickup_distance: (item.actual_distance / 1000).toFixed(1) + ' km',
              routeId: item.routeId,
			  route_name:item.route_name,
			  total_of_stops:item.total_of_stops,
              route_busId:item.route_bus.busId,
              route_bus_timetable:item.route_bus.every,
              pickup_stop_id:item.stop[0].id,
              pickup_stop_name:item.stop[0].location.title,
			  pickup_stop_order:item.stop[0].order,
              pickup_stop_lat:item.stop[0].location.coordinates[1],
              pickup_stop_lng:item.stop[0].location.coordinates[0],
              pickup_stop_minimum_fare_pickup:item.stop[0].minimum_fare_pickup,
            //  pickup_stop_minimum_fare_drop:item.stop[0].minimum_fare_drop,
            //  pickup_stop_minimum_fare_drop:item.stop[0].price_per_km_drop,
              pickup_stop_minimum_fare_drop:item.stop[0].price_per_km_pickup,     
              pickup_stop_departure_time: moment(item.stop[0].departure_time).tz('Asia/kolkata').format('hh:mm A') ,
  
            });
        });
        return selectableItems;
    },
    formatdrop(data){
        console.log(data);
        const selectableItems = [];
        data.forEach((item) => {
            selectableItems.push({
              id: item._id,
              drop_distance: (item.actual_distance / 1000).toFixed(1) + ' km',
              routeId: item.routeId,
			   route_name:item.route_name,
              total_of_stops:item.total_of_stops,
              route_bus_timetable:item.route_bus.every,
              drop_stop_id:item.stop[0].id,
              drop_stop_name:item.stop[0].location.title,
              route_busId:item.route_bus.busId,
			  drop_stop_order:item.stop[0].order,
              drop_stop_lat:item.stop[0].location.coordinates[1],
              drop_stop_lng:item.stop[0].location.coordinates[0],
             // drop_stop_minimum_fare_pickup:item.stop[0].minimum_fare_pickup,
              drop_stop_minimum_fare_drop:item.stop[0].minimum_fare_drop,
              drop_stop_price_per_km_drop:item.stop[0].price_per_km_drop,
            //  drop_stop_minimum_fare_pickup:item.stop[0].price_per_km_pickup, 
              drop_stop_arrival_time:moment(item.stop[0].arrival_time).tz('Asia/kolkata').format('hh:mm A')
            });
        });
        return selectableItems;
    },
    formatstops(data,pickupId,dropId){
        const selectableItems = [];
        data.forEach((item) => {
            selectableItems.push({
              id: item.id,
              name:item.location.title,
              pickup:(objectIdToTimestamp(item.id) == pickupId) ? true : false,
              drop:(objectIdToTimestamp(item.id) == dropId) ? true : false,
              lat:item.location.coordinates[1],
              lng:item.location.coordinates[0]
            });
        });
        return selectableItems;
    },
	transformRouteData(data){
      const selectableItems = [];
      data.forEach((item) => {
        var hold;
            if(item.drop_stop_order > item.pickup_stop_order){
              hold = (item.drop_stop_order - item.pickup_stop_order)   // 4 -1 3
            }else{
              hold = (item.pickup_stop_order - item.drop_stop_order)
            } 

          selectableItems.push({
            routeId:item.routeId,
            route_name:item.route_name,
            route_busId:item.route_busId,
            total_of_stops:item.total_of_stops.toString(),
            route_bus_timetable:item.route_bus_timetable,
            holds:hold.toString(),
            pickup_stop_id:item.pickup_stop_id,
            pickup_stop_name:item.pickup_stop_name,
            pickup_stop_lat:item.pickup_stop_lat,
            pickup_stop_lng:item.pickup_stop_lng,
            pickup_stop_minimum_fare_pickup:item.pickup_stop_minimum_fare_pickup,
            pickup_stop_minimum_fare_drop:item.pickup_stop_minimum_fare_drop,
            pickup_stop_departure_time:item.pickup_stop_departure_time,
            pickup_distance:item.pickup_distance,
            drop_distance:item.drop_distance,
            drop_stop_id:item.drop_stop_id,
            drop_stop_id: item.drop_stop_id,
            drop_stop_name: item.drop_stop_name,
            drop_stop_order: item.drop_stop_order,
            drop_stop_lat: item.drop_stop_lat,
            drop_stop_lng: item.drop_stop_lng,
            drop_stop_minimum_fare_drop: item.drop_stop_minimum_fare_drop,
            drop_stop_price_per_km_drop: item.drop_stop_price_per_km_drop,
            drop_stop_arrival_time: item.drop_stop_arrival_time
          });
        });
       return selectableItems;
    },
	 transformData(data){
      const selectableItems = [];
      data.forEach((item) => {
          selectableItems.push({
            routeId:item.routeId._id,
            route_title:item.routeId.title,
            stops:this.transformStopData(item.stops)
          });
      });
      return selectableItems;
    },
    transformStopData(data) {
      const selectableItems = [];
      data.forEach((item) => {
          selectableItems.push({
            id: item.id,
            files: Location.transformFile(item.files),
            name:item.location.title,
            lat:item.location.coordinates[1],
            lng:item.location.coordinates[0],
            departure_time:(item.departure_time) ? moment(item.departure_time).tz('Asia/kolkata').format('hh:mm A') : '',
            arrival_time:(item.arrival_time) ? moment(item.arrival_time).tz('Asia/kolkata').format('hh:mm A'): ''
          });
      });
      return selectableItems;
    },
    transformStopPassengerData(routeId,data,date){
        let selectableItems = [];
        data.forEach(async(item) => {
            let passenger_count = await Booking.totalBooking(routeId,item.id,date);
            selectableItems.push({
                id: item.id,
                passenger_count,
                files: Location.transformFile(item.files),
                name: item.location ? item.location.title : '',
                lat: item.location ? item.location.coordinates[1] : 0.00,
                lng: item.location ? item.location.coordinates[0] : 0.00,
                departure_time: item.departure_time ?
                    moment(item.departure_time).tz("Asia/kolkata").format("hh:mm A") : "",
                arrival_time: item.arrival_time ?
                    moment(item.arrival_time).tz("Asia/kolkata").format("hh:mm A") : "",
 		order:item.order
            });
        });
        return selectableItems;
    }

}

module.exports = mongoose.model("Route_Stop", RouteStopSchema);
