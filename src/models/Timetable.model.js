const mongoose = require('mongoose');
const { omitBy, isNil } = require('lodash');
const { Schema } = mongoose;
const moment = require('moment-timezone');

const { ObjectId } = Schema;

const routines = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const timeTableSchema = new Schema(
  {
    locationId: { type: ObjectId, ref: 'Location', required: true },
    routeId: { type: ObjectId, ref: 'Route', required: true },
    busId: { type: ObjectId, ref: 'Bus' },
    direction:{type: String, required: true},
    every:{ type: [String],enum:routines},
        time_sec:{type:Number,default:0},
    time: {type: String, required: true},
    start_date:{type:Date,default:''},
    end_date:{type:Date,default:''},
    status: { type: Boolean, default: true }
  },
  { timestamps: true },
);


timeTableSchema.virtual('routedetails', {
  ref: 'RouteDetail', // the model to use
  localField: 'routeId', // find children where 'localField'
  foreignField: 'routeId', // is equal to foreignField
  justOne: false,
});


timeTableSchema.method({
  transform() {
    const transformed = {};
    const fields = ['id', 'direction', 'day', 'time','start_date','end_date', 'status', 'createdAt'];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
  
});




timeTableSchema.statics = {
  async transFormSingleData(row){
    try{
      return{
        id:row.id,
        every:row.every,
        direction:row.direction,
        time:row.time,
        start_date:row.start_date,
        end_date:row.end_date,
        location:row.locationId,
        locationId:row.locationId._id,
        routeId: row.routeId,
        routes: await Route.get(row.routeId),
        status: row.status,
      }
    }catch(err){
      console.log('err',err)
      return err;
    }
 
  },
  transformData(rows){
    const selectableItems = [];
    let i = 1;
    rows.forEach((item) => {
      selectableItems.push({
        id:i++,
        ids: item.id,
        direction:item.direction,
        time: moment.utc(item.time).tz("Asia/Kolkata").format("HH:MM A"),
        location_name: (item.locationId) ? item.locationId.title : '',
        locationId: (item.locationId) ? item.locationId._id : '',
        route_name: (item.routeId) ? item.routeId.title : '',
        routeId: (item.locationId) ? item.routeId._id : '',
        status: item.status == true ? "Active" : "Inactive",
        createdAt: moment.utc(item.createdAt).tz("Asia/Kolkata").format("DD MMM YYYY"),
      });
    });
    return selectableItems;

  },
}


module.exports = mongoose.model('Timetable', timeTableSchema);
