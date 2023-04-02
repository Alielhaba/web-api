const mongoose = require("mongoose");

const secrets = {
  dbUri: process.env.DB_URI || "YOUR MONGODB URI HERE",
};

const getSecret = (key) => secrets[key];

mongoose.Promise = global.Promise;
const env = process.env.NODE_ENV;
// print mongoose logs in dev env
if (env === "development") {
  mongoose.set("debug", true);
}

/**
 * Connect to mongo db
 *
 * @returns {object} Mongoose connection
 * @public
 */
exports.connect = () => {
  mongoose
    .connect(getSecret("dbUri"), {
      useCreateIndex: true,
      keepAlive: 1,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      autoIndex: true, // Don't build indexes
    })
    .then(() => console.log("mongoDB connected..."));
  return mongoose.connection;
};
