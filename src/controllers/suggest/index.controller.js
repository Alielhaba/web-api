
const { Suggest } = require("../../models");

module.exports = {
    save: async (req, res) => {
      try {
          const { userId } = req.session;
          const {pickup_address,pickup_lat,pickup_lng,drop_address,drop_lat,drop_lng,pickup_city,pickup_state,drop_city,drop_state} = req.body;
          const data = {
            pickup_address,
            pickup_lat,
            pickup_lng,
            drop_address,
            drop_lat,
            drop_lng,
            userId,
			pickup_city,
			pickup_state,
			drop_city,
			drop_state
          }
          const saveSuggest = await Suggest.create(data);
          if(saveSuggest){
            res.status(200).json({
                status: true,
                message: "Thanks for your route suggestion. We will notify you when we start route in your area.",
                });
          }else{
            res.status(200).json({
                status: false,
                message: "failed to save route suggestion.",
            });
          }
      }catch(err){
        res.status(400).json({
            status: false,
            title: "Suggest Error",
            message: "Something went wrong during adding suggestion.",
            errorMessage: err.message,
          });
      }
    }
}