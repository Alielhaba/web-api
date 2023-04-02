var mongoose = require("mongoose");
var bcrypt = require("bcrypt");
var Schema = mongoose.Schema;
const timezoneHelpers = require('../helpers/timezone');
const ObjectId = Schema.ObjectId;
const mongoosePaginate = require('mongoose-paginate-v2');


var AgentSchema = new Schema({
    title: { type: String, default: "Mr.", enum: ["Mr.", "Mrs.", "Dr.", "Prof.", "Rev.", "Other"] },
    firstname: { type: String, required: [true, 'first name required'], },
    lastname: { type: String, required: [true, 'last name required'] },
    phone: { type: Number, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    company: { type: String, required: [true, 'company name required'] },
    address1: { type: String, default: "" },
    address2: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },
    agent_commission: { type: Number, default: 0 },
    ip: { type: String },
    last_login: { type: Date, default: timezoneHelpers.defaultTimeZone() },
    isApproved: { type: Boolean, default: false }
},
    { timestamps: true }
);

AgentSchema.plugin(mongoosePaginate);

AgentSchema.methods.encryptPassword = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
}

AgentSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password)
};





module.exports = mongoose.model("Agent", AgentSchema);