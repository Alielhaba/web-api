const mongoose = require("mongoose");
const { omitBy, isNil } = require("lodash");

const { Schema } = mongoose;

const { ObjectId } = Schema;

const RouteDetailSchema = new Schema({
    routeId: { type: ObjectId, ref: "Route", required: true },
    locationId: { type: ObjectId, ref: "Location", required: true },
    duration_pickup: { type: String },
    duration_drop: { type: String },
    minimum_fare_pickup: { type: String },
    minimum_fare_drop: { type: String },
    price_per_km_pickup: { type: String },
    price_per_km_drop: { type: String },
}, { timestamps: true });

RouteDetailSchema.statics = {
    updateRouteDetail(dataObj, routeId) {
        dataObj.forEach(async(item) => {
            const objUpdate = {
                locationId: item.locationId,
                duration_pickup: item.duration_pickup,
                duration_drop: item.duration_drop,
                minimum_fare_pickup: item.minimum_fare_pickup,
                minimum_fare_drop: item.minimum_fare_drop,
                price_per_km_pickup: item.price_per_km_pickup,
                price_per_km_drop: item.price_per_km_drop
            };

            return await this.updateOne({ routeId, _id: item._id }, {
                $set: objUpdate,
            }, {
                new: true,
            })

        })
    },
    routeDetailFormatData(data, routeId) {
        const selectableItems = [];
        data.forEach((item) => {
            selectableItems.push({
                routeId: routeId,
                locationId: item.locationId,
                duration_pickup: item.duration_pickup,
                duration_drop: item.duration_drop,
                minimum_fare_pickup: item.minimum_fare_pickup,
                minimum_fare_drop: item.minimum_fare_drop,
                price_per_km_pickup: item.price_per_km_pickup,
                price_per_km_drop: item.price_per_km_drop
            });
        });
        return selectableItems;
    },
};
module.exports = mongoose.model("RouteDetail", RouteDetailSchema, "routedetails");