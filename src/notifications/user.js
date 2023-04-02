const { Setting } = require("../models");
const FCM = require("fcm-node");


const UserNotification = async (title, message, data, token) => {
    const getSetting =  await Setting.findNotifySettings();
    const fcm = new FCM(getSetting.notifications.customer_secret_key);

  if (typeof data == "object") {
    var message = {
      to: token,
      data: {
        title: title,
        message: message,
        data: data,
      },
    };
  } else {
    var message = {
      to: token,
      data: {
        title: title,
        message: message,
      },
    };
  }

  fcm.send(message, function (err, response) {
    if (err) {
      console.log("err while user :" + err);
    } else {
      console.log("Successfully sent user  with response: ", response);
      return response;
      
    }
  });
};

module.exports = {
  UserNotification,
};
