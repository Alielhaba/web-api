const Utils = require("../../utils/utils");

module.exports = {
    appSettings: async (req, res) => {
      try {
        console.log('req.query.type',req.query.type)
        const getSetting = await Utils.getSetting();
        if(req.query.type == 'payments'){
            res.status(200).json({
                status:true,
                message:"get settings data",
                data:getSetting.payments
            });
        }
    } catch (err) {
        res.status(400).json({
          status: false,
          title: "Settings Error",
          message: "Something went wrong during Settings process.",
          errorMessage: err.message,
        });
      }
    }
}