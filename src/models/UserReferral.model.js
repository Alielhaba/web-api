const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema;
const { User, Setting } = require("../models")
const moment = require("moment-timezone");



const UserReferralSchema = new mongoose.Schema({
    userId: { type: ObjectId, ref: "User", required: true },
    refferalId: { type: ObjectId, ref: "User", required: true },
    user_type: { type: String, default: 'Customer', index: true },
    start_date: { type: Date, index: true },
    end_date: { type: Date, index: true },
    days: { type: Number, index: true },
    trips: { type: Number, index: true, default: 0, index: true },
    amount: { type: String, index: true },
    pending_amount: { type: String, index: true },
    payment_status: {
        type: String,
        enum: ["Pending", "Completed"],
        default: "Pending",
        index: true
    }
}, { timestamps: true });



UserReferralSchema.statics = {
   async totalRefAmount(userId){
        try{
            let amount = '0';
            let currentDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
            if(await this.findOne({ userId:userId })){
                const getRefData = await this.find({
                    userId,
                    payment_status:"Completed",
                    start_date:{$lte: new Date(currentDate)},
                    end_date:{$gte:new Date(currentDate)}
                }).select("amount").lean();

                if(getRefData.length > 0){
                    amount = this.getSum(getRefData,"amount");
                    return amount;
                }
            }
            return amount;
        } catch (err) {
            return err;
        }
    },
    getSum(array, column) {
        console.log("array", array.length)
        if (array.length > 0) {
            let values = array.map((item) => parseInt(item[column]) || 0)
            return values.reduce((a, b) => a + b).toString()
        }
        return '0';
    },
    async create(userId, reffby, refsetting) {
        try {
            const referalUserExists = await User.findOne({ refercode: { $eq: reffby } });
            if (referalUserExists) {
                let refferalId = referalUserExists._id; // refferal user ID
                if (!await this.findOne({ userId, refferalId })) {
                    var date = new Date();
                    const noofday = refsetting.filter((o) => o.name == 'number_of_days');
                    const refamount = refsetting.filter((o) => o.name == 'referral_amount');
                    let day = noofday[0].value; //30;
                    let amount = refamount[0].value; //100;
                    let expDate = date.setDate(date.getDate() + day);
                    const objData = {
                        amount: 100,
                        start_date: new Date(),
                        end_date: expDate,
                        days: day,
                        amount: amount,
                        pending_amount: amount,
                        refferalId,
                        userId,
                        payment_status: 'Completed'
                    };
                    var userefferal = new this(objData);
                    return  await userefferal.save();
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (err) {
            return err;
        }
    }
}

module.exports = mongoose.model("User_Referral", UserReferralSchema);