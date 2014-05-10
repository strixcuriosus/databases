// YOUR CODE HERE:

(function() {

  // Initial condtion for time filter
  var lastLoaded = "0000-01-01T00:00:00.000Z";

  var messageToHtml = function (message) {
    message.roomname = decodeURI(message.roomname);
    message.username = decodeURI(message.username);
    message.text = decodeURI(message.text);

    var li = $('<li></li>')
      .addClass('chat')
      .data('room' , message.roomname)
      .data('user' , message.username);

    var text = $('<div></div>')
      .addClass('message')
      .text(message.text);

    var user = $('<div></div>')
      .addClass('username')
      .text(message.username)
      .on('click', app.addFriend);

    li.append(user).append(text);

    if (selectedRoom && message.roomname !== selectedRoom) {
      li.hide();
    }

    app.addRoom(message.roomname);

    return li;
  };

  var app = {};

  app.init = function () {};

  app.send = function (message) {
    $.ajax(undefined, {
      url: 'http://127.0.0.1:3000/chatterbox',
      type: 'POST',
      data: JSON.stringify(message),
      contentType: 'application/json'
    });
  };

  app.fetch = function () {
    // stringify the time filter request by building sort/time separately
    var sortFilter = 'order=-updatedAt';
    sortFilter = encodeURI(sortFilter);

    var timeFilter = {
      updatedAt: {
        $gt:  {
          __type: "Date",
          iso: lastLoaded
        }
      }
    };
    timeFilter = 'where=' + JSON.stringify(timeFilter);

    var filter = sortFilter + '&' + timeFilter;

    $.ajax(undefined, {
      url: 'http://127.0.0.1:3000/chatterbox',
      type: 'GET',
      data: filter,
      success: function (data) {
        for (var i = data.results.length - 1; i >= 0; i--) {
          app.addMessage(data.results[i]);
        }

        if (data.results.length) {
          lastLoaded = data.results[0].updatedAt;
        }
      }
    });
  };

  app.clearMessages = function () {
    $('#chats').empty();
  };

  app.addMessage = function (message) {
    $('#chats').prepend(messageToHtml(message));
  };

  app.addRoom= function (room) {
    if (room) {
      if (!$("#roomSelect option[value='" + room + "']").length) {
        var option = $('<option></option>')
          .attr('value', room)
          .text(room);

        $('#roomSelect').append(option);
      }
    }
  };

  app.addFriend = function (e) {
    var user = $(e.target).parent().data('user');

    $('#chats').children().each(function () {
      if ($(this).data('user') === user) {
        $(this).css('font-weight', 'bold');
      }
    });
  };

  var findName = function () {
    var input = window.location.search;
    var start = input.search(/username\=/);
    var end = input.substr(start).search(/\&/);
    return end === -1 ?
      input.substr(start+9) : // 9 is the length of username=
      input.substring(start+9, end+start);
  };

  app.handleSubmit = function() {
    app.send({
      username: findName(), // TODO: get window.location.search
      text: encodeURI($('input#message').val()),
      roomname: encodeURI($('input#roomText').val())
    }); // unsanitary
  };

  var selectedRoom = null;

  app.selectRoom = function(e) {
    var room = $(this).val();

    if (room === 'All Rooms') {
      selectedRoom = null;
      $('#chats').children().show();
    } else {
      selectedRoom = room;
      $('#chats').children().each(function () {
        if ($(this).data('room') === room) {
          $(this).show();
        } else {
          $(this).hide();
        }
      });
    }
  }

  this.app = app;
}() );

$(document).ready(function(){
  var submit = $('#send');
  var room = $('#roomSelect');

  submit.on('submit', function(e) {
    app.handleSubmit();
    e.preventDefault();
    e.stopPropagation();
  });

  room.on('change', app.selectRoom);

  app.fetch();
  setInterval(function(){app.fetch();},1000);
});
