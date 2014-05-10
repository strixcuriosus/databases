var read = require('fs').readFile;
var ext = require('path').extname;
var mysql = require('mysql');

var dbConnection = mysql.createConnection({
  user: "root",
  password: "",
  database: "chat"
});

// var cache = {};

// cache.chatterbox = [];

var handleRequest = function(request, response) {

  console.log("Serving request type " + request.method + " for url " + request.url);

  var question = request.url.indexOf('?');
  var url = (question === -1) ? request.url : request.url.substr(0, question);
  var options = request.url.substr(question).split('&');
  url = (url === '/') ? '/index.html' : url;
  var isFile = ext(url).length;

  switch (request.method) {
    case 'GET':
      isFile ? getFile(url, ext(url), response) : getObject(url, response, options);
      return;
    case 'OPTIONS':
      response.writeHead(200, defaultCorsHeaders);
      response.end();
      return;
    case 'POST':
      if (!isFile) {
        postObject(request, response, options);
        return;
      }
  }

  response.writeHead(500, defaultCorsHeaders);
  response.end();
};

var getFile = function(url, ext, response, options) {
  read('client' + url, function(err, data) {
    if (err) {
      response.writeHead(404, defaultCorsHeaders);
      response.end();
    } else {
      var contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript'
      };

      var headers = defaultCorsHeaders;
      headers['Content-Type'] = contentType[ext];
      console.log(ext, contentType[ext]);

      response.writeHead(200, headers);
      response.end(data);
    }
  });
};

var getObject = function(url, response, options) {

  // var key = url.substr(1);
  // var array = cache[key];

  var headers = defaultCorsHeaders;

  // if (array === undefined) {
  //   response.writeHead(404, headers);
  //   response.end();
  //   return;
  // }

  headers['Content-Type'] = 'application/json';

  var querystring = "SELECT users.username, messages.text, messages.created_at FROM messages, users WHERE messages.user_id = users.id;";
  dbConnection.query(querystring, function(err, messages){
    response.writeHead(200, headers);
    response.end(JSON.stringify({results: messages}));
  });
};

var postObject = function(request, response, options) {
  var message = '';

  request.on('data', function(data) {
    message += data;
  });
  request.on('end', function() {
    message = JSON.parse(message);
    var createdAt = (new Date().toISOString().slice(0, 19).replace('T', ' '));
    var updatedAt = (new Date().toISOString().slice(0, 19).replace('T', ' '));
    message.createdAt = createdAt;
    message.updatedAt = updatedAt;

    // var key = request.url.substr(1);
    // var array = cache[key] || (cache[key] = []);

    // array.push(message);
    var headers = defaultCorsHeaders;
    headers['Content-Type'] = 'application/json';

    var userId, roomId;

    //Attempt to save user to database
    var handleUsername = function(){
      dbConnection.query("INSERT INTO users (username) VALUES ('" + message.username + "');", function(err, sqlResponse){
      console.log(sqlResponse + 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        dbConnection.query("SELECT id FROM users WHERE username='" + message.username + "';", function(err, sqlResponse){
          console.log("SELECT id FROM users WHERE username='" + message.username + "';");
          console.log(sqlResponse + 'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY');
          userId = sqlResponse[0].id;
          handleRoomname();
        });
      });
    };

    var handleRoomname = function(){
      console.log(message);
      dbConnection.query("INSERT INTO rooms (name) VALUES ('" + message.roomname + "');", function(err, sqlResponse){
        dbConnection.query("SELECT id FROM rooms WHERE name='" + message.roomname + "';", function(err, sqlResponse){
          roomId = sqlResponse[0].id;
          handleMessage();
        });
      });
    };

    var handleMessage = function(){
      dbConnection.query("INSERT INTO messages (text, created_at, user_id, room_id) VALUES ('" + message.text + "','" + message.createdAt + "','" + userId + "','" + roomId + "');", function(){
        response.writeHead(201, headers);
        response.end(JSON.stringify({
          createdAt: createdAt,
          updatedAt: updatedAt
        }));
      });
    };

    handleUsername();

  });
};

/* These headers will allow Cross-Origin Resource Sharing (CORS).
 * This CRUCIAL code allows this server to talk to websites that
 * are on different domains. (Your chat client is running from a url
 * like file://your/chat/client/index.html, which is considered a
 * different domain.) */
var defaultCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept",
  "access-control-max-age": 10 // Seconds.
};

module.exports = {
  handleRequest: handleRequest,
  handler: handleRequest
};
