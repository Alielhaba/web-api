const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const bcrypt = require('bcryptjs');
const timezoneHelpers = require('../helpers/timezone');
const moment = require('moment-timezone');


const UserSchema = new mongoose.Schema({
    firstname: {
        type: String,
    default:
        ''
    },
    lastname: {
        type: String,
    default:
        ''
    },
    gender: {
        type: String,
    default:
        ''
    },
    email: {
        type: String,
        trim: true,
    default:
        '',
    },
    phone: {
        type: String,
        trim: true,
        unique: true,
    default:
        ''
    },
    password: {
        type: String,
        minlength: 8,
    },
    otp: {
        type: Number,
    default:
        0
    },
    device_token: {
        type: String,
    default:
        '',
        index: true
    },
    refercode: {
        type: String,
        trim: true,
        unique: true,
    },
    referedby: {
        type: String,
        trim: true,
    },
    mode: {
        type: String,
    default:
        ''
    },
    social_id: {
        type: String,
    default:
        ''
    },
    ProfilePic: {
        type: String
    },
	is_deleted:{type: Boolean, default: false},
     status:{type: Boolean, default: true},
    places: {
        home: {
            address: {
                type: String,
            default:
                "",
                index: true
            },
            type: {
                type: String,
            default:
                "Point"
            },
            coordinates: {
                type: [Number],
            default:
                []
            },
            timing: {
                type: Date,
            default:
                ''
            }
        },
        office: {
            address: {
                type: String,
            default:
                "",
                index: true
            },
            type: {
                type: String,
            default:
                "Point"
            },
            coordinates: {
                type: [Number],
            default:
                []
            },
            timing: {
                type: Date,
            default:
                ''
            }
        },
    },
}, {
    timestamps: true
});

UserSchema.virtual('wallets', {
    ref: 'Wallet', // the model to use
    localField: '_id', // find children where 'localField'
    foreignField: 'users', // is equal to foreignField
    justOne: true,
});

UserSchema.virtual("userreferrals", {
    ref: "User_Referral", // the model to use
    localField: "_id", // find children where 'localField'
    foreignField: "userId", // is equal to foreignField
    justOne: false,
});


UserSchema.plugin(uniqueValidator);

UserSchema.pre('save', function (next) {
    let user = this;

    if (!user.isModified('password')) {
        return next();
    }

    bcrypt
    .genSalt(12)
    .then((salt) => {
        return bcrypt.hash(user.password, salt);
    })
    .then((hash) => {
        user.password = hash;
        next();
    })
    .catch((err) => next(err));
});



UserSchema.statics.formatedData = function (user) {
    return {
        firstname: user.firstname,
        lastname: user.lastname,
        gender: user.gender,
        email: user.email,
        phone: user.phone,
        otp: user.otp,
        mode: user.mode,
        social_id: user.social_id,
        _id: user._id,
        refercode: user.refercode,
        ProfilePic: user.ProfilePic,
        home_address: (user.places.home.address) ? user.places.home.address : '',
        home_lat: (user.places.home.coordinates) ? user.places.home.coordinates[1] : 0.00,
        home_lng: (user.places.home.coordinates) ? user.places.home.coordinates[0] : 0.00,
		home_timing: (user.places.home.timing) ? moment(user.places.home.timing).tz('Asia/Kolkata').format('hh:mm a') : '',
        office_timing: (user.places.office.timing) ? moment(user.places.office.timing).tz('Asia/Kolkata').format('hh:mm a') : '',
        office_address: (user.places.office.address) ? user.places.office.address : '',
        office_lat: (user.places.office.coordinates) ? user.places.office.coordinates[1] : 0.00,
        office_lng: (user.places.office.coordinates) ? user.places.office.coordinates[0] : 0.00,
    }
}

module.exports = mongoose.model('User', UserSchema);
