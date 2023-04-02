
const { Setting } = require('../models');
const { Client, Status } = require("@googlemaps/google-maps-services-js");


module.exports = {

    matrix: async (origins, destinations) => {
        try {
            const generalSetting = await Setting.getgeneral();
            const googleKey = generalSetting.general.google_key;
            const client = new Client({});
            console.log(origins, destinations)
            return client.distancematrix({
                params: {
                    origins: origins, //[{ lat:s_latitude, lng:s_longitude }],
                    destinations: destinations,//[{ lat:d_latitude, lng:d_longitude }],
                    key: googleKey,
                    mode: "transit",
                    transit_mode: ['bus'],
                    units: "metric",
                    sensor: false
                },
                timeout: 1000, // milliseconds
            }).then((r) => {
                if ((r.data.rows[0].elements[0].status != '') && (r.data.rows[0].elements[0].status == 'ZERO_RESULTS')) {
                    return 'Out of service area';
                }
                var rest = {
                    'distance_text': r.data.rows[0].elements[0].distance.text,
                    'distance_value': r.data.rows[0].elements[0].distance.value,
                    'duration_text': r.data.rows[0].elements[0].duration.text,
                    'duration_value': r.data.rows[0].elements[0].duration.value
                };
                return rest;
            })

        } catch (Err) {
            console.log(Err);
            return 'err while :' + Err
        }
    }

}