const mongoose = require('mongoose');
var Schema = mongoose.Schema;
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const ObjectId = Schema.ObjectId;
const jwt = require('jsonwebtoken');


const SessionSchema = new mongoose.Schema({
    token: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    csrfToken: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    userId: {
        type: ObjectId,
        required: false,
        refPath: 'onModel'
    },
    phone: { type: String, default: '', index: true },
    walletId: {
        type: ObjectId,
        required: false,
        refPath: 'onModel'
    },
    expiresIn: { type: Number, index: true },
    onModel: {
        type: String,
        required: false,
        enum: ['User', 'Driver']
    },
    status: {
        type: String,
        enum: ['valid', 'expired'],
        default: 'valid',
    },
}, {
    timestamps: true
});

SessionSchema.plugin(uniqueValidator);

SessionSchema.statics.generateCsrf = function() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
            if (err) {
                reject(err);
            }
            const token = buf.toString('hex');
            resolve(token);
        });
    });
};


SessionSchema.statics.generateToken = function(userId, walletId, expiresIn) {
    let jwtToken = jwt.sign({
        walletId,
        userId
    }, process.env.JWT_SECRET, {
        expiresIn: expiresIn // "1h"
    });
    return jwtToken;
};
SessionSchema.statics.generateDriverToken = function(userId, expiresIn) {
    let jwtToken = jwt.sign({
        userId
    }, process.env.JWT_SECRET, {
        expiresIn: expiresIn // "1h"
    });
    return jwtToken;
};

SessionSchema.statics.verifyToken = function(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}


SessionSchema.statics.expireAllTokensForUser = function(userId) {
    return this.updateMany({ userId }, { $set: { status: 'expired' } });
};

SessionSchema.methods.expireToken = function() {
    const session = this;
    return session.update({ $set: { status: 'expired' } });
};

module.exports = mongoose.model('Session', SessionSchema);