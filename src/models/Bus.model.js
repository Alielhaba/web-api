const mongoose = require('mongoose');

/**
 * Bus Schema
 * @private
 */
const busSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true,
      },
      bustypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bus_Type",
        required: true,
      },
      buslayoutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "bus_layout"
      },
     code:{type:String,default:'B007'},
      name: {
        type: String,
        index: true,
        default: "",
      },
      reg_no: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
      },
      brand:{
        type:String,
        index:true,
        default:''
      },
      model_no:{
        type:String,
        index:true,
        default:'',
      },
      chassis_no:{
        type:String,
        index:true,
        default:'',
      },
      picture: {
        type: String,
      },
      amenities:{type:[String],default:'',index:true},
      certificate_registration: { type: String },
      certificate_pollution: { type: String },
      certificate_insurance: { type: String },
      certificate_fitness: { type: String },
      certificate_permit: { type: String },
      status: { type: Boolean, default: true },
}, {
    timestamps: true,
});


busSchema.virtual("buslayouts", {
  ref: "Bus_Layout", // the model to use
  localField: "buslayoutId", // find children where 'localField'
  foreignField: "_id", // is equal to foreignField
  justOne: true,
});





busSchema.method({
    transform() {
        const transformed = {};
        const fields = ['id', 'reg_no', 'max_seats', 'highlights', 'picture', 'certificate_registration', 'certificate_pollution', 'certification_insurance', 'certificate_fitness', 'certificate_permit', 'status', 'createdAt'];

        fields.forEach((field) => {
            transformed[field] = this[field];
        });

        return transformed;
    },

});

busSchema.statics = {
    list({
        page = 1,
        perPage = 30,
        firstname,
        lastname,
        email,
        role,
    }) {
        const options = omitBy({}, isNil);

        return this.find(options)
            .sort({ createdAt: -1 })
            .skip(perPage * (page - 1))
            .limit(perPage)
            .exec();
    },
    transformdata(data){
      return{
          id: data.id,
          bus_name: data.name,
        bus_brand:data.brand,
        bus_model_no: data.model_no,
        bus_amenities : data.amenities,
        bus_type : data.bustypeId.name,
        bus_reg_no :data.reg_no,
        buslayoutId:data.buslayoutId
      }

    }
}

module.exports = mongoose.model('Bus', busSchema);