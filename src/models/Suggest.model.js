const mongoose = require("mongoose");
const { Schema } = mongoose;
const { ObjectId } = Schema;
const moment = require("moment-timezone");

const SuggestSchema = new mongoose.Schema(
  {
    pickup:{
        address:{type:String, default: "", index: true,required:true},
        coordinates: [Number],
		city:{type:String,index:true},
		state:{type:String,index:true}
    },
    drop:{
        address:{type:String, default: "", index: true,required:true},
        coordinates: [Number],
		city:{type:String,index:true},
		state:{type:String,index:true}
    },
    userId: { type: ObjectId, ref: "UserId", required: true },

  },
 { timestamps: true })


SuggestSchema.statics = {
    async create(data) {
        try{
            const obj = {
                userId: data.userId,
                pickup:{
                    address:data.pickup_address,
                    coordinates:[parseFloat(data.pickup_lng),parseFloat(data.pickup_lat)],
					city:data.pickup_city,
					state:data.pickup_state
                },
                drop:{
                    address:data.drop_address,
                    coordinates:[parseFloat(data.drop_lng),parseFloat(data.drop_lat)],
					city:data.drop_city,
					state:data.drop_state
                },
			
              };
              return await new this(obj).save();
        }catch(err){
            console.log("err",err)
            return false;
        }
    },
}

module.exports = mongoose.model("Suggest", SuggestSchema);
