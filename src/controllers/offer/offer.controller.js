const Utils = require('../../utils/utils');
const Offer = require("../../models/Offer.model");

module.exports = {


    allRouteOffer: async(req, res) => {
        try {
            const offers = await Offer.find({status:true});
            res.status(200).json({
                status: true,
                message: "Offers Found Succesfully",
                data: Offer.transformData(offers)
            });
        } catch (err) {
            res.status(200).json({
                status: true,
                message: "Offers Found Succesfully",
                errMessage: err.message
            });
        }
    },

}