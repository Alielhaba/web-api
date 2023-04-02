const mongoose = require("mongoose");
const { omitBy, isNil } = require("lodash");
const mongoosePaginate = require("mongoose-paginate-v2");
const { Schema } = mongoose;
const moment = require("moment-timezone");
const { ObjectId } = Schema;


const PassSchema = new Schema(
  {
    no_of_rides: { type: Number, index: true },
    no_of_valid_days: { type: String, index: true },
    price_per_km: { type: String, index: true },
    discount: { type: String, index: true },
    description: { type: String, index: true },
    terms: { type: String, index: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PassSchema.method({
  transform() {
    const transformed = {};
    const fields = [
      "id",
      "no_of_rides",
      "no_of_valid_days",
      "price_per_km",
      "discount",
      "terms",
      "description",
      "status",
      "createdAt",
    ];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
});

PassSchema.statics = {
  transformData(rows) {
    console.log("rows", rows);
    const selectableItems = [];
    let i = 1;
    rows.forEach((item) => {
      selectableItems.push({
        id: i++,
        ids: item._id,
        no_of_rides: item.no_of_rides,
        no_of_valid_days: item.no_of_valid_days,
        price_per_km: item.price_per_km,
        discount: item.discount,
        terms: item.terms,
        description: item.description,
        status: item.status == true ? "Active" : "Inactive",
        createdAt: moment
          .utc(item.createdAt)
          .tz("Asia/Kolkata")
          .format("DD MMM YYYY"),
      });
    });
    return selectableItems;
  },
  // list({
  //     page = 1,
  //     perPage = 30,
  //     title
  // }) {
  //     const options = omitBy({}, isNil);
  //     return this.find(options)
  //         .sort({ createdAt: -1 })
  //         .skip(perPage * (page - 1))
  //         .limit(perPage)
  //         .exec();
  // },
};

PassSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Pass", PassSchema);
