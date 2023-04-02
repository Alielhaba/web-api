const Utils = require("../utils/utils");
const driverService = require("../services/driver.service");

module.exports = {
    myTrips: async (req, res) => {
      try {
        const { userId } = req.session;

        const getTrips = await driverService.getTrips(userId);
        if(getTrips){
            res.status(200).json({
            status: true,
            message: "my trip fetched successfully.",
            data: getTrips,
          }); 
        }else{
                  res.status(200).json({
            status: false,
            message: "No trips assigned yet.",
          }); 
        }
       
       } catch (err) {
        console.log("err",err);
      res.status(400).json({
        status: false,
        title: "Login Error",
        message: "Something went wrong during registration process.",
        errorMessage: err.message,
      });
    }
  },
  getStopDetails: async (req, res) => {
    try {
        const {routeId,stopId,booking_date} = req.body;
        const getBookings = await driverService.getBookings(routeId,stopId,booking_date);
        res.status(200).json({
            status: true,
            message: "get booking passengers fetched successfully.",
            data: getBookings,
          });
    } catch (err) {
        res.status(400).json({
          status: false,
          title: "Login Error",
          message: "Something went wrong during registration process.",
          errorMessage: err.message,
        });
      }
    },
    updateBookingStatus: async (req, res) => {
      try {
        const {pnr_no,travel_status} = req.body

         let bookingUpdateStatus = await driverService.updateBookingStatus(pnr_no, travel_status);
            if (bookingUpdateStatus) {
                res.status(200).json({
                    status: true,
                    message: "get booking status updated successfully.",
                });
            } else {
                res.status(200).json({
                    status: false,
                    message: "get booking status update failed.",
                });
            }
      } catch (err) {
        res.status(400).json({
          status: false,
          title: "Login Error",
          message: "Something went wrong during registration process.",
          errorMessage: err.message,
        });
      }
    },
        updateAssign: async(req, res) => {
        try {
            const { trip_status, lat, lng,angle } = req.body;
            const assignId = req.params.assignId
            const updatedata = await driverService.assignTripStatus(assignId, trip_status, lat, lng,angle);
            res.status(200).json({
                status: true,
                data: updatedata,
                message: "get booking status updated successfully.",
            });

        } catch (err) {
            res.status(401).json({
                status: false,
                message: "Could not find passenger list",
                ErrorMessage: err.message,
            });
        }
    },
}