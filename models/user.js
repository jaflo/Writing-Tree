var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
	username: { type: String, required: true, index: { unique: true } },
	email: { type: String, required: true, index: { unique: true } },
	password: { type: String, required: true, index: { unique: true } },
	createdat: { type: Date, required: true, default: Date.now },
	changedat: { type: Date }
});

var User = mongoose.model('User', userSchema);

module.exports = User;
