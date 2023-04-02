const mongoose = require("mongoose");
const { Schema } = mongoose;
const moment = require("moment-timezone");
const { ObjectId } = Schema;
const { Driver, Ticket, RouteStop,Booking } = require("../models")
const _ = require('lodash');


const bookingAsignSchema = new Schema({
    adminId: { type: ObjectId, ref: 'Admin', required: false },
    ticketId: { type: ObjectId, ref: "Ticket" },
    routeId: { type: ObjectId, ref: 'Route', required: true },
    driverId: { type: ObjectId, ref: "Driver", required: true },
    assistantId: { type: [ObjectId], ref: "Driver" },
    date_time: { type: Date, index: true },
    status: { type: Boolean, default: false },
    angle:{type:String,default:"0"},
    location: {
        type: { type: String, default: "Point" },
        address: { type: String, default: "" },
        coordinates: [Number],
        time_created:{type:Number,default:0}
    },
    trip_status: { type: String, enum: ['ASSIGNED',"EXPIRED",'STARTED', 'COMPLETED', 'NOTSTARTED', 'RIDING'], default: "ASSIGNED" }
}, {
    timestamps: true,
});



bookingAsignSchema.virtual("timetables", {
    ref: "Timetable", // the model to use
    localField: "routeId", // find children where 'localField'
    foreignField: "routeId", // is equal to foreignField
    justOne: true,
});


bookingAsignSchema.index({ location: "2dsphere" });
//assistant
//

bookingAsignSchema.statics = {
   async driverDetail(routeId, tripDate) {
        try {
		console.log("routeId, tripDate",routeId, tripDate)
            const tripDate = moment(tripDate).tz("Asia/Kolkata").format("YYYY-MM-DD")
            const getAssignDetail = await this.findOne({ 
                routeId, 
                date_time: new Date(tripDate),
                trip_status:{$in:["ASSIGNED","STARTED","RIDING"]}
             })
                .populate({ path: "driverId", select: "firstname lastname phone" }).lean();
            if (getAssignDetail) {
                return {
                    firstname:getAssignDetail.driverId.firstname,
                    lastname:getAssignDetail.driverId.lastname,
                    phone:getAssignDetail.driverId.phone,
                }
            } else {
                return {}
            }
        } catch (err) {

            console.log("err while : " + err);
            return false;
        }
    },
    async isExistAssign(assignId) {
        return await this.exists({ _id: assignId });
    },
    transformStatus(item){

        if(item.trip_status === "RIDING"){
         return {
                    trip_status:item.trip_status,
                    lat:item.location.coordinates[1],
                    lng:item.location.coordinates[0],
                    assignId:item._id,
                    angle:item.angle,
                     next_stop:(Object.keys(item.stop).length > 0 ) ? {
                        "lat":item.stop.location.coordinates[1].toString(),
                        "lng":item.stop.location.coordinates[0].toString(),
                        "title":item.stop.location.title,
                    } : {
                        "lat":"",
                        "lng":"",
                        "title":"",  
                    }
                }
        }else{
             return {
            trip_status:item.trip_status,
            lat:item.location.coordinates[1],
            lng:item.location.coordinates[0],
            assignId:item._id,
            angle:item.angle,
            next_stop: {
                "lat":"",
                "lng":"",
                "title":"",  
            }
          }  
        }
       
    },
   async transformData(item) {
            let passenger_total = 0;
            let date =  moment(item.date_time).tz('Asia/kolkata').format('YYYY-MM-DD')
            let stops = await RouteStop.transformStopPassengerData(item.routeId._id,item.routeId.routestops.stops,date);
            passenger_total = await Booking.totalPassengers( item.routeId._id,date);
   
            return {
                assignId: item._id,
                status: item.status,
                passenger_total,
                date,
                time: moment(item.timetables.time).tz('Asia/kolkata').format('hh:mm A'),
                assistants: (item.assistantId) ? item.assistantId : [{}],
                routeId: item.routeId._id,
                route_name: item.routeId.title,
                trip_status: item.trip_status,
                bus_model_no:item.timetables.busId.model_no,
                bus_reg_no:item.timetables.busId.reg_no,
                // bus_model_no:item.busId.model_no,
                // bus_reg_no:item.busId.reg_no,
                stops : _.sortBy(stops, ['order'],['asc'])
              
                 // passenger_count:passenger_count

                // routeId: item.ticketId.routeId,
                // ticketId: item.ticketId._id,
                // ticket_name: item.ticketId.name,
                // ticket_start_at: item.ticketId.start_at,
                // ticket_end_at: item.ticketId.end_at,
                // ticket_total_seat_count: item.ticketId.seat_count,
                // ticket_total_seat_remain: item.ticketId.seat_remain,
                // ticket_total_seat_booked: item.ticketId.seat_booked,
                // ticket_status: item.ticketId.status,
                //  routestops: item.ticketId.routestops.stops,
            }
    },
};

module.exports = mongoose.model("BookingAssign", bookingAsignSchema);