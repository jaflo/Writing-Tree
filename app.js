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
		return {
			param: formParam,
			msg: msg,
			value: value
		};
	}
}));

client.use(flash());

client.use(function(req, res, next) {
	res.locals.success_msg = req.flash('success_msg');
	res.locals.error_msg = req.flash('error_msg');
	res.locals.error = req.flash('error');
	next();
})

User.find(function(err, stories) {
	if (err) return console.error(err);
	//console.dir(stories);
});

client.listen(client.get('port'), function() {
	console.log('Express has started on http://localhost:' + client.get('port') + '; press Ctrl-C to terminate.');
})

client.get('/', function(req, res) {
	res.render("index", {
		user: req.user
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
	var test = new Story({
		shortID: "ABDSLDWERP",			//#TODO: Create true random alphanumeric key
		parent: "BCDEFGHIJKL",
		author: "dummyAcct",
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

	res.redirect('/');
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
	res.render("login", {title: "Log In"});
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
	res.render('404');
});
