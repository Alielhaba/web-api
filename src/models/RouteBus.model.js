const mongoose = require('mongoose');
const { omitBy, isNil } = require('lodash');
const { Schema } = mongoose;
const moment = require('moment-timezone');

const { ObjectId } = Schema;

const routines = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const RouteBusSchema = new Schema(
  {
    busId: { type: ObjectId, ref: 'Bus', required: true },
    routeId: { type: ObjectId, ref: 'Route', required: true },
    every:{ type: [String],enum:routines,index:true},
    time: {type: Date, required: true,index:true},
    start_date:{type:Date,default:'',index:true},
    end_date:{type:Date,default:'',index:true},
    status: { type: Boolean, default: true },
    departure_time:{ type: Date, default: "", index: true },
    arrival_time:{ type: Date, default: "", index: true },
  },
  { timestamps: true },
);



module.exports = mongoose.model('Route_Bus', RouteBusSchema);
