const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const timezoneHelpers = require('../helpers/timezone');
var Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;


const CreditSchema = new mongoose.Schema({
    amount: {
        type: Number,
    },
    date_of_reg: {
        type: Date
    },
    date_of_exp: {
        type: Date
    },
    referedto: {
        type: ObjectId,
        ref: "User"
    },
	    is_deleted:{type: Boolean, default: false},
    status: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const WalletSchema = new mongoose.Schema({
    users: { type: ObjectId, ref: "User", required: true },
    refercode: {
        type: String,
        trim: true,
        unique: true,
    },
    amount: {
        type: Number,
        default: 0
    },
	   type:{type:String,default:''},
    credit: [CreditSchema]
}, { timestamps: true });




WalletSchema.statics.updateReferAmount = async (amount,date,reffby,referFrom) =>{
    try{
        console.log('amount,date,reffby,referFrom',amount,date,reffby,referFrom)
        const newcredit = { amount: amount,status: false, date_of_reg: new Date(), date_of_exp: date, referedto: referFrom };
        console.log('cref',newcredit,await this.exists({ refercode:reffby}))
        if(await this.exists({ refercode:reffby})){
            const cref = await this.updateOne( { refercode:reffby },{ $push: { credit: [newcredit] } });
            console.log('crefdata',cref)
            return cref;
        }
      
    }catch(err){
        return err;
    }

}

module.exports = mongoose.model('Wallet', WalletSchema);