const Utils = require("../utils/utils");
const driverService = require("../services/driver.service");
const { Driver, Booking, Session } = require("../models")

module.exports = {
    register: async(req, res) => {
        try {
            const {
                phone
            } = req.body;
               const userExist = await Driver.findOne({
                phone: phone,
            });
            if (!userExist) {
                res.status(200).json({
                    title: "Driver login failed",
                    status: false,
                    message: "Driver not found",
                });
            } else {
                const otp = await Utils.generatingOTP(999, 1000); // generate OTP
                await Utils.sendOTPTextLocal(userExist.phone, otp) // send otp via textlocal
                const updateuser = await Driver.findOneAndUpdate({
                    phone: userExist.phone
                }, {
                    otp
                }, {
                    new: true
                });
                const userId = userExist._id;

                const session = await Utils.initSession(phone, userId, '', "Driver");
                res.status(200).json({
                    message: "Driver login Successful",
                    status: true,
                    flag: 1,
                    otp: updateuser.otp,
                    baseurl: process.env.BASE_URL,
                    userDetail: updateuser.transform(),
                    csrfToken: session.csrfToken,
                    token: session.token,
                });
            }
        } catch (err) {
            res.status(200).json({
                status: false,
                title: "Login Error",
                message: "Something went wrong during registration process.",
                errorMessage: err.message,
            });
        }
    },
    refresh: async(req, res) => {
        try {
            const {
                phone,
                csrfToken,
                onModel
            } = req.body;
            const session = await Utils.refreshDriverToken(phone, csrfToken, onModel);
			if(session){
					      res.status(200).json({
                status: true,
                message: "token updated successfully.",
                data: {
                    token: session.token,
                    csrfToken: session.csrfToken,
                },
				});
			}else{
				res.status(200).json({
                status: false,
                message: "csrf Token or phone is not valid.",
				});
				
			}
      
        } catch (err) {
            res.status(400).json({
                status: false,
                title: "Error while",
                message: "Something went wrong during refresh token.",
                errorMessage: err,
            });
        }
    },
    verifyOTP: async function (req, res) {
        try {
            const {
                otp,
                device_token
            } = req.body;
            const {
                userId
            } = req.session;
            const getUser = await driverService.verifyOTPExists(
                    userId,
                    parseInt(otp));
            if (getUser) {
                await driverService.updateOne(userId, device_token);
                res.json({
                    status: true,
                    message: "OTP verify successful",
                });
            } else {
                res.json({
                    status: false,
                    message: "OTP not matched.",
                });
            }
        } catch (err) {
            res.status(401).json({
                message: "Invalid OTP",
                status: false,
                errorMessage: err.message,
            });
        }
    },
    reSendOTP: async(req, res) => {
        try {
            const {
                phone
            } = req.body;
            const {
                userId
            } = req.session;
            const userExist = await Driver.exists({
                phone: phone,
            });

            if (userExist) {
                const otp = await Utils.generatingOTP(999, 1000); // generate OTP
                await Utils.sendOTPTextLocal(phone, otp) // send otp via textlocal
                const updateuser = await Driver.findOneAndUpdate({
                    phone: phone
                }, {
                    otp
                }, {
                    new: true
                });

                res.status(200).json({
                    message: "resend OTP Successful.",
                    status: true,
                    otp: updateuser.otp,
                });

            } else {
                res.json({
                    status: false,
                    message: "phone number not exists.",
                });
            }

        } catch (err) {
            res.status(401).json({
                message: "Invalid OTP",
                status: false,
                errorMessage: err.message,
            });
        }
    },
    getDriver: async(req, res) => {
        try {
            const {
                userId
            } = req.session;
            console.log(userId);
            const userExist = await Driver.findOne({
                _id: userId
            });
            res.status(200).json({
                status: true,
                message: "Driver found",
                data: userExist.transform(),
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: "Cannot find driver",
                errorMessage: err.message,
            });
        }
    },
    updateDriver: async(req, res) => {
        try {
            const {
                firstname,
                lastname,
                email,
                phone
            } = req.body;
            const {
                userId
            } = req.session;
            const driverexists = await Driver.findOne({
                _id: userId
            });
            if (driverexists) {
                const objUpdate = {
                    firstname: firstname,
                    lastname: lastname,
                    email: email,
                    phone: phone,

                };
                const updatedriver = await Driver.findByIdAndUpdate(
                        userId, {
                    $set: objUpdate,
                }, {
                    new: true,
                });
                res.status(200).json({
                    status: true,
                    message: "Driver updated",
                    data: updatedriver.transform(),
                });

            } else {
                res.status(200).json({
                    status: false,
                    message: "Driver not found.",
                });
            }

        } catch (err) {
            res.status(401).json({
                status: false,
                message: "Cannot update driver",
                errorMessage: err.message,
            });
        }
    },
    logout: async(req, res) => {
        try {
            const requestData = req.session;
            await Utils.verifyToken(requestData.token);
            res.json({
                message: "Logout Successful",
                status: true,
                detail: "Successfuly expired login session",
            });
        } catch (err) {
            res.status(400).json({
                status: false,
                message: "Logout Failed",
                detail: "Something went wrong during the logout process.",
                errorMessage: err.message,
            });
        }
    },
    notification: async(req, res) => {
        try {
            const requestData = req.session;
            const getNotify = await driverService.getNotifications(requestData.userId);
            res.json({
                message: "Notification fetch Successful",
                status: true,
                data: getNotify,
            });
        } catch (err) {
            res.status(400).json({
                status: false,
                message: "Logout Failed",
                detail: "Something went wrong during the logout process.",
                errorMessage: err.message,
            });
        }
    },
    updateNotification: async(req, res) => {
        try {
            const result = await driverService.updateNotifications(req.params.notifyId, req.params.read);
            if (result.n > 0) {
                res.json({
                    message: "Notification update Successful",
                    status: true,
                });
            } else {
                res.json({
                    message: "Notification failed",
                    status: false,
                });
            }
        } catch (err) {
            res.status(400).json({
                status: false,
                message: "Logout Failed",
                detail: "Something went wrong during the logout process.",
                errorMessage: err.message,
            });
        }
    },
    passengerList: async(req, res) => {
        try {
            const busId = req.body.busId;
            const booking = await Booking.find({
                busId: busId
            })
                .populate("passengerdetails")
                .lean();
            var passengers = [];
            booking.forEach((data) => {
                var pass = [];
                // passengers.push(data.passengerdetails);
                data.passengerdetails.forEach((item) => {
                    // console.log(item.fullname);
                    pass.push({
                        fullname: item.fullname,
                        seat: item.seat,
                    });
                });
                passengers.push(pass);
            });
            res.status(200).json({
                status: true,
                message: "Passenger List Found",
                data: passengers,
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: "Could not find passenger list",
                ErrorMessage: err.message,
            });
        }
    },
};
