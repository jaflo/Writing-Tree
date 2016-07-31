var mongoose = require('mongoose');
var bcrypt   = require('bcryptjs');

var SALT_LEVEL = 10;

var userSchema = mongoose.Schema({
	username: { type: String, required: true, index: { unique: true } },
	email: { type: String, required: true, index: { unique: true } },
	password: { type: String, required: true, index: { unique: true } },
	createdat: { type: Date, required: true, default: Date.now() },
	changedat: { type: Date }
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(SALT_LEVEL), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


module.exports = mongoose.model('User', userSchema);
