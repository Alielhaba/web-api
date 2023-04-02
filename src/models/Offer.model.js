const mongoose = require('mongoose');
const { omitBy, isNil } = require('lodash');
const { Schema } = mongoose;
const moment = require('moment-timezone');
const objectIdToTimestamp = require('objectid-to-timestamp');
const { ObjectId } = Schema;

const OfferSchema = new Schema({
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    name: { type: String, required: true, index: true },
    start_date: { type: Date, required: true, index: true },
    end_date: { type: Date, required: true, index: true },
    code: { type: String, required: true, index: true },
    discount: { type: String, required: true, index: true },
    attempt: { type: Number , index: true},
    upto: { type: Number },
    flat: { type: Boolean, required: true },
	picture: { type: String, default: "" },
    terms: { type: String, required: true },
    status: { type: Boolean, default: true }
}, { timestamps: true }, );


OfferSchema.method({
    transform() {
        const transformed = {};
        const fields = ['id', 'routeId','picture','attempt' ,'name', 'start_date', 'end_date', 'code', 'discount', 'upto', 'flat', 'terms', 'status', 'createdAt'];

        fields.forEach((field) => {
            transformed[field] = this[field];
        });

        return transformed;
    },

});

// OfferSchema.virtual('routedetails', {
//   ref: 'RouteDetail', // the model to use
//   localField: '_id', // find children where 'localField'
//   foreignField: 'routeId', // is equal to foreignField
//   justOne: false,
// });



OfferSchema.statics = {
    transformData(rows) {
        const selectableItems = [];
        let i = 1;
        rows.forEach((item) => {
            selectableItems.push({
                id: i++,
                ids: item.id,
                routeId: item.routeId,
                name: item.name,
                start_date: moment.utc(item.start_date).tz("Asia/Kolkata").format("DD MMM YYYY"),
                end_date: moment.utc(item.end_date).tz("Asia/Kolkata").format("DD MMM YYYY"),
                code: item.code,
                discount: item.discount,
                attempt: item.attempt,
                flat: item.flat,
                terms: item.terms,
				picture:item.picture,
                status: item.is_active == true ? "Inactive" : "Active",
                createdAt: moment.utc(item.createdAt).tz("Asia/Kolkata").format("DD MMM YYYY"),
            });
        });
        return selectableItems;
    },
    list({
        page = 1,
        perPage = 30,
        title
    }) {
        const options = omitBy({}, isNil);

        return this.find(options)
            .sort({ createdAt: -1 })
            .skip(perPage * (page - 1))
            .limit(perPage)
            .exec();
    },
  async check(code,routeId) {
    try {
      let route = objectIdToTimestamp(routeId);
      const current_date = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
      const validOffer = await this.findOne({
        code,
        start_date: { $lte: new Date(current_date) },
        end_date: { $gte: new Date(current_date) },
        status:true
      });
     // console.log("validOffer",validOffer,'current_date',current_date);
      if (validOffer && validOffer.routeId === null) {
        return true;
      }else if(validOffer && objectIdToTimestamp(validOffer.routeId) == route){
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.log("ewrer", err);
      return "err while : " + err;
    }
  },
}



module.exports = mongoose.model('Offer', OfferSchema);