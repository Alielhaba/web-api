const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const timezoneHelpers = require('../helpers/timezone');
var Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const moment = require("moment-timezone");


const PaymentSchema = new mongoose.Schema({
    bookingId: {
        type: [ObjectId],
        ref: "Booking",
	default:null
    },
    bookingLogId: {
        type: ObjectId,
        ref: "Booking_log",
	default:null
    },
    walletId: {
        type: ObjectId,
        ref: "Wallet"
    },
    userId: {
        type: ObjectId,
        ref: "User"
    },
    title:{type:String,default:""},
    type:{type:Number,default:1}, // 0 credit 1 debit
    is_deleted:{type: Boolean, default: false},
    ferriOrderId:{type: String,default:''},
    orderId: {type: String,required: true,index:true},
    paymentId: {type: String,default:''},
    payment_signature: {type: String,default:''},
    passId: { type: mongoose.Schema.Types.ObjectId, ref: "Pass", default: null },
    is_pass:{type:Boolean,default:false,index:true},
    total_pass_amount:{type:Number,default:0},
    payment_status: {type: String,enum: ["Cancelled","Pending", "Completed","Processing","Failed","Refunded"],default: "Processing",index:true },
    payment_created:{type: Number,default:''},
    amount:{type:String,default:""},
    payment_details: { type: Object, default: {}},
    method: { type: String, default: "" },
    // tax: {type: Number,index:true},
    // fare: {type: Number,index:true},amount: {type: Number,index:true},
    // minimum_fare: {type: Number,index:true},
    // price_per_km: {type: Number,index:true}
}, { timestamps: true });


PaymentSchema.statics = {
  async create(data) {

       var  obj = {
      bookingId: data.bookingId,
      bookingLogId:data.bookingLogId,
      walletId: data.walletId,
      userId: data.userId,
      passId:data.passId ? mongoose.Types.ObjectId(data.passId) : null,
      orderId: data.orderId,
      ferriOrderId: data.ferriOrderId,
      payment_status: data.payment_status,
      method: data.method,
      is_pass:data.is_pass ? data.is_pass : false,
      total_pass_amount: data.total_pass_amount ? data.total_pass_amount : 0,
      amount:data.amount,
	  title:data.title,
	  type:data.type
    };

     if(await this.exists({orderId:data.orderId})){
	return await this.findOneAndUpdate({orderId:data.orderId},obj,{ new: true });
    }else{
	
      return await new this(obj).save();

    }
  
  },
  formattedData(data){
    const selectableItems = [];
    data.forEach((item) => {
      selectableItems.push({
     //   id: item._id,
        title:item.title,
        status:(item.type == 0) ? 'credit' : 'debit', 
        type:item.type,
        payment_status: item.payment_status,
        method: item.method,
        amount: item.amount,
        payment_created: moment(item.createdAt).tz('Asia/kolkata').format('DD MMM YYYY'),
      });
    });
    return selectableItems;
  }
};

module.exports = mongoose.model('Payment', PaymentSchema);