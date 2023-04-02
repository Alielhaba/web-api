const momenttz = require('moment-timezone');

module.exports ={
    defaultTimeZone : function(){
        return momenttz.tz(Date.now(), "Asia/Kolkata");
    },
    defaultTimeFormat : function(format){
        return momenttz.tz(Date.now(), "Asia/Kolkata").format(format);
    },
    convertTimeZone: function(date,format){
        return momenttz.tz(date, "Asia/Kolkata").format(format); 
    },
    unixDateTimeFormat : function(){  // miliseconds
        return momenttz().tz("Asia/Kolkata").valueOf();
    },
    localTime: function(datetimestamp,format){
        return momenttz.utc(momenttz.unix(datetimestamp)).tz("Asia/Kolkata").format(format);
    },
    setExpiredTime: function(num,times){
        return momenttz().tz("Asia/Kolkata").add(num,times).valueOf(); //'minutes'
    },
    test(){
      return  momenttz().add(30, 'days').toDate();
    }


}