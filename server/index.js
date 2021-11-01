const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const {PORT} = process.env;
const http = require('http');
const frontEnd = path.resolve(__dirname, '..', 'client', 'dist');
const session = require('express-session');
const passport = require('passport');

const passportSetup = require('../config/passport-setup');
const userRouter = require('./routes/userRouter.js');
const {Message} = require('./routes/message/messages.js');
const {Room} = require('./routes/message/rooms.js');
const {Users} = require('./routes/message/directMessage.js');
const {Conversation} = require('./routes/message/converations.js');
const {Upload} = require('./routes/MusicUpload/musicUpload.js');
const {db} = require('../db');
const auth = require('./routes/authenticate');
const {form} = require('./routes/form.js');
const post = require('./routes/Posts/ProfilePosts');
const follow = require('./routes/Follow/Follows');
const events = require('./routes/events/events.js');
const artist = require('./routes/artist.js');
const mailingList = require('./routes/mailingList.js');
const kEvents = require('./routes/events/krewesicEvents.js');
const cookieParser = require('cookie-parser');


//for video streaming
const {v4: uuidv4} = require('uuid');
const virtualEvent = require('./routes/virtualEvent.js');
const {ExpressPeerServer} = require('peer');
const _ = require('underscore');



//create the server
const server = http.createServer(app);

//create peer express server
// const peerServer = ExpressPeerServer(server, {
//   debug: true,
//   path: '/p2p'
// });

app.use(express.static(frontEnd));
app.use(express.json());
//use cookie parser
app.use(cookieParser());

//Socket io  getting started//
const io = require('socket.io')(server);

//Socket server
//holds alll users that are online
let users = [];

const liveStreamUsers = {}; //this gonna hold the rooms and their arrays {roomId: [user1, user2...]}
const removeLiveStreamUser = (socketId, showId) => {
  for (show in liveStreamUsers) {
    liveStreamUsers[show] = liveStreamUsers[show].filter(user => user.socketId !== socketId); 
  }
 
};

//function to add user to the array
const addUser = (userId, socketId) => {
  //check inside users array, if the same user is already inside users
  //do not add user
  !users.some(user => user.userId === userId) && users.push({ userId, socketId});
};

const removeUser = (socketId) => {
  users = users.filter(user => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};
io.on('connection', socket => {
  //when connect
  console.info(`user ${socket.id} is connected`);

  //***FOR LIVE CHAT FOR ALL USERS*** when a message is sent
  socket.on('message', ({ name, message}) => {
    io.emit('message', {name, message});
  });

  //if you want to send one client
  //use: io.to(socketID).emit

  //after every connection, take userId and socketId from user
  //take from the client socket
  socket.on('addUser', userId => {
    addUser(userId, socket.id);

    io.emit('getUsers', users);
  });

  //***PRIVATE MESSAGE****send and get a message
  //socket.on, take from the client
  socket.on('sendMessage', ({senderId, receiverId, text, name}) => {
    //find specific user to send message
    const user = getUser(receiverId);

    //send data back to certain user send to client
    io.to(user.socketId).emit('getMessage', {
      senderId,
      text,
      name
    });
  });

  //****for streaming features */
  socket.on('joinShow', ({showId, userId, name}) => {
    //console.log('join show event, showId then userId', showId, userId);
    const idObj = {socketId: socket.id, peerId: userId};
    if (liveStreamUsers[showId]) {
      liveStreamUsers[showId].push(idObj);
    } else {
      liveStreamUsers[showId] = [idObj];
    }
    // console.log('lsusid', liveStreamUsers[showId])
    socket.join(showId);

    socket.to(showId).emit('user-connected', {name: name, latestUser: userId, allUsers: liveStreamUsers[showId]}); /**changed this restructure the data on the front end!!!! */
  });


  socket.on('peerconnected', (data) => {
    const {showId, userId, name} = data;
    const idObj = {socketId: socket.id, peerId: userId};
    if (showId && userId) {
      if (liveStreamUsers[showId] === undefined) {
        liveStreamUsers[showId] = idObj;
      } else if (liveStreamUsers[showId] && !liveStreamUsers[showId].map(obj => obj.peerId).includes(userId)) {
        liveStreamUsers[showId].push(idObj);
      }
      socket.to(showId).emit('anotherPeerHere', {name: name, latestUser: userId, allUsers: liveStreamUsers[showId]}); /**changed this restructure the data on the front end!!!! */

    }
   
  });

  socket.on('liveStreamMessage', (messageObj) => {
    const {showId, message} = messageObj;
    // console.log('showId', showId, 'message', message);
    socket.to(showId).emit('receiveLiveStreamMessage', messageObj );
  });




  //****end events related to streaming features */

  //When disconnect
  socket.on('disconnect', () => {
    //if there are any disconnections
    console.info('disconnected user', socket.id);
    removeUser(socket.id);
    removeLiveStreamUser(socket.id); //this needs to account for peerId not socketId because the users are via peerId
    io.emit('getUsers', users);
  });
});

app.get('/virtualEventUsers/:showId', async (req, res) => {
  try {
    const {showId} = req.params;
    //console.log(liveStreamUsers);
    //console.log(liveStreamUsers[showId]);
    res.status(201).send(liveStreamUsers[showId]);
  } catch (err) {
    console.warn(err);
    res.sendStatus(500);
  }
});



app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', auth);
app.use('/form', form);
app.use('/messages', Message);
app.use('/roomChat', Room);
app.use('/directMessage', Users);
app.use('/chat', Conversation);
app.use('/upload', Upload);
app.use('/events', events);
app.use('/artist', artist);
app.use('/mailingList', mailingList);
app.use('/krewesicevents', kEvents);
app.use('/userProf', userRouter);
app.use('/follow', follow);
app.use('/virtualEvent', virtualEvent);

app.use('/post', post);



app.get('*', (req, res) => {
  res.sendFile(path.resolve(frontEnd, 'index.html'));

});
/* eslint-disable */
server.listen(PORT, ()=> {
  //console.log(`listening on port ${PORT}`);
});
