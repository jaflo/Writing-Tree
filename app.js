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
var validator = require('validator');
var server = require('http').createServer();
var io = require('socket.io')(server);
var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
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
require('./config/auth.js')(passport, LocalStrategy, validator, User);

client.use(expressValidator({
	errorFormatter: function(param, msg, value) {
		var namespace = param.split('.'),
			root = namespace.shift(),
			formParam = root;
		while (namespace.length) {
			formParam += '[' + namespace.shift() + ']';
		}
		return msg + " ";
	}
}));

client.use(flash());

client.use(function(req, res, next) {
	res.locals.success = req.flash('success');
	res.locals.error = req.flash('error');
	res.locals.user = req.user;
	res.locals.url = "http://localhost:3000" + req.originalUrl;
	next();
});

User.find(function(err, stories) {
	if (err) return console.error(err);
	//console.dir(stories);
});

Story.collection.drop(); //For testion purposes, deletes all previous stories on startup
User.collection.drop(); //For testion purposes, deletes all previous stories on startup

//If the database is new and their are no stories, create the first one
Story.collection.count({}, function(err, count) {
	//if (count == 0) {
	var parentStory = new Story({
		shortID: '0',
		parent: "this should never be a valid parent. kind of a hack", // [TODO] check if exists
		author: 'Your homedog, ejmejm',
		content: 'This is the parent story of all parents.', // [TODO] validate
		createdat: Date.now(),
		changedat: Date.now()
	});

	parentStory.save(function(err, parentStory) {
		if (err) return console.error(err);
		//console.dir(parentStory);
	});
	console.log("Save successful");
	//}
});

client.listen(client.get('port'), function() {
	console.log('Express has started on http://localhost:' + client.get('port') + '; press Ctrl-C to terminate.');
})

client.get('/', function(req, res) {
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, "starred", function(err, user) {
			load(0, function(stories, story) {
				res.render('index', {
					bodyclass: "longer",
					story: stories,
					currentID: story.shortID,
					date: timeSince(story.changedat),
					ISO8601: story.changedat.toISOString(),
					views: story.views,
					siblings: story.siblings,
					starred: user.starred.includes(story.shortID)
				});
			});
		});
	} else {
		load(0, function(stories, story) {
			res.render('index', {
				bodyclass: "longer",
				story: stories,
				currentID: story.shortID,
				date: timeSince(story.changedat),
				ISO8601: story.changedat.toISOString(),
				views: story.views,
				siblings: story.siblings,
				starred: false
			});
		});
	}
});

function getParentStory(newStory, storyArray, callback, render) {
	if (newStory.shortID != '0') {
		storyArray.unshift(newStory);
		mongoose.model('Story').findOne({
			shortID: newStory.parent
		}, function(err, newParentStory) {
			if (!err) {
				callback(newParentStory, storyArray, callback, render);
			} else {
				console.log('ERROR: Parent story could not be found');
			}
		});
	} else {
		storyArray.unshift(newStory);
		render();
	}
}

function load(shortid, complete, fail) {
	mongoose.model('Story').findOne({
		shortID: shortid
	}, function(err, story) {
		if (!err && story !== null) {
			Story.update({
					shortID: shortid
				}, {
					$set: {
						views: story.views + 1
					}
				}, {
					upsert: true
				},
				function(err, st) {});
			var stories = [];
			var newStory = story;
			getParentStory(newStory, stories, getParentStory, function() {
				Story.count({
					parent: story.parent
				}, function(err, siblingCount) {
					if (!err) {
						story.siblings = siblingCount;
						complete(stories, story);
					} else {
						console.log('ERROR: Could not find siblings of story ' + story.shortID);
					}
				});
			});
		} else {
			console.log('ERROR: Story with shortID ' + shortid + ' not found');
			fail();
		}
	});
}

client.get('/story/:id', function(req, res) {
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, "starred", function(err, user) {
			load(req.params.id, function(stories, story) {
				res.render('index', {
					bodyclass: "longer",
					story: stories,
					currentID: story.shortID,
					date: timeSince(story.changedat),
					ISO8601: story.changedat.toISOString(),
					views: story.views,
					siblings: story.siblings,
					starred: user.starred.includes(story.shortID),
					starcount: story.starcount
				});
			}, function() {
				res.status(404);
				res.render('404', {
					title: "Page not found"
				});
			});
		});
	} else {
		load(req.params.id, function(stories, story) {
			res.render('index', {
				bodyclass: "longer",
				story: stories,
				currentID: story.shortID,
				date: timeSince(story.changedat),
				ISO8601: story.changedat.toISOString(),
				views: story.views,
				siblings: story.siblings,
				starred: false,
				starcount: story.starcount
			});
		}, function() {
			res.status(404);
			res.render('404', {
				title: "Page not found"
			});
		});
	}
});

client.get('/next', function(req, res) {
	req.assert('parent', 'Parent id is required.').notEmpty();
	validateFields(req, res, function() {
		Story.find({
			'parent': req.query.parent,
			'author': req.query.author
		}, function(err, docs) {
			console.log(docs);
			if (!err && docs.length !== 0) {
				var dock = docs[Math.floor(Math.random() * docs.length)];
				if (req.user) {
					User.findOne({
						username: req.user.username
					}, function(err, usr) {
						if (err) {
							failRequest(req, res, "ERROR: Try again later.");
							console.log(err);
						} else {
							var doc = dock.toObject();
							doc["starred"] = usr.starred.includes(dock.shortID);
							console.log(doc);
							completeRequest(req, res, doc, "story/" + dock.shortID);
						}
					});
				} else {
					var doc = dock.toObject();
					doc["starred"] = false;
					console.log(doc);
					completeRequest(req, res, doc, "story/" + dock.shortID);
				}
			} else if (!err && docs.length === 0) {
				Story.find({
					'parent': req.query.parent // [TODO] randomization
				}, function(err, docs) {
					if (!err && docs.length !== 0) {
						var dock = docs[Math.floor(Math.random() * docs.length)];
						if (req.user) {
							User.findOne({
								username: req.user.username
							}, function(err, usr) {
								if (err) {
									failRequest(req, res, "ERROR: Try again later.");
									console.log(err);
								} else {
									var doc = dock.toObject();
									doc["starred"] = usr.starred.includes(dock.shortID);
									console.log(doc);
									completeRequest(req, res, doc, "story/" + dock.shortID);
								}
							});
						} else {
							var doc = dock.toObject();
							doc["starred"] = false;
							console.log(doc);
							completeRequest(req, res, doc, "story/" + dock.shortID);
						}
					} else if (!err && docs.length === 0) {
						failRequest(req, res, "No children.");
					} else {
						console.log('ERROR: Story with parentID ' + req.query.parent + ' not found');
						failRequest(req, res, "Invalid parent ID.");
					}
				});
			} else {
				console.log('ERROR: Story with shortID ' + req.query.id + ' not found');
				failRequest(req, res, "Invalid parent ID.");
			}
		});
	});
});

client.get('/jump', function(req, res) {
	req.assert('parent', 'Story id is required.').notEmpty();
	validateFields(req, res, function() {
		Story.findOne({
			'shortID': req.query.parent
		}, function(err, current) {
			console.log("current = " + current);
			Story.find({
				'parent': current.parent
			}, function(err, sibs) {
				console.log("sibs = " + sibs);
				if (sibs.length > 1) {
					var sib;
					do {
						sib = sibs[Math.floor(Math.random() * sibs.length)];
					} while (sib.shortID == req.query.parent);
					console.log("sib = " + sib);
					if (req.user) {
						User.findOne({
							username: req.user.username
						}, function(err, usr) {
							var sibb = sib.toObject();
							sibb["starred"] = usr.starred.includes(sib.shortID);
							completeRequest(req, res, sibb, "/story/" + sib.shortID);
						});
					} else {
						var sibb = sib.toObject();
						sibb["starred"] = false;
						completeRequest(req, res, sibb, "/story/" + sib.shortID);
					}
				} else {
					failRequest(req, res, "No stories to jump to");
				}
			});
		});
	});
});

client.get('/star', function(req, res) {
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, function(err, usr) {
			if (!usr.starred.includes(req.query.id)) {
				User.update({
						username: req.user.username
					}, {
						$push: {
							starred: req.query.id
						}
					}, {
						upsert: true
					},
					function(err, userinfo) {
						if (err) {
							failRequest(req, res, "Unable to star, try again later");
							console.log(err);
						} else {
							Story.update({
									shortID: req.query.id
								}, {
									$inc: {
										starcount: 1
									}
								}, {
									upsert: true
								},
								function(err, storyinfo) {
									if (err) {
										failRequest(req, res, "Unable to star, try again later");
										console.log(err);
									} else {
										completeRequest(req, res, {
											starred: true
										}, "back", "Starred");
									}
								});
						}
					}
				);
			} else {
				failRequest(req, res, "Story already starred");
			}
		});
	} else {
		failRequest(req, res, "Log in to star");
	}
});

client.get('/unstar', function(req, res) {
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, function(err, usr) {
			if (usr.starred.includes(req.query.id)) {
				User.update({
						username: req.user.username
					}, {
						$pull: {
							starred: req.query.id
						}
					}, {
						upsert: true
					},
					function(err, userinfo) {
						if (err) {
							failRequest(req, res, "Unable to unstar, try again later");
							console.log(err);
						} else {
							Story.update({
									shortID: req.query.id
								}, {
									$inc: {
										starcount: -1
									}
								}, {
									upsert: true
								},
								function(err, storyinfo) {
									if (err) {
										failRequest(req, res, "Unable to unstar, try again later");
										console.log(err);
									} else {
										completeRequest(req, res, {
											starred: false
										}, "back", "Unstarred");
									}
								});
						}
					}
				);
			} else {
				failRequest(req, res, "Story not starred");
			}
		});
	} else {
		failRequest(req, res, "Log in to unstar");
	}
});

client.get('/story/:id/flag', function(req, res) {
	if(req.user) {
		Story.findOne({
			shortID: req.params.id
		}, function(err, story) {
			if(err) {
				failureRedirect(req, res, "Error, unable to flag.");
			}
			else if(story===null) {
				res.status(404);
				res.render('404', {
					title: "Page not found"
				});
			} else if(req.params.id === "0") {
				failureRedirect(req, res, "You can't flag the home node!");
			}
			res.render("flag", story.toObject());
		});
	}
	else {
		failureRedirect(req, res, "You need to log in to flag a story!");
	}
});

client.post('/story/:id/flag', function(req, res) {
	if(req.user) {
		if(req.body.shortID === "0") { failureRedirect(req, res, "You can't flag the home node!"); }
		var newFlag = new Flag({
			shortID: req.body.shortID,
			flagger: req.user.username,
			flagged: req.body.flagged,
			reason: req.body.reason,
			createdat: Date.now(),
			status: "unresolved"
		});
		newFlag.save(function(err) {
			if (err) throw err;
			req.flash("The story was flagged.");
			res.redirect("/story/"+req.body.parent);
		});
	}
	else {
		failureRedirect(req, res, "You need to log in to flag a story!");
	}
});

client.get('/story/:id/edit', function(req, res) {
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, function(err, user) {
			if (err) {
				failRequest(req, res, "Error, unable to edit.");
			}
			Story.findOne({
				"shortID": req.params.id
			}, function(err, story) {
				if (err) {
					failRequest(req, res, "Error, unable to edit.");
				} else if(story===null) {
					res.status(404);
					res.render('404', {
						title: "Page not found"
					});
				} else if (story.author != req.user.username) {
					failRequest(req, res, "You cannot edit this post!");
				} else {
					Story.count({
						"parent": req.params.id
					}, function(err, count) {
						if (err) {
							failRequest(req, res, "Error, unable to edit.");
						} else if (count === 0) {
							res.render("edit", {
								shortID: story.shortID,
								author: story.author,
								starcount: story.starcount,
								content: story.content
							});
						} else {
							failRequest(req, res, "You cannot edit/remove a post with children.");
						}
					});
				}
			});

		});
	} else {
		failRequest(req, res, "Please Log In.");
	}
});

client.post('/story/:id/edit', function(req, res) {
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, function(err, user) {
			if (err) {
				failRequest(req, res, "Error, unable to edit.");
			}
			Story.findOne({
				shortID: req.body.shortID
			}, function(err, story) {
				if (err) {
					failRequest(req, res, "Error, unable to edit.");
				} else if (story.author != req.user.username) {
					failRequest(req, res, "You cannot edit this post!");
				} else {
					Story.count({
						"parent": req.body.shortID
					}, function(err, count) {
						if (err) {
							failRequest(req, res, "Error, unable to edit.");
						} else if (count === 0) {
							Story.findOneAndUpdate({
								shortID: req.body.shortID
							}, {
								"content": req.body.content
							}, function(err, stry) {
								if (err) {
									failRequest(req, res, "Error, unable to edit.");
								} else {
									io.sockets.to(req.body.shortID).emit("edited", "This page has been edited!");
									res.redirect("/story/" + req.body.shortID);
								}
							});
						} else {
							failRequest(req, res, "You cannot edit/remove a post with children.");
						}
					});
				}
			});

		});
	}
});

client.post('/story/:id/remove', function(req, res) {
	if (req.user) {
		Story.findOne({
			shortID: req.body.shortID
		}, function(err, doc) {
			if (err) {
				failRequest(req, res, "Error, unable to remove.");
			} else if (doc.author == req.user.username) {
				Story.count({
					'parent': req.body.shortID
				}, function(err, count) {
					if (err) {
						failRequest(req, res, "Error, unable to remove.");
					}
					console.log(count);
					var parentID = doc.parent;
					if (count !== 0) {
						console.log("You cannot edit/remove a post with children.");
					} else if (count === 0) {
						User.update({
							starred: req.body.shortID
						}, {
							$pull: {
								starred: req.body.shortID
							}
						}, function(err, info) {
							if (err) {
								failRequest(req, res, "Error, unable to remove.");
							}
							Story.findOneAndRemove({
								shortID: req.body.shortID
							}, function(err) {
								if (err) {
									failRequest(req, res, "Error, unable to remove.");
								}
								io.sockets.to(shortID).emit("removal", "This page has been removed!");
								res.redirect("/story/" + parentID);

							});

						});
					}

				});
			} else {
				failRequest(req, res, "You cannot delete someone else's post!");
			}
		});
	} else {
		failRequest(req, res, "Please Log In.");
	}
});

function validateFields(req, res, callback) {
	var errors = req.validationErrors();
	if (errors) {
		failRequest(req, res, errors);
	} else {
		callback();
	}
}

function completeRequest(req, res, data, redirect, success) {
	if (req.xhr) {
		res.json({
			status: "success",
			message: success,
			data: data || false
		});
	} else {
		if (success) req.flash("success", success);
		res.redirect(redirect || "back");
	}
	return;
}

function failRequest(req, res, errors) {
	if (!errors) console.warn("Please include a user-friendly error message.");
	if (req.xhr) {
		res.json({
			status: "failed",
			message: errors
		});
	} else {
		req.flash("error", errors);
		res.redirect("back");
	}
	return;
}


client.post('/create', function(req, res) {
	if (!req.user) return failRequest(req, res, "You need to be logged in.");
	req.assert('parent', 'Parent is required.').notEmpty();
	req.assert('content', 'Some text is required.').notEmpty();
	validateFields(req, res, function() {
		attemptCreation(randomString());
	});

	function attemptCreation(shortID) {
		console.log(shortID);
		Story.findOne({
			'shortID': shortID
		}, 'author', function(err, story) {
			if (err) return handleError(err); // [TODO] handleError
			if (story) { // story with that ID already exists, so new ID
				attemptCreation(randomString());
			} else {
				io.sockets.to("edits").to(shortID).emit("children", "Unable to edit: a child was created!");
				var test = new Story({
					shortID: shortID,
					parent: req.body.parent, // [TODO] check if exists
					author: req.user.username,
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
				var testt = test.toObject(); // expert naming convention
				testt["starred"] = false;
				io.sockets.to(req.body.parent).emit("haschildren", "You cannot edit your post anymore. Someone has continued your story/");
				completeRequest(req, res, testt, '/story/' + shortID, "Save successful!");
			}
		});
	}
});

client.get('/user/username/starred', function(req, res) {
	//should return HTML
});

client.get('/mine', function(req, res) {
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, function(err, usr) {
			Story.find({
				author: req.user.username
			}, function(err, stories) {
				Story.find({
					shortID: {
						$in: usr.starred
					}
				}, function(err, starred) {
					res.render("mine", {
						user: req.user,
						username: req.user.username,
						story: stories,
						starred: starred
					});
				})
			});
		});
	} else {
		failRequest(req, res, "Please log in!");
	}
});

client.get('/user/:usr', function(req, res) {
	if (req.user && req.params.usr === req.user.username) {
		res.redirect("/mine");
	} else {
		User.findOne({
			username: req.params.usr
		}, function(err, user) {
			if (user) {
				Story.find({
					author: user.username
				}, function(err, stories) {
					console.log(user);
					res.render("user", {
						user: user,
						username: user.username,
						story: stories
					});
				});
			} else {
				res.redirect("404");
			}
		});
	}
});

client.get('/mine/preferences', function(req, res) {
	console.log("REQ.USER = " + req.user);
	if (req.user) {
		User.findOne({
			username: req.user.username
		}, function(err, user) {
			if (user) {
				res.render('preferences', {
					username: user.username,
					email: user.email,
					timeCreated: user.createdat
				});
			}
		});
	} else {
		failRequest(req, res, "Please log in!");
	}
});

client.post('/mine/preferences', function(req, res) {
	if (req.body.username) {
		User.update({
			username: req.user.username
		}, {
			username: req.body.username,
			email: req.user.email,
			password: req.user.password,
			createdat: req.user.createdat,
			changedat: Date.now(),
			starred: req.user.starred,
			preferences: req.user.preferences
		}, function(err, numberAffected, rawResponse) {
			console.log("req.user.username = " + req.user.username);
			console.log("req.body.username = " + req.body.username);
			res.redirect("/login");
		});
	}
	if (req.body.email) {
		User.update({
			username: req.user.username
		}, {
			username: req.user.username,
			email: req.body.email,
			password: req.user.password,
			createdat: req.user.createdat,
			changedat: Date.now(),
			starred: req.user.starred,
			preferences: req.user.preferences
		}, function(err, numberAffected, rawResponse) {
			console.log("req.user.email = " + req.user.email);
			console.log("req.body.email = " + req.body.email);
			res.redirect("/login");
		});
	}
	if (req.body.password) {
		User.update({
			username: req.user.username
		}, {
			username: req.user.username,
			email: req.user.email,
			password: req.user.password,
			createdat: req.user.createdat,
			changedat: Date.now(),
			starred: req.user.starred,
			preferences: req.user.preferences
		}, function(err, numberAffected, rawResponse) {
			res.redirect('/login');
		});
	}
});

//Uses multiple kinds of requests, 'get' is just a placeholder
client.get('/login', function(req, res) {
	//should return HTML
	if (!req.user) {
		res.render("login", {
			title: "Log In"
		});
	} else {
		res.redirect("back");
	}
});

client.post('/login', passport.authenticate('local-login', {
	successRedirect: '/', // redirect to the secure profile section
	failureRedirect: '/login', // redirect back to the signup page if there is an error
	failureFlash: true // allow flash messages
}));

//Uses multiple kinds of requests, 'get' is just a placeholder
client.get('/signup', function(req, res) {
	//should return HTML
	res.render("signup", {
		title: "Sign up"
	});
});

client.post('/signup', passport.authenticate('local-signup', {
	successRedirect: '/', // redirect to the secure profile section
	failureRedirect: '/signup', // redirect back to the signup page if there is an error
	failureFlash: true // allow flash messages
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

function timeSince(date) {

	var seconds = Math.floor((new Date() - date) / 1000);

	var interval = Math.floor(seconds / 31536000);

	if (interval > 1) {
		return interval + " years";
	}
	interval = Math.floor(seconds / 2592000);
	if (interval > 1) {
		return interval + " months";
	}
	interval = Math.floor(seconds / 86400);
	if (interval > 1) {
		return interval + " days";
	}
	interval = Math.floor(seconds / 3600);
	if (interval > 1) {
		return interval + " hours";
	}
	interval = Math.floor(seconds / 60);
	if (interval > 1) {
		return interval + " minutes";
	}
	return Math.floor(seconds) + " seconds";
}
