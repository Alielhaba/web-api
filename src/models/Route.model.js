const mongoose = require('mongoose');
const { omitBy, isNil } = require('lodash');
const mongoosePaginate = require('mongoose-paginate-v2');
const { Schema } = mongoose;
const moment = require('moment-timezone');

const { ObjectId } = Schema;



const RouteSchema = new Schema({
    locationId: { type: ObjectId, ref: 'Location', required: true },
    title: { type: String, required: true },
    busId: { type: ObjectId, ref: 'Bus', required: true },
    status: { type: Boolean, default: true }
}, { timestamps: true }, );




RouteSchema.method({
    transform() {
        const transformed = {};
        const fields = ['id', 'title', 'status', 'createdAt'];

        fields.forEach((field) => {
            transformed[field] = this[field];
        });

        return transformed;
    },

});

RouteSchema.virtual('routedetails', {
    ref: 'RouteDetail', // the model to use
    localField: '_id', // find children where 'localField'
    foreignField: 'routeId', // is equal to foreignField
    justOne: false,
});

RouteSchema.virtual("routestops", {
    ref: "Route_Stop", // the model to use
    localField: "_id", // find children where 'localField'
    foreignField: "routeId", // is equal to foreignField
    justOne: true,
});





RouteSchema.set('toObject', { virtual: true });
RouteSchema.set('toJSON', { virtual: true });


RouteSchema.statics = {
    transformData(rows) {
        const selectableItems = [];
        let i = 1;
        rows.forEach((item) => {
            selectableItems.push({
                id: i++,
                ids: item.id,
                title: item.title,
                busname: item.busId.name,
                location_name: item.locationId.name,
                location_type: item.locationId.type,
                status: item.is_active == true ? "Active" : "Inactive",
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
    transformData(data) {
        const selectableItems = [];
        data.forEach((item) => {
          selectableItems.push({
            id: item._id,
            location_address: item.location.address,
            location_latitude: item.location.coordinates[1],
            location_longitude: item.location.coordinates[0],
            city: item.city,
            state: item.state,
          });
        });
        return selectableItems;
    },
}


RouteSchema.plugin(mongoosePaginate);


module.exports = mongoose.model('Route', RouteSchema);