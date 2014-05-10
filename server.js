/* Import node's http module: */
//var handleRequest = require("./request-handler.js").handleRequest;
//var server = require("http").createServer(handleRequest);
var express = require("express");
var bodyParser = require("body-parser");
var app = express();

var defaultCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 10 // Seconds.
};

var port = 3000;

var cache = {};
cache.chatterbox = [];

// Set CORS headers
app.use('/', function(req, res, next) {
  res.set(defaultCorsHeaders);
  next();
});

// Allow CORS
app.options('/:key', function(req, res, next) {
  res.status(200);
  res.end();
});

// Post
app.post('/:key', bodyParser(), function(req, res, next) {
  var array = cache[req.params.key] || (cache[req.params.key] = []);
  var message = req.body;

  var createdAt = (new Date()).toISOString();
  var updatedAt = (new Date()).toISOString();
  message.createdAt = createdAt;
  message.updatedAt = updatedAt;

  array.push(message);

  res.status(201);
  res.end(JSON.stringify({
    createdAt: createdAt,
    updatedAt: updatedAt
  }));
});

// Get
app.get('/:key', function(req, res, next) {
  var array = cache[req.params.key];

  if (array === undefined) {
    res.status(404);
    res.end();
  } else {
    res.status(200);
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify({results: array}));
  }
});

// Serve static files from /client
app.use('/', express.static(__dirname + '/client'));

var server = app.listen(port, function() {
  console.log("Listening on http://127.0.0.1:%d", server.address().port);
});
