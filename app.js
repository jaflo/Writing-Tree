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
var Flag = require('./models/flag.js');

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
	res.locals.url = "http://localhost:3000"+req.originalUrl;
	next();
});

User.find(function(err, stories) {
	if (err) return console.error(err);
	//console.dir(stories);
});

Story.collection.drop(); //For testion purposes, deletes all previous stories on startup

//If the database is new and their are no stories, create the first one
Story.collection.count({}, function(err, count){
	if(count == 0){
		var parentStory = new Story({
			shortID: '0',
			parent: '0', // [TODO] check if exists
			author: 'Your homedog, ejmejm',
			content: 'This is the parent story of all parents.', // [TODO] validate
			createdat: Date.now(),
			changedat: Date.now()
		});

		parentStory.save(function(err, parentStory) {
			if (err) return console.error(err);
			console.dir(parentStory);
		});
		console.log("Save successful");
	}
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

/*********************************************************************************** WIP by Edan Meyer */
client.get('/story/:id', function(req, res) {
	mongoose.model('Story').findOne({ shortID: req.params.id }, function(err, story){
		if(!err && story !== null){
			var stories = [];
			var newStory = story;
			console.log('NEW STORY -----------------------------------------------------------------------' + newStory);
			while(newStory.parent != '0'){
				stories.push(newStory);
				mongoose.model('Story').findOne({ parent: newStory.parent }, function(err, story){
					newStory = story;
				});
			}
			stories.push(newStory);
			console.log(stories);
			res.render('index', {
				bodyclass: "longer",
				story: stories
			});
		}else{
			console.log('ERROR: Story with shortID ' + req.params.id + ' not found');
		}
	});

	//should return HTML
});

client.post('/placeholder-shortID/next', function(req, res) {
	//sohuld return JSON
});

client.post('/placeholder-shortID/jump', function(req, res) {
	//should return JSON
});

client.post('/star', function(req, res) {
	var temp_err = "";
	User.update(
	{username: req.user.username},
	{$push: { favs: req.body.id }},
	{safe: true, upsert: true},
	function(err, model) {
		temp_err += err+" "; // [TODO] consider array
	}
	);
	if(req.body.json) { res.json({ status: temp_err||"success" });
	} else {
		res.redirect("/" + req.params.id);
		if (temp_err) req.flash("error", "success");
	}
});

client.post('/unstar', function(req, res) {
	var temp_err = "";
	User.update(
	{username: req.user.username},
	{$pull: { favs: req.body.id }},
	{safe: true, upsert: true},
	function(err, model) {
		temp_err += err+" "; // [TODO] consider array
	}
	);
	if(req.body.json) { res.json({ status: temp_err||"success" });
	} else {
		res.redirect("/story/" + req.params.id);
		if (temp_err) res.flash("error_text", "success");
	}
});


client.post('/flag', function(req, res) {
	var newFlag = new Flag({
		id: req.body.id,
		flagger: req.user.username,
		flagged: req.body.flagged,
		reason: req.body.reason,
		createdat: Date.now(),
		status: "unresolved"
	});
	newFlage.save(function(err){ if(err) throw err; });
});

client.post('/placeholder-shortID/edit', function(req, res) {

});

client.post('/placeholder-shortID/remove', function(req, res) {

});

function validateFields(req, res, callback) {
	var errors = req.validationErrors();
	if (errors) {
		if (req.body.json) {
			res.json({
				status: "failed",
				message: errors
			});
		} else {
			req.flash("error", errors);
			res.redirect("back");
		}
	} else {
		callback();
	}
}

function completeRequest(req, res, success, redirect) {
	if (req.body.json) {
		res.json({
			status: "success",
			message: success
		});
	} else {
		req.flash("success", success);
		res.redirect(redirect || "back");
	}
}

client.post('/create', function(req, res) {
	if (!req.user) {
		req.flash("error", "You need to be logged in.");
		res.redirect("back");
		return;
	}
	req.assert('parent', 'Parent is required.').notEmpty();
	req.assert('content', 'Some text is required.').notEmpty();
	validateFields(req, res, function() {
		attemptCreation(randomString());
	});
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
				author: req.user.id,
				content: req.body.content, // [TODO] validate
				createdat: Date.now(),
				changedat: Date.now()
				});
				console.log(test);
				test.save(function(err, test) {
					if (err) return console.error(err);
					//console.dir(test);
				});
				console.log("Save successful");
				Story.find(function(err, stories) {
					if (err) return console.error(err);
					//console.dir(stories);
				});
				completeRequest(req, res, "Save successful!", '/story/'+shortID);
			}
		});
	}
});

client.get('/user/username/starred', function(req, res) {
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
	} else { res.redirect("back"); }
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
	res.redirect("back");
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
