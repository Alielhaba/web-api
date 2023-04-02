const mongoose = require("mongoose");
const moment = require("moment-timezone");

/**
 * Bus type Schema
 * @private
 */
const busTypeSchema = new mongoose.Schema(
  {
    name: {type: String,required:true,uppercase: true,index: true},
    status: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);


busTypeSchema.method({
  transform() {
    const transformed = {};
    const fields = ['id', 'name','status'];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
});


busTypeSchema.statics = {
  transformOptions: (data) => {
    const selectableItems = [];
    const i = 1;
    data.forEach((item) => {
      selectableItems.push({
        value:item._id,
        text:item.name
      });
    });
    return selectableItems;
    
  },
  transformData: (data) => {
    const selectableItems = [];
    let i = 1;
    data.forEach((item) => {
      selectableItems.push({
        id:i++,
        ids: item.id,
        name: item.name,
        status: item.status == true ? "Active" : "Inactive",
        createdAt: moment.utc(item.createdAt).tz("Asia/Kolkata").format("DD MMM YYYY"),
      });
    });
    return selectableItems;
  },
};


module.exports = mongoose.model("Bus_Type", busTypeSchema);
