module.exports = function(passport, LocalStrategy, validator, User) {
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	// used to deserialize the user
	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});

	// =========================================================================
	// LOCAL SIGNUP ============================================================
	// =========================================================================
	// we are using named strategies since we have one for login and one for signup
	// by default, if there was no name, it would just be called 'local'

	passport.use('local-signup', new LocalStrategy({
		// by default, local strategy uses username and password, we will override with username ( :D )
		usernameField : 'username',
		passwordField : 'password',
		passReqToCallback : true // allows us to pass back the entire request to the callback
	}, function(req, username, password, done) {
		// asynchronous
		// User.findOne wont fire unless data is sent back
		process.nextTick(function() {
			if(req.body.reentered != req.body.password) { return done(null, false, req.flash('error', 'Unable to sign up: Passwords do not match')); }
			else if(req.body.password.length < 6) { return done(null, false, req.flash('error', 'Unable to sign up: Passwords must be at least 6 characters long')); }
			else if(req.body.password.match(/^\s*$/)) { return done(null, false, req.flash('error', 'Error: All fields must be filled')); }
			if(req.body.username.match(/\s/)) { return done(null, false, req.flash('error', 'Error: Usernames can have no whitespace')); }
			else if(req.body.username > 32) { return done(null, false, req.flash('error', 'Error: Username cannot exceed 32 characters')); }
			if(req.body.email.match(/^\s*$/)) { return done(null, false, req.flash('error', 'Error: All fields must be filled')); }			
			else if(req.body.email > 500) {  return done(null, false, req.flash('error', 'Error: Email cannot exceed 500 characters')); }
			else if(!validator.isEmail(req.body.email)) {  return done(null, false, req.flash('error', 'Error: Must enter valid email')); }
			// find a user whose username is the same as the forms username
			// we are checking to see if the user trying to login already exists
			User.findOne({ 'username' :  username }, function(err, user) {
				// if there are any errors, return the error
				if (err) { return done(err); }

				// check to see if theres already a user with that username
				if (user) {
					return done(null, false, req.flash('error', 'That username is already taken.'));
				} else {

					// if there is no user with that username
					// create the user
					var newUser = new User();

					// set the user's local credentials
					newUser.username = username;
					newUser.password = newUser.generateHash(password);
					newUser.email = req.body.email;
					newUser.createdat = Date.now();
					newUser.changedat = Date.now();
					// save the user
					newUser.save(function(err) {
						if (err) { throw err; }
						return done(null, newUser);
					});
				}

			});

		});

	}));
	// end of local-signup
	// begining of local-login
	// =========================================================================
	// LOCAL LOGIN =============================================================
	// =========================================================================
	// we are using named strategies since we have one for login and one for signup
	// by default, if there was no name, it would just be called 'local'

	passport.use('local-login', new LocalStrategy({
		usernameField : 'username', // by default, local strategy uses username and password, we will override with username ( :D )
		passwordField : 'password',
		passReqToCallback : true // allows us to pass back the entire request to the callback
	}, function(req, username, password, done) { // callback with username and password from our form
		// find a user whose username is the same as the forms username
		// we are checking to see if the user trying to login already exists
		User.findOne({ 'username' :  username }, function(err, user) {
			// if there are any errors, return the error before anything else
			if (err) { return done(err); }
			// if no user is found, return the message
			if (!user) {
				return done(null, false, req.flash('error', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
			}
			// if the user is found but the password is wrong
			if (!user.validPassword(password)) {
				return done(null, false, req.flash('error', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
			}
			
			// all is well, return successful user
			return done(null, user);
		});

	}));

};