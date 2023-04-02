const {
    User,
    Booking,
    Wallet,
    Session,
    Payment,
    Location,
    UserReferral,
    Setting,
} = require('../models');
const userService = require('../services/user.service')
    const Utils = require('../utils/utils');
const bcrypt = require('bcrypt');
const UniqueString = require('unique-string');
const Helper = require('../models/Helper.model')
    const nodeMailer = require('nodemailer');
    const objectIdToTimestamp = require('objectid-to-timestamp');
const momenttz = require('moment-timezone');
const Razorpay = require("razorpay");
const crypto = require("crypto");

const qr = require('qr-image');
const { user } = require("../notifications");
const {nanoid} = require('nanoid');

module.exports = {
    register: async(req, res) => {
        try {
            const {
                phone
            } = req.body;
            const otp = await Utils.generatingOTP(999, 1000);
            const userExist = await User.exists({
                phone: phone
            });
            if (!userExist) {
                const refercode = Utils.referCode(6, phone);
                const user = new User({
                    phone: phone,
                    otp,
                    refercode
                });
                const persistedUser = await user.save();
                const userId = persistedUser._id;

                const amount = 0;
                const wallet = new Wallet({
                    users: user._id,
                    refercode,
                    amount
                });
                const persistedWallet = await wallet.save();
                const walletId = persistedWallet._id;

                const session = await Utils.initSession(phone, userId, walletId, 'User');
                await Utils.sendOTPTextLocal(phone, otp) // send otp via textlocal
                res
                .status(200)
                .json({
                    title: 'User Registration Successful',
                    status: true,
                    otp: otp,
                    flag: 0,
                    userDetail: User.formatedData(persistedUser),
                    csrfToken: session.csrfToken,
                    token: session.token,
                });
            } else {

                if (await User.exists({
                        phone: phone
                    })) {
                    const getUser = await User.findOne({
                        phone: phone
                    });
                    const getWallet = await Wallet.findOne({
                        users: getUser._id
                    });

                    const updateuser = await User.updateOne({
                        phone: getUser.phone
                    }, {
                        otp
                    });
                    const walletId = getWallet._id;
                    const userId = getUser._id;

                    const session = await Utils.initSession(phone, userId, walletId, 'User');
                    await Utils.sendOTPTextLocal(getUser.phone, otp) // send otp via textlocal
                    res
                    .status(200)
                    .json({
                        title: 'User login Successful',
                        status: true,
                        flag: 1,
                        otp: otp,
                        userDetail: User.formatedData(getUser),
                        csrfToken: session.csrfToken,
                        token: session.token,
                    });

                } else if (await User.exists({
                        phone: phone,
                        is_deleted: true
                    })) {

                    res
                    .status(200)
                    .json({
                        title: 'Customer phone not found.',
                        status: false,
                        flag: 2,
                    });

                } else {
                    res
                    .status(200)
                    .json({
                        title: 'User blocked by admin. Please contact to Ferri support ',
                        status: false,
                        flag: 3,
                    });

                }

            }

        } catch (err) {

            console.log(err);
            res.status(400).json({
                status: false,
                title: 'Registration Error',
                message: 'Something went wrong during registration process.',
                errorMessage: err.message,
            });
        }
    },
    login: async(req, res) => {
        try {
            const {
                phone
            } = req.body;
            if (!Utils.isPhone(phone)) {
                return res.status(400).json({
                    errors: [{
                            title: 'Bad Request',
                            detail: 'Phone number must be a valid phone number',
                        }, ],
                });
            }

            const user = await User.findOne({
                phone
            });
            const wallet = await Wallet.findOne({
                phone
            });
            if (!user) {
                throw new Error();
            }
            const userId = user._id;
            const walletId = wallet._id;
            const getOTP = await Utils.generatingOTP(999, 1000); // generating OTP number
            const updatebody = {
                otp: getOTP
            }
            const update = await userService.updateUserById(user._id, updatebody)
                const session = await Utils.initSession(userId, walletId, 'User'); // on model User

            res.cookie('token', session.token, {
                httpOnly: true,
                sameSite: true,
                maxAge: 1209600000,
                secure: process.env.NODE_ENV === 'production',
            })
            .json({
                title: 'Login Successful',
                otp: getOTP,
                status: true,
                csrfToken: session.csrfToken,
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: 'Invalid Credentials',
                errorMessage: err.message,
            });
        }
    },
    verifyOTP: async function (req, res) {
        try {
            const {
                otp,
                device_token
            } = req.body
                const {
                userId
            } = req.session;

            const getUser = await userService.getUserById(userId);
            if (getUser) {
                if (getUser.otp == otp) {
                   await userService.updateUserById(userId,{phone: getUser.phone,device_token: device_token})
                    res.json({
                        status: true,
                        message: 'OTP verify successful',
                    });

                } else {

                    res.json({
                        status: false,
                        message: 'OTP not matched.',
                    });
                }
            } else {

                res.json({
                    status: false,
                    message: 'User not found.',
                });
            }

        } catch (err) {
            console.log("err",err)
            res.status(401).json({
                message: 'Invalid OTP',
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
            const otp = await Utils.generatingOTP(999, 1000);
            const userExist = await User.exists({
                phone: phone
            });
            if (userExist) {
                const updateuser = await User.findOneAndUpdate({
                    phone: phone
                }, {
                    otp: otp
                });
                await Utils.sendOTPTextLocal(updateuser.phone, otp) // send otp via textlocal
                res
                .status(200)
                .json({
                    message: 'resend otp Successful',
                    status: true,
                    otp: otp,
                });

            } else {
                res.status(200).json({
                    message: 'phone number not exists.',
                    status: false,
                });
            }
        } catch (err) {
            res.status(401).json({
                message: 'Invalid OTP',
                status: false,
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
            const session = await Utils.refreshToken(phone, csrfToken, onModel);
            res.status(200).json({
                status: true,
                message: "token updated successfully.",
                data: {
                    token: session.token,
                    csrfToken: session.csrfToken,
                }
            })
        } catch (err) {
            res.status(400).json({
                status: false,
                title: 'Error while',
                message: 'Something went wrong during refresh token.',
                errorMessage: err,
            });
        }
    },
    loginviaemail: async(req, res) => {
        try {
            const {
                email,
                password
            } = req.body;
            if (!Utils.isEmail(email)) {
                return res.status(400).json({
                    errors: [{
                            title: 'Bad Request',
                            detail: 'Email number must be a valid email address',
                        }, ],
                });
            }
            if (typeof password !== 'string') {
                return res.status(400).json({
                    errors: [{
                            title: 'Bad Request',
                            detail: 'Password must be a string',
                        }, ],
                });
            }
            const user = await User.findOne({
                email
            });
            const wallet = await Wallet.findOne({
                email
            });
            if (!user) {
                throw new Error();
            }
            const userId = user._id;
            const walletId = wallet._id;
            const passwordValidated = await bcrypt.compare(password, user.password);
            if (!passwordValidated) {
                throw new Error();
            }

            const session = await Utils.initSession(userId, 'User'); // on model User

            res
            .cookie('token', session.token, {
                httpOnly: true,
                sameSite: true,
                maxAge: 1209600000,
                secure: process.env.NODE_ENV === 'production',
            })
            .json({
                title: 'Login Successful',
                detail: 'Successfully validated user credentials',
                csrfToken: session.csrfToken,
            });
        } catch (err) {
            res.status(401).json({
                title: 'Invalid Credentials',
                status: false,
                message: 'Check email and password combination',
                errorMessage: err.message,
            });
        }
    },
    help: async(req, res) => {
        try {
            const {
                contact,
                helpemail,
                description
            } = req.body;
            // console.log(contact, helpemail, description);
            const {
                userId
            } = req.session;
            // console.log(userId);
            const user = await User.findById({
                _id: userId
            }, {
                firstname: 1,
                lastname: 1,
                gender: 1,
                email: 1,
                phone: 1,
                _id: 0
            });
            // console.log(user);
            contactNum = Number(contact);
            // console.log(contactNum, typeof(contactNum));
            const firstname = user.firstname;
            const lastname = user.lastname;
            const gender = user.gender;
            const email = user.email;
            const phone = user.phone;

            const helper = new Helper({
                firstname,
                lastname,
                gender,
                email,
                phone,
                helpemail,
                contactNum,
                description,
                ticket_no: momenttz().valueOf(),
            });
            const persistedHelper = await helper.save();
            const helperId = persistedHelper._id;
            if(helperId){
                 res.status(200).json({
                        status: true,
                        message: 'Your request has been submitted.'
                    });
            }
        } catch (err) {
            res.send(err)
        }
    },
    findProfile: async(req, res) => {
        try {
            const {
                userId,
                walletId
            } = req.session;
            const user = await User.findById({
                _id: userId
            }, {
                email: 1,
                refercode: 1,
                referedby: 1,
                _id: 0
            }).po;

            const getuserdetail = await Wallet.findById(walletId).populate("users");
            res.json({
                status: true,
                message: 'Successfully authenticated user',
                baseurl: process.env.BASE_URL,
                data: User.formatedData(getuserdetail.users)
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: 'Not authorized to access this route',
                errorMessage: err.message,
            });
        }
    },
    referral: async(req, res) => {
        try {
            const {
                userId
            } = req.session;
            const refercode = await User.findById({
                _id: userId,
            }).lean();

            if (refercode.refercode == "" || refercode.refercode == undefined) {
                throw new Error("Kindly update your profile to generate refercode");
            }
            const getsetting = await Utils.getSetting();
             const refAmount = await UserReferral.totalRefAmount(userId);
            res.json({
                status: true,
                message: "Successfully found refercode",
                data: {
                     amount: (refAmount) ? refAmount : '0',
                    refercode: refercode.refercode,
                    referral_policy: getsetting.referral_policy
                }
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: "Not authorized to access this route",
                errorMessage: err.message,
            });
        }
    },
    referrallink: async(req, res) => {
        try {
            const {
                phone
            } = req.body;
            const otp = 1234; //await Utils.generatingOTP(999, 1000); // generate OTP
            const userExist = await User.findOne({
                phone,
            });
            if (!userExist) {
                const referedby = req.params.referral;
                console.log(referedby);
                if (referedby != undefined && referedby != "") {
                    toString(referedby);
                    const ref = await User.findOne({
                        refercode: {
                            $eq: referedby
                        }
                    });

                    if (!ref) {
                        throw new Error("Invalid referlink");
                    }
                    const refercode = Utils.referCode(6, phone);
                    const user = new User({
                        phone,
                        otp,
                        refercode,
                        referedby,
                    });
                    const persistedUser = await user.save();
                    const userId = persistedUser._id;

                    const amount = 100;
                    //         const credit = [{ amount: amount, status: false }];

                    var date = new Date();
                    date.setDate(date.getDate() + 30); // expire within the months
                    await Utils.updateReferAmount(amount, date, referedby, userId); //update refer amount pending in refer user
                    const wallet = new Wallet({
                        users: user._id,
                        refercode
                    });
                    const persistedWallet = await wallet.save();
                    const walletId = persistedWallet._id;
                    const session = await Utils.initSession(
                            phone,
                            userId,
                            walletId,
                            "User");

                    res.status(200).json({
                        title: "User Registration Successful",
                        status: true,
                        otp: otp,
                        // data1: user.referedby,
                        // data2: { totalamount, cref },
                        flag: 0,
                        userDetail: User.formatedData(persistedUser),
                        csrfToken: session.csrfToken,
                        token: session.token,
                    });
                } else {
                    throw new Error("Invalid referlink");
                }
            } else {
                res.status(200).json({
                    status: false,
                    message: "Phone number already exists",
                });
            }
        } catch (err) {
            console.log("err", err);
            res.status(400).json({
                status: false,
                title: "Registration Error",
                message: "Something went wrong during registration process.",
                errorMessage: err.message,
            });
        }
    },
    referlink: async(req, res) => {
        try {
            const {
                userId
            } = req.session;
            const refercode = await User.findById({
                _id: userId,
            }, {
                refercode: 1,
                _id: 0,
            });

            // console.log(refercode.refercode);
            if (refercode.refercode == "" || refercode.refercode == undefined) {
                throw new Error("Kindly update your profile to generate referlink");
            }
            const referlink = process.env.REFER_LINK + refercode.refercode;
            res.json({
                status: true,
                message: "Successfully found refercode",
                data: referlink,
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: "Not authorized to access this route",
                errorMessage: err.message,
            });
        }
    },
	  wallettransactions:async (req,res)=>{
    try{
      const { walletId,userId } = req.session;
      const getpayments = await Payment.find({userId,walletId,is_pass:false}).limit(8).sort({_id:-1}).lean();
      res.json({
        status: true,
        message: "wallet history",
        data: Payment.formattedData(getpayments),
      });
    }catch(err){
      res.status(401).json({
        status: false,
        message: "Not authorized to access this route",
        errorMessage: err.message,
      });

    }
  },
    walletcheck: async(req, res) => {
        try {
            const {
                walletId,
                userId
            } = req.session;
            const wallet = await Wallet.findById({
                _id: walletId,
            });
          //   var credamount = 0;
            //  credamount = await UserReferral.totalRefAmount(userId);
            // wallet.credit.forEach((item) => {
            //     if (item.amount != undefined && item.status == true) {
            //         credamount = credamount + item.amount;
            //     }
            // });
            var amount = 0;
            if (wallet.amount != undefined)  {
                amount = wallet.amount
            } 

            res.json({
                status: true,
                message: "Successfully found refercode",
                data: {
                    amount: amount
                },
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: "Not authorized to access this route",
                errorMessage: err.message,
            });
        }
    },
    addmoney: async(req, res) => {
        try {

            const {
                amount
            } = req.body;
            // our order ID
            const {
                userId
            } = req.session;
            const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
            const wallet = await Wallet.findOne({
                users: {
                    $eq: userId
                }
            }).populate("users");
            const currency = razorPaySetting.payment_settings.currency;
            const receipt = razorPaySetting.ferriOrderId;
            const payment_capture = razorPaySetting.payment_settings.payment_capture;
            let parameters = {
                amount: (parseInt(amount) * 100),
                currency,
                receipt,
                payment_capture,
            };

            const data = await razorPaySetting.razor.orders.create(parameters);
            const payment = new Payment({
                ferriOrderId: receipt,
                orderId: data.id,
                walletId: wallet._id,
                userId: userId,
                amount: amount,
				payment_status: "Processing",
				title:"Wallet recharge",
				type:0
            });
            const persistedPayment = await payment.save();
            res.status(200).json({
                status: true,
                message: "successfully added amount in wallet",
                verify_url: `${process.env.BASE_URL}api/users/payment/verify`,
                data: {
                    orderId: data.id,
                    amount: amount,
                    name: `Wallet - ${receipt}`,
                    prefill: {
                        name: wallet.users.firstname + ' ' + wallet.users.lastname,
                        email: wallet.users.email,
                        contact: wallet.users.phone,
                    },
                    notes: {
                        ferri_order_id: receipt,
                    },
                    payment_settings: razorPaySetting.payment_settings
                },
            });
        } catch (err) {
            res.status(404).json({
                status: false,
                message: "Amount not added in wallet",
                errorMessage: err.message,
            });
        }
    },
    verifypayment: async(req, res) => {
        try {
            const {
                orderId,
                paymentId,
                signature,
                status
            } = req.body;


            const razorPaySetting = await Utils.configRazorPay(); // call utils for the Razory pay
            const secret = razorPaySetting.payment_settings.secret;
            let body = orderId + "|" + paymentId;
            //  const secret = process.env.RAZOR_KEY_SECRET;
            let expectedSignature = crypto.createHmac("sha256", secret).update(body.toString()).digest("hex");
            if ((expectedSignature == signature) && status === 'true') {

                const razorPaymentStatus = await razorPaySetting.razor.payments.fetch(paymentId);

                if (razorPaymentStatus && razorPaymentStatus.status == "captured" || razorPaymentStatus.status == "authorized") {
                    
					if(await Payment.exists({orderId,payment_status:'Processing'})){
							const updated_payment = await Payment.findOneAndUpdate({
								orderId: orderId
							}, {
								method: razorPaymentStatus.method,
								paymentId: paymentId,
								payment_signature: signature,
								payment_created: razorPaymentStatus.created_at,
								payment_status: "Completed",
								payment_details: {
									notes: razorPaymentStatus.notes,
									description: razorPaymentStatus.description,
									wallet: razorPaymentStatus.wallet ? razorPaymentStatus.wallet : '',
									invoice_id: razorPaymentStatus.invoice_id ? razorPaymentStatus.invoice_id : '',
									bank: razorPaymentStatus.bank ? razorPaymentStatus.bank : '',
									card_id: razorPaymentStatus.card_id ? razorPaymentStatus.card_id : '',
									vpa: razorPaymentStatus.vpa ? razorPaymentStatus.vpa : '',
									fee: razorPaymentStatus.fee,
									tax: razorPaymentStatus.tax,
									created_at: razorPaymentStatus.created_at,
									captured: razorPaymentStatus.captured
								}
							});
							const payment = await Payment.findOne({
								orderId: orderId
							}, "bookingId walletId amount");

							var wallet = {};
							var updatedWallet = {};
							if (payment.walletId != undefined) {
								wallet = await Wallet.findOne({
									_id: payment.walletId
								});
								var total = 0;
								total = (parseInt(wallet.amount) + parseInt(payment.amount));
								updatedWallet = await Wallet.findOneAndUpdate({
									_id: payment.walletId
								}, {
									amount: total
								},{ new :true})
								.populate({path:'users',select:"firstname lastname device_token"});
								
								await Payment.findOneAndUpdate({orderId:orderId,userId:wallet.users},{payment_status:"Completed"})
								// console.log(updatedWallet);
								
								if (updatedWallet.users && updatedWallet.users.device_token) {
								  user.UserNotification(
									"Wallet Recharge Successful",
									`Hey ${updatedWallet.users.firstname}, Amount Rs. ${payment.amount} has been added in your wallet. Your new balance is Rs. ${updatedWallet.amount}.`,
									"",
									updatedWallet.users.device_token
								  ); //title,message,data,token
								}
						
							}
							// console.log(updated_payment);
							res.status(200).json({
								status: true,
								message: "payment verified successfully.",
								verification: "success",
							});
					}else if(await Payment.exists({orderId,payment_status:'Completed'})) {
						res.status(200).json({
                            status: true,
                            message: "payment verified successfully.",
                            verification: "success",
                        });	
					}
                } else if (razorPaymentStatus && razorPaymentStatus.status == "failed") {
                    const updated_payment = await Payment.findOneAndUpdate({
                        orderId: orderId
                    }, {
                        method: razorPaymentStatus.method,
                        payment_created: razorPaymentStatus.created_at,
                        paymentId: paymentId,
                        payment_signature: signature,
                        payment_status: "Failed"
                    });
					await Payment.findOneAndUpdate({orderId:orderId},{payment_status:"Failed"}) 
					res.status(200).json({
                        status: false,
                        message: "payment failed try after sometime.",
                        verification: "failed",
                    });
                }
            } else {
                res.status(200).json({
                    status: false,
                    message: "payment cancel by customer.",
                    verification: "failure",
                });
            }

        } catch (err) {
            console.log('err while :' + err)
            res.status(200).json({
                status: false,
                message: "",
                errorMessage: err.message,
            });

        }

    },
    searchlocation: async(req, res) => {
        try {

            const address = req.body.address
                var searchname = {
                "title": {
                    $regex: '(\s+' + address + '|^' + address + ')',
                    $options: "i"
                }
            };

            var location = await Location.aggregate([{
                            $match: searchname
                        }, {
                            $group: {
                                _id: "$_id",
                                id: {
                                    $first: '$_id'
                                },
                                title: {
                                    $first: '$title'
                                },
                                location: {
                                    $first: '$location'
                                },
                                type: {
                                    $first: '$type'
                                },
                                city: {
                                    $first: '$city'
                                },
                                state: {
                                    $first: '$state'
                                },
                            }
                        }, {
                            $limit: parseInt(req.body.limit)
                        }
                    ])

                if (location.length > 0) {
                    res.status(200).json({
                        status: true,
                        message: 'Successfully found location',
                        data: Location.transformData(location)
                    });
                } else {
                    res.status(200).json({
                        status: false,
                        message: 'location not found'
                    });
                }
        } catch (err) {
            res.status(401).json({
                status: false,
                message: 'Location not found',
                errorMessage: err.message,
            });
        }
    },
    book: async(req, res) => {
        try {
            // const { userId, walletId } = req.session;
            // const user = await User.findById({ _id: userId }, { firstname: 1, lastname: 1, gender: 1, email: 1, phone: 1, refercode: 1, referedby: 1, _id: 0 });
            // const wallet = await Wallet.findById({ _id: walletId }, { money: 1, _id: 0 });
            const {
                firstname,
                lastname,
                gender,
                email,
                phone,
                bus,
                seat,
                pickup,
                destination,
                date,
                time
            } = req.body
                const booking = new Booking({
                firstname,
                lastname,
                gender,
                email,
                phone,
                bus,
                seat,
                pickup,
                destination,
                date,
                time
            });
            const persistedBooking = await booking.save();
            const bookingId = persistedBooking._id;
            res.json({
                title: 'Booking successful',
                detail: 'Successfully booked ticket',
                booking,
            });
        } catch (err) {
            res.status(401).json({
                status: false,
                message: 'Not authorized to access this route',
                errorMessage: err.message,
            });
        }
    },
    updateuser: async(req, res) => {
        try {
            const {
                userId,
                walletId
            } = req.session;
            const user = await User.findById({
                _id: userId
            });
            const wallet = await Wallet.findById({
                _id: walletId
            });
            var randomstr = '';
            for (var i = 0; i < 3; i++) {
                randomstr += (Math.floor(Math.random() * 10)).toString();
            }
            console.log(req.body);
            const referral = req.body.firstname.slice(0, 4) + req.body.lastname.slice(0, 1) + randomstr;
            if (user, wallet) {
                user.firstname = req.body.firstname || user.firstname;
                user.lastname = req.body.lastname || user.lastname;
                user.gender = req.body.gender || user.gender;
                user.email = req.body.email || user.email;
                user.phone = req.body.phone || user.phone;
                user.mode = req.body.mode || user.mode;
                user.social_id = req.body.social_id || user.social_id;
                user.device_token = req.body.device_token || user.device_token;
                user.places.home.address = req.body.home_address || user.places.home.address; // add hone address
                user.places.home.coordinates = [parseFloat(req.body.home_lng), parseFloat(req.body.home_lat)] || user.places.home.coordinates;
                user.places.home.timing = await Utils.joinDateTime(req.body.home_timing);
                user.places.office.address = req.body.office_address || user.places.office.address; // add office address
                user.places.office.timing = await Utils.joinDateTime(req.body.office_timing);
                user.places.office.coordinates = [parseFloat(req.body.office_lng), parseFloat(req.body.office_lat)] || user.places.office.coordinate
                if (user.refercode == '' || user.refercode == undefined) {
                    user.refercode = referral || user.refercode;
                    wallet.refercode = referral || wallet.refercode;
                }

                if (req.file != undefined) {
                    user.ProfilePic = req.file.path || user.ProfilePic;
                }
                // console.log(user.referedby)
                if (user.referedby == '' || user.referedby == undefined) {

                    const reffby = req.body.referedby;
                    var money = 0;
                    // console.log(user.referedby);
                    if (reffby != undefined && reffby != '') {
                         const refsetting = await Setting.getrefferal('customer');
                        //console.log("refsetting", refsetting)
                        const getUserReferral = await UserReferral.create(userId, reffby, refsetting);
                       // console.log("getUserReferral", getUserReferral)
                        if (!getUserReferral) {
                            throw new Error("Refferal already exits.");
                        }else{
                            money = getUserReferral.amount;
                            wallet.amount = (wallet.amount + parseInt(money));
                            const updatedWallet = await wallet.save();
                            if(updatedWallet){
                                   const payment = new Payment({
                                    orderId: "order_" + nanoid(10),
                                    ferriOrderId: "FER_" + nanoid(15),
                                    walletId: updatedWallet._id,
                                    userId: userId,
                                    amount: parseInt(money),
                                    payment_status: "Completed",
                                    title:"Refferal Amount",
                                    method:"Wallet",
                                    type:0
                                });
                                const persistedPayment = await payment.save(); 
                            }     
                        }                       
                    }
              
                }
                if (req.body.password) {
                    user.password = req.body.password || user.password;
                }
                const updatedUser = await user.save();

            }
            // console.log(user, wallet);
            res.json({
                message: 'Update successful',
                status: true,
                baseurl: process.env.BASE_URL,
                data: User.formatedData(user)
            });
        } catch (err) {
            console.log(err);
            res.status(404).json({
                status: false,
                message: 'Enter valid Information',
                errorMessage: err.message,

            });
        }
    },

    getTrips: async(req, res) => {
        try {
            const { travel_status,offset,limit } = req.body
            const {
                userId,
                walletId
            } = req.session;

            // {
            //     $in: ["CANCELLED","ACCEPTED","ONBOARDED",
            //     "ASSIGNED",
            //     "STARTED",
            //     "ARRIVED",
            //     "PICKEDUP",
            //     "DROPPED",
            //     "COMPLETED",
            //     "EXPIRED",
            //     "SCHEDULED"]
            //     }
            const getTrips = await Booking.find({
                userId: userId,
                travel_status
            })
                .populate({
                path: "userId",
                select: "firstname lastname phone email"
            })
                .populate({
                path: 'routeId',
                select: 'title'
            })
                .populate({
                path: 'pickupId',
                select: 'title'
            })
                .populate({
                path: 'dropoffId',
                select: 'title'
            })
                .populate({
                path: 'busId',
                select: 'name model_no reg_no' 
            })
                .populate({
                path: "passengerdetails"
            })
            .populate({ path: "userId", select: "firstname lastname phone" })
            .sort({
                booking_date: 1
            })
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .lean();

                 const refundssettings = await Setting.getrefunds();
                res.json({
                message: "ti Successful",
                status: true,
                refund_alert:refundssettings.refunds.contents,
                data: await Utils.bookingtransformData(getTrips)
            });

        } catch (err) {
            res.status(404).json({
                status: false,
                message: "fetching failed",
                errorMessage: err.message,
            });
        }
    },
    generateQRTrip: async(req, res) => {
        try {
            const {
                userId,
                walletId
            } = req.session;
            const {
                pnr_no
            } = req.body;
            const getData = await Booking.findOne({
                pnr_no,
                userId
            }, "_id has_return passengers seat_nos travel_status final_total_fare pnr_no")
                .populate({
                path: "userId",
                select: "firstname lastname phone email"
            })
                .populate({
                path: "routeId",
                select: "title"
            })
                .populate({
                path: "pickupId",
                select: "title"
            })
                .populate({
                path: "dropoffId",
                select: "title"
            })
                .populate({
                path: "busId",
                select: "name model_no"
            })
                .lean();

            if (!getData.travel_status) {
                const qrData = `final_total_fare=${getData.final_total_fare}&pnr_no=${getData.pnr_no}&
          seat_nos=${ getData.seat_nos}&travel_status=${getData.travel_status ? "Completed" : "Pending"}&bus_name=${getData.busId.name}&
          bus_model_no=${getData.busId.model_no}&
          passengers=${getData.passengers}&has_return=${getData.has_return ? "NO" : "YES"}&firstname=${getData.userId.firstname}&lastname=${getData.userId.lastname}&phone=${getData.userId.phone}`;

                console.log(qrData);

                const png_string = qr.imageSync(qrData, {
                    type: "png"
                });
                res.json({
                    message: "ti Successful",
                    status: true,
                    data: png_string.toString('base64'),
                });

            } else {
                const png_string = "";
                res.json({
                    message: "ti Successful",
                    status: true,
                    data: png_string,
                });
            }
        } catch (err) {
            console.log('err ' + err)
            res.status(404).json({
                status: false,
                message: "fetching failed",
                errorMessage: err.message,
            });
        }
    },
    addHomeOffice: async(req, res) => {
        try {
            const {
                home_lat,
                home_lng,
                home_address,
                home_timing,
                office_lat,
                office_lng,
                office_address,
                office_timing
            } = req.body;
            const {
                userId,
                walletId
            } = req.session;
			
            if (await User.exists({
                    _id: userId
                })) {
                const Obj = {
                    places: {
                        home: {
                            address: home_address,
                            coordinates: [parseFloat(home_lng), parseFloat(home_lat)],
                            timing: await Utils.joinDateTime(home_timing)
                        },
                        office: {
                            address: office_address,
                            coordinates: [parseFloat(office_lng), parseFloat(office_lat)],
                            timing: await Utils.joinDateTime(office_timing)
                        },
                    }
                }
                const updateUser = await User.findOneAndUpdate({
                    _id: userId
                }, Obj, {
                    new: true
                })
                    res.json({
                    message: "Add home and office details",
                    status: true,
                    data: await User.formatedData(updateUser)
                });
            }

        } catch (err) {
            res.status(400).json({
                status: false,
                message: "Unable to added home and office",
                detail: ".",
                errorMessage: err.message,
            });

        }
    },
    logout: async(req, res) => {
        try {
            const requestData = req.session;
            await Utils.verifyToken(requestData.token);
            res.json({
                message: 'Logout Successful',
                status: true,
                detail: 'Successfuly expired login session',
            });
        } catch (err) {
            res.status(400).json({
                status: false,
                message: 'Logout Failed',
                detail: 'Something went wrong during the logout process.',
                errorMessage: err.message,
            });
        }
    },
    userDelete: async(req, res) => {
        try {
            const {
                userId
            } = req.session;
            const {
                password
            } = req.body;
            if (typeof password !== 'string') {
                throw new Error();
            }
            const user = await User.findById({
                _id: userId
            });

            const passwordValidated = await bcrypt.compare(password, user.password);
            if (!passwordValidated) {
                throw new Error();
            }

            await Session.expireAllTokensForUser(userId);
            res.clearCookie('token');
            await User.findByIdAndDelete({
                _id: userId
            });
            res.json({
                title: 'Account Deleted',
                detail: 'Account with credentials provided has been successfuly deleted',
            });
        } catch (err) {
            res.status(401).json({
                errors: [{
                        title: 'Invalid Credentials',
                        detail: 'Check email and password combination',
                        errorMessage: err.message,
                    }, ],
            });
        }
    },
      track: async(req, res) => {
        try {
            const { pnr_no } = req.body;
            const date = await userService.bookingTrack(pnr_no);
            res.json({
                message: "track Successful",
                status: true,
                data: date,
            });
        } catch (err) {

            res.status(200).json({
                status: false,
                message: "Something went wrong during registration process.",
                errorMessage: err.message,
            });
        }
    },
    invoiceGenerate: async(req, res) => {
        try {  
            const pnr_no  = req.params.pnr_no;
            const data = await userService.invoiceGenerate(pnr_no,res);
            return data;
         } catch (err) {

            res.status(200).json({
                status: false,
                message: "Something went wrong during registration process.",
                errorMessage: err.message,
            });
        }
    },
};
