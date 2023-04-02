const mongoose = require('mongoose');
const moment = require('moment-timezone');
const routeUtils = require('../utils/route.utils')

/**
 * Bus layout Schema
 * @private
 */
const busLayoutSchema = new mongoose.Schema({
    name: {
        type: String,
        index: true,
    },
    max_seats: {
      type: String,
      index: true,
      default: '',
    },
    layout:{
      type:String,
      index:true,
      default:''
    },
    combine_seats:{
      type:[Object],
      default:{}
    },
    seat_numbers:{
      type:String,
      index:true,
      default:'',
    },
    last_seat:{
      type:String,
      default:''
    },
    status: { type: Boolean, default: true },
}, {
    timestamps: true,
});

busLayoutSchema.method({
  transform() {
    const transformed = {};
    const fields = ['id', 'name','layout','max_seats','last_seat','combine_seats','seat_numbers','status'];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
});

busLayoutSchema.statics = {
  /**
   * List users in descending order of 'createdAt' timestamp.
   *
   * @param {number} skip - Number of users to be skipped.
   * @param {number} limit - Limit number of users to be returned.
   * @returns {Promise<User[]>}
   */
   transformOptions(data){
    const selectableItems = [];
    const i = 1;
    data.forEach((item) => {
      selectableItems.push({
        value:item._id,
        text:item.name + ' - ' +this.layoutName(item.layout)
      });
    });
    return selectableItems;
   },
    async transformData(routeId,busId,item,currentDate,endDate) {
     return {
        id: item.id,
        max_seats:item.max_seats,
        layout:this.layoutName(item.layout),
       //last_seat: item.last_seat,
      //seat_numbers: item.seat_numbers,
      name: item.name,
      combine_seats: await routeUtils.checkSeatAvailablity(routeId,busId,item.seat_numbers,item.combine_seats,currentDate,endDate), //item.combine_seats 

      }
  },
  layoutName(name){
      if(name == 'layout-1'){
      return '1 X 1';
    }else if(name == 'layout-2'){
      return '1 X 2';
    }else if(name == 'layout-3'){
      return '2 X 1';
    }else if(name == 'layout-4'){
      return '2 X 2';
    }else if(name == 'layout-5'){
      return '2 X 3';
    }else if(name == 'layout-6'){
      return '3 X 2';
    }
  }

}






module.exports = mongoose.model('Bus_Layout', busLayoutSchema);
