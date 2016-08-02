var express = require('express');
var path = require('path');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lessMiddleware = require('less-middleware');
var expressValidator = require('express-validator');
var session = require('express-session');
var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/Writing-Tree');
var db = mongoose.connection;
var User = require('./models/user.js');
var Story = require('./models/story.js');

var routes = require('./routes/index');
var users = require('./routes/users');

var client = express();

var handlebars = require('express-handlebars').create({
	defaultLayout: 'main'
});

client.set('views', path.join(__dirname, 'views'));
client.engine('handlebars', handlebars.engine);
client.set('view engine', 'handlebars');

client.use(bodyParser.json());
client.use(bodyParser.urlencoded({
	extended: true
}));
//client.use(cookieParser('secret'));

client.set('port', process.env.PORT || 3000);

client.use(lessMiddleware(__dirname + "/public", {
	compress: true
}));
client.use(express.static(__dirname + '/public'));

client.use(session({
	secret: 'secret',
	saveUninitialized: true,
	resave: true
}));

client.use(passport.initialize());
client.use(passport.session());
require('./config/auth.js')(passport, LocalStrategy, User);

client.use(expressValidator({
	errorFormatter: function(param, msg, value) {
		var namespace = param.split('.'),
			root = namespace.shift(),
			formParam = root;
		while (namespace.length) {
			formParam += '[' + namespace.shift() + ']';
		}
		return msg+" ";
		/*return {
			param: formParam,
			msg: msg,
			value: value
		};*/
	}
}));

client.use(flash());

client.use(function(req, res, next) {
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	res.locals.user = req.user;
	next();
});

User.find(function(err, stories) {
	if (err) return console.error(err);
	//console.dir(stories);
});

client.listen(client.get('port'), function() {
	console.log('Express has started on http://localhost:' + client.get('port') + '; press Ctrl-C to terminate.');
})

client.get('/', function(req, res) {
	res.render("index", {
		bodyclass: "longer"
	});
	//should return HTML
});

client.get('/placeholder-shortID', function(req, res) {
	//should return HTML
});

client.post('/placeholder-shortID/next', function(req, res) {
	//sohuld return JSON
});

client.post('/placeholder-shortID/jump', function(req, res) {
	//should return JSON
});

client.post('/placeholder-shortID/favorite', function(req, res) {
	//should return JSON(?)
});

client.post('/placeholder-shortID/flag', function(req, res) {
	//should return JSON(?)
});

client.post('/placeholder-shortID/edit', function(req, res) {

});

client.post('/placeholder-shortID/remove', function(req, res) {

});

client.post('/create', function(req, res) {
	if (!req.user) {
		req.flash("error", "You need to be logged in.");
		res.redirect(req.header('Referer') || '/');
	}
	req.assert('parent', 'Parent is required.').notEmpty();
	req.assert('content', 'Some text is required.').notEmpty();
	var errors = req.validationErrors();
	if (errors) {
		if (req.body.json) {
			res.json({
				status: "failed",
				message: errors
			});
		} else {
			req.flash("error", errors);
			res.redirect(req.header('Referer') || '/');
		}
		return;
	} else {
		attemptCreation(randomString());
	}
	function attemptCreation(shortID) {
		console.log(shortID);
		Story.findOne({ 'shortID': shortID }, 'author', function(err, story) {
			if (err) return handleError(err); // [TODO] handleError
			if (story) { // story with that ID already exists, so new ID
				attemptCreation(randomString());
			} else {
				var test = new Story({
					shortID: shortID,
					parent: req.body.parent, // [TODO] check if exists
					author: req.user.id, // [TODO] check if logged in
					content: req.body.content,
					createdat: Date.now(),
							changedat: Date.now()
				});
				console.log(test);
				test.save(function(err, test) {
					if (err) return console.error(err);
					console.dir(test);
				});
				console.log("Save successful");
				Story.find(function(err, stories) {
					if (err) return console.error(err);
					console.dir(stories);
				});
				if (req.body.json) {
					res.json({
						status: "success",
						message: "Save successful!"
					});
				} else {
					req.flash("success", "Save successful!");
					res.redirect('/'+shortID);
				}
			}
		});
	}
});

client.get('/user/username/favorites', function(req, res) {
	//should return HTML
});

client.get('/user/username/mine', function(req, res) {
	//should return HTML
});

client.get('/user/username', function(req, res) {
	//should return HTML
});

client.post('/user/username/preferences', function(req, res) {
	//should return JSON
});

//Uses multiple kinds of requests, 'get' is just a placeholder
client.get('/login', function(req, res) {
	//should return HTML
	if(!req.user) { res.render("login", {title: "Log In"});
	} else { res.redirect('/'); }
});

client.post('/login', passport.authenticate('local-login', {
	successRedirect : '/', // redirect to the secure profile section
	failureRedirect : '/login', // redirect back to the signup page if there is an error
	failureFlash : true // allow flash messages
}));

//Uses multiple kinds of requests, 'get' is just a placeholder
client.get('/signup', function(req, res) {
	//should return HTML
	res.render("signup", {
		title: "Sign up"
	});
});

client.post('/signup', passport.authenticate('local-signup', {
	successRedirect : '/', // redirect to the secure profile section
	failureRedirect : '/signup', // redirect back to the signup page if there is an error
	failureFlash : true // allow flash messages
}));

client.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

client.use(function(req, res) {
	res.status(404);
	res.render('404', {
		title: "Page not found"
	});
});

function randomString(length) {
	return Math.random().toString(36).substr(2, length || 5);
}
