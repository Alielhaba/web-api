const mongoose = require("mongoose");
const { Schema } = mongoose;
//const moment = require("moment-timezone");
const { ObjectId } = Schema;


const ticketSchema = new Schema({
    busId: { type: ObjectId, ref: "Bus", required: true },
    seat_count: { type: String, index: true, default: "0" },
}, {
    timestamps: true,
});


ticketSchema.virtual("bookings", {
    ref: "Booking", // the model to use
    localField: "_id", // find children where 'localField'
    foreignField: "ticketId", // is equal to foreignField
    justOne: false,
});




ticketSchema.statics = {
    async fetch(busId) {
        try {
            const findTicket = await this.findOne({ busId: busId });
            if (findTicket) {
                return findTicket;
            }
        } catch (err) {
            console.log("err", err);
            return 'err while' + err;
        }
    },
    async create(busId, seat_count) {
        try {
            if (!(await this.exists({ busId }))) {
                const Obj = {
                    busId,
                    seat_count
                };
                const saveData = await new this(Obj).save();
                return saveData._id;
            } else {
                const getData = await this.findOne({ busId }, "_id");
                return getData._id;
            }
        } catch (err) {
            console.log("err", err);
            return 'err while' + err;
        }
    },
    async update(busId, seat_count) {
        try {
            const findTicket = await this.findOne({ busId: busId });
            if (findTicket) {
                return await this.updateOne({ _id: findTicket._id }, { seat_count });
            }
        } catch (err) {
            return 'err while' + err;
        }
    },
    async remove(busId) {
        try {
            const findTicket = await this.findOne({ busId: busId });
            if (findTicket) {
                return await this.deleteOne({ _id: findTicket._id });
            }
        } catch (err) {
            return 'err while' + err;
        }
    }
};

module.exports = mongoose.model("Ticket", ticketSchema);