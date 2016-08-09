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
var mongo = require('mongodb');
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
    res.locals.url = "http://localhost:3000" + req.originalUrl;
    next();
});

User.find(function(err, stories) {
    if (err) return console.error(err);
    //console.dir(stories);
});

Story.collection.drop(); //For testion purposes, deletes all previous stories on startup

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
	if(req.user) {
		User.findOne({username: req.user.username}, "starred", function(err, user) {
			load(0, function(stories, story) {
				res.render('index', {
					bodyclass: "longer",
					story: stories,
					currentID: story.shortID,
					date: timeSince(story.changedat),
					ISO8601: story.changedat.toISOString(),
					views: story.views,
					siblings: story.siblings,
					starred: ((user.starred.includes("0"))?true:false)
				});
			});
		});
    }
	else {
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
    load(req.params.id, function(stories, story) {
        res.render('index', {
            bodyclass: "longer",
            story: stories,
            currentID: story.shortID,
            date: timeSince(story.changedat),
            ISO8601: story.changedat.toISOString(),
            views: story.views,
            siblings: story.siblings
        });
    }, function() {
        res.status(404);
        res.render('404', {
            title: "Page not found"
        });
    });
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
                var random = Math.floor(Math.random() * docs.length);
                var dock = docs[random];

                console.log(dock);
                completeRequest(req, res, false, "story/" + dock.shortID, dock);
            } else if (!err && docs.length === 0) {
                Story.find({
                    'parent': req.query.parent // [TODO] randomization
                }, function(err, docs) {
                    if (!err && docs.length !== 0) {
                        // [TODO] show relevant content
                        var random = Math.floor(Math.random() * docs.length);
                        var dock = docs[random];
                        completeRequest(req, res, false, "story/" + dock.shortID, dock);
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
    req.assert('id', 'Error: Story ID is required.').notEmpty();
    validateFields(req, res, function() {
        var parameters = {
            id : req.query.id
        };
        if (req.query.sameauthor) parameters.author = req.query.author; // should be parent author ID
        User.findOne(parameters, function(err, child) {
            if (err) {
                return failRequest(req, res, "Error, try again later!");
            }
			else {
				User.find({parent: child.parent}, function(err, stories) {
					var story;
					do {
						story = stories[Math.floor(Math.random()*stories.length)];
					} while (story.shortID == req.query.id);
					completeRequest(req, res, "Jumped!", "/story/"+story.shortID);
				});
			}
        });
    });
});

client.get('/star', function(req, res) {
	console.log("Starring...\n");
    User.update({
            username: req.user.username
        }, {
            $push: {
                starred: req.query.id
            }
        }, {
            upsert: true
        },
        function(err, user) {
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
                function(err, story) {
                    if (err) {
                        failRequest(req, res, "Unable to star, try again later");
                        console.log(err);
                    } else {
						completeRequest(req, res, "Starred", "/story/" + req.query.shortid, {starred: true});
                    }
                });
            }
        }
    );
});

client.get('/unstar', function(req, res) {
	console.log("Unstarring...\n");
    User.update({
            username: req.user.username
        }, {
            $pull: {
                starred: req.query.id
            }
        }, {
            upsert: true
        },
        function(err, user) {
            if (err) {
                failRequest(req, res, "Unable to star, try again later");
                console.log(err);
            } else {
                console.log(user);
                Story.update({
					shortID: req.query.id
				}, {
					$inc: {
						starcount: -1
					}
				}, {
					upsert: true
				},
				function(err, story) {
					if (err) {
						failRequest(req, res, "Unable to star, try again later");
						console.log(err);
					} else {
						completeRequest(req, res, "Starred", "/story/" + req.query.shortid, {starred: false});
					}
				});
            }
        }
    );
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
    newFlag.save(function(err) {
        if (err) throw err;
    });
});

client.post('/:id/edit', function(req, res) {

});

client.post('/:id/remove', function(req, res) {
    validateFields(req, res, function() {
        Story.find({
            'parent': req.query.parent
        }, function(err, docs) {
            console.log(docs);
            if (!err && docs.length !== 0) {
                console.log("Document " + req.query.parent + " cannot be deleted because it has children.");
            } else if (!err && docs.length === 0) {
                Story.find({
                    'parent': req.query.parent
                }).remove();
            } else {
                console.log('ERROR: Story with parentID ' + req.query.parent + ' not found');
                failRequest(req, res, "Invalid parent ID.");
            }
        });
    });
});

function validateFields(req, res, callback) {
    var errors = req.validationErrors();
    if (errors) {
        failRequest(req, res, errors);
    } else {
        callback();
    }
}

function completeRequest(req, res, success, redirect, data) {
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
                completeRequest(req, res, "Save successful!", '/story/' + shortID, test);
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
