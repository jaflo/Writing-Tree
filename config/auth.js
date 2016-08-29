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
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true // allows us to pass back the entire request to the callback
	}, function(req, username, password, done) {
		// asynchronous
		// User.findOne wont fire unless data is sent back
		process.nextTick(function() {
			var err = "";
			if (req.body.reentered != req.body.password) {
				err += 'Error: Passwords do not match\n';
			} if (req.body.password.length < 6) {
				err += 'Error: Passwords must be at least 6 characters long\n';
			} if (req.body.password.match(/^\s*$/)) {
				err += 'Error: All fields must be filled\n';
			} if (req.body.username.match(/\s/)) {
				err += 'Error: Usernames can have no whitespace\n';
			} if (req.body.username.length > 32) {
				err += 'Error: Username cannot exceed 32 characters\n';
			} if (req.body.email.length > 500) {
				err += 'Error: Email cannot exceed 500 characters\n';
			} if (!validator.isEmail(req.body.email)) {
				err += 'Error: Must enter a valid email\n';
			}
			if(err !== "") {
				return done(null, false, req.flash('error', err.substring(0, err.length - 1)));
			}
			User.findOne({
				'username': username
			}, function(err, user) {
				// if there are any errors, return the error
				if (err) {
					return done(err);
				}

				// check to see if theres already a user with that username
				if (user) {
					return done(null, false, req.flash('error', 'That username is already taken'));
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
						if (err && err.code === 11000) {
							return done(null, false, req.flash('error', 'That email is already taken'));
						} else if (err) {
							throw err;
						}
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
		usernameField: 'username', // by default, local strategy uses username and password, we will override with username ( :D )
		passwordField: 'password',
		passReqToCallback: true // allows us to pass back the entire request to the callback
	}, function(req, username, password, done) { // callback with username and password from our form
		// find a user whose username is the same as the forms username
		// we are checking to see if the user trying to login already exists
		User.findOne({
			'username': username
		}, function(err, user) {
			// if there are any errors, return the error before anything else
			if (err) {
				return done(err);
			}
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
