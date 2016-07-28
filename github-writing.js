var express = require('express');
var client = express();

var handlebars = require('express-handlebars').create({
    defaultLayout: 'main'
});
client.engine('handlebars', handlebars.engine);
client.set('view engine', 'handlebars');

client.set('port', process.env.PORT || 3000);

client.use(express.static(__dirname + '/public'));

client.get('/', function(req, res) {
    res.render("index");
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

client.post('/placeholder-shortID/create', function(req, res) {

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
});

//Uses multiple kinds of requests, 'get' is just a placeholder
client.get('/signup', function(req, res) {
  //should return HTML
});

client.use(function(req, res) {
    res.status(404);
    res.render('404');
});

client.listen(client.get('port'), function() {
    console.log('Express has started on http://localhost:' + client.get('port') + '; press Ctrl-C to terminate.');
})
