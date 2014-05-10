var read = require('fs').readFile;
var ext = require('path').extname;

var Sequelize = require("sequelize");
var sequelize = new Sequelize("chats", "root", "");

var User = sequelize.define('users', {
  username: Sequelize.STRING
});

var Message = sequelize.define('messages', {
  text: Sequelize.TEXT
});

var Room = sequelize.define('rooms', {
  name: Sequelize.STRING
});

User.hasMany(Message);
Message.belongsTo(User);
Message.belongsTo(Room);

User.sync();
Message.sync();
Room.sync();

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
  console.log('getfile');
  read('./../client' + url, function(err, data) {
    console.log(err, url, data);
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

  var headers = defaultCorsHeaders;

  headers['Content-Type'] = 'application/json';

  var querystring = "SELECT users.username, messages.text, messages.createdAt FROM messages, users WHERE messages.userId = users.id;";
  sequelize.query(querystring).success(function(messages){
    response.writeHead(200, headers);
    response.end(JSON.stringify({results: messages}));
  });

  // Message.findAll({include: [User]}).success(function(messages){
  //   response.writeHead(200, headers);
  //   response.end(JSON.stringify({results: messages}));
  // });
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

    var headers = defaultCorsHeaders;
    headers['Content-Type'] = 'application/json';

    var handleUsername = function(){
      User.find({ where: {username: message.username}})
      .success(function(user){
        console.log('HANDLE USERNAME: ' + user);
        if(user){
          handleRoomname(user);
        } else {
          var newUser = User.build({username: message.username});
          newUser.save().success(function(user){
            handleRoomname(user);
          });
        }
      });
    };

    var handleRoomname = function(user){
      Room.find({ where: {name: message.roomname}})
      .success(function(room){
        if(room){
          handleMessage(room, user);
        } else {
          var newRoom = User.build({name: message.roomname});
          newRoom.save().success(function(room){
            handleMessage(room, user);
          });
        }
      });
    };

    var handleMessage = function(room, user){
      console.log('HANDLE MESSAGE', user);
      console.log('HANDLE MESSAGE', room);
      var newMessage = Message.build({
        text: message.text
      });

      newMessage.save().success(function(){
        console.log('message saved', user);
        newMessage.setUser(user).success(function(){
          console.log('user set', room);
          newMessage.setRoom(room).success(function(){
            console.log('room set + response end');
            response.writeHead(201, headers);
            response.end(JSON.stringify({
              createdAt: createdAt,
              updatedAt: updatedAt
            }));
          });
        });
      });
    };

    handleUsername();

  });
};

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
