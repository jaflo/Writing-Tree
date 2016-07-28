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
});

client.get('/placeholderID', function(req, res) {
  
})



client.use(function(req, res) {
    res.status(404);
    res.render('404');
});


client.listen(client.get('port'), function() {
    console.log('Express has started on http://localhost:' + client.get('port') + '; press Ctrl-C to terminate.');
})
