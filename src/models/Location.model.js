const mongoose = require("mongoose");
/**
 * Location Schema
 * @private
 */
const locationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      index: true,
      trim: true,
    },
    type: { type: String, default: "" },
    location: {
      type: { type: String, default: "Point" },
      address: { type: String, default: "" },
      coordinates: [Number],
      title:{type:String,default:''}
    },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    status: { type: Boolean, default: true },
    files: { type: [Object] }
  },
  {
    timestamps: true,
  }
);

locationSchema.index({ location: "2dsphere" });

locationSchema.statics = {
  transformData(data) {
    const selectableItems = [];
    data.forEach((item) => {
      selectableItems.push({
        id: item.id,
        title:item.title,
        location_address: item.location.address,
        location_latitude: item.location.coordinates[1],
        location_longitude: item.location.coordinates[0],
        city: item.city ? item.city : '',
        state: item.state ? item.state : '',
	type:"location"
      });
    });
    return selectableItems;
  },
  transformFile(data) {
        const selectableItems = [];
        if (data.length > 0) {
            data.forEach((item) => {
                selectableItems.push({
                    path: item.path
                });
            });
            return selectableItems;
        }
        return []
    }
};

module.exports = mongoose.model("Location", locationSchema);
