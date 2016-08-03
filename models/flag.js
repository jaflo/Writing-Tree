var mongoose = require('mongoose');
var flagSchema = mongoose.Schema({id: String, reason: String, flagger: String, flagged: String, status: String, createdat: {type:Date, default: Date.now()}, processedat: Date});
module.exports = mongoose.model('Flag', flagSchema);
