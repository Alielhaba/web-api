const { Bus,Ticket,Booking } = require('../models')
const EventEmitter = require('events').EventEmitter
const eventsListener = new EventEmitter();
const { user } = require("../notifications");
const moment = require("moment-timezone");


eventsListener.on('UPDATE-BOOKING-TICKET', async (ticketId,seatcount) => {
	try{
		if(await Ticket.exists({_id:ticketId})){
		    const getTicket = await Ticket.findById(ticketId);
			console.log('getTicket',getTicket)
			if(getTicket){
				const seat_remain = (parseInt(getTicket.seat_remain) == 0) ? (parseInt(getTicket.seat_count) - parseInt(seatcount)) : (parseInt(getTicket.seat_remain) - parseInt(seatcount))
			    const update = {
				seat_remain,
				seat_booked:(parseInt(getTicket.seat_booked) + parseInt(seatcount)) 
				}
			const updateTickets= await Ticket.findOneAndUpdate({_id:ticketId},update,{new :true});
				return updateTickets;
			}


		}
	
     }catch(err){

	console.log(err);
	return 'error while : '+err;
	}

 })


eventsListener.on("UPDATE-ALL-BOOKING-TICKET", async (bookingIds) => {
  try {
    const getBookings = await Booking.find({
      _id: { $in: bookingIds },
    }).populate({ path: "ticketId" });
    if (getBookings) {
      for (let booking of getBookings) {
        const seatcount = booking.seat_nos;
        const seat_remain =
          parseInt(booking.ticketId.seat_remain) == 0
            ? parseInt(booking.ticketId.seat_count) - parseInt(seatcount)
            : parseInt(booking.ticketId.seat_remain) - parseInt(seatcount);
        const update = {
          seat_remain,
          seat_booked:
            parseInt(booking.ticketId.seat_booked) + parseInt(seatcount),
        };

        const updateTickets = await Ticket.updateOne(
          { _id: booking.ticketId._id },
          update
        );
      }
    }
  } catch (err) {
    console.log(err);
    return "error while : " + err;
  }
});

eventsListener.on("NOTIFY-ALL-BOOKING-CUSTOMER", async (routeId, assignDate, driverId) => {
  try {
    const currentDate = moment(assignDate).tz("Asia/Kolkata").format("YYYY-MM-DD")
    const getBooking = await Booking.find({ routeId, bus_depature_date: new Date(currentDate), travel_status: "SCHEDULED" })
      .populate({ path: "userId", select: "phone firstname lastname device_token" })
      .lean();
    if (getBooking) {
      getBooking.forEach(async (booking, index) => {

        if (booking.userId && booking.userId.device_token) {
          user.UserNotification(
            "Trip Reminder",
            `Hey ${booking.userId.firstname}, Its time to board Ferri Shuttle. Track your bus for live update`,
            "",
            booking.userId.device_token); //title,message,data,token
        }

      });
    }
  } catch (err) {
    console.log(err);
    return "error while : " + err;
  }
});


exports.eventsListener = eventsListener