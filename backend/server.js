const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express(); // ✅ Declare app BEFORE using it
const server = http.createServer(app);

// -------------------- Middleware --------------------
app.use(cors());
app.use(express.json());

// ✅ File Upload Route Setup (Image, PDF, etc.)
const uploadRoutes = require('./routes/upload');
app.use('/api', uploadRoutes);

// ✅ Serve uploads and voice files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/voice', express.static(path.join(__dirname, 'uploads/voice'))); // ✅ NEW

// ✅ Mount Voice Upload Route
const uploadVoiceRoute = require('./routes/uploadVoice'); // ✅ NEW
app.use('/api/voice', uploadVoiceRoute); // ✅ NEW

// -------------------- Socket.IO Setup --------------------
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// -------------------- MongoDB Connection --------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.once('open', () => console.log('✅ MongoDB Connected'));

// -------------------- MongoDB Schemas --------------------
const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  users: [String],
});

const messageSchema = new mongoose.Schema({
  roomId: String,
  author: String,
  message: String,
  file: {
    name: String,
    url: String,
    mimetype: String,
  },
  time: String,
});

const Room = mongoose.model('Room', roomSchema);
const Message = mongoose.model('Message', messageSchema);

// -------------------- Socket.IO Events --------------------
const usersInRoom = {};

io.on('connection', (socket) => {
  console.log(`✅ New connection: ${socket.id}`);

  socket.on('create_room', async ({ username }, callback) => {
    const roomId = generateRoomId();
    try {
      const room = new Room({ roomId, users: [username] });
      await room.save();

      socket.username = username;
      socket.roomId = roomId;
      socket.join(roomId);

      usersInRoom[roomId] = [username];
      io.to(roomId).emit('update_user_list', usersInRoom[roomId]);
      callback({ roomId });

      console.log(`🆕 Room created: ${roomId} by ${username}`);
    } catch (err) {
      callback({ error: 'Room creation failed' });
    }
  });

  socket.on('join_room', async ({ roomId, username }, callback) => {
    const room = await Room.findOne({ roomId });
    if (!room) return callback({ success: false, message: 'Room not found' });

    if (usersInRoom[roomId]?.includes(username)) {
      return callback({ success: false, message: 'Username already taken in this room' });
    }

    if (!room.users.includes(username)) {
      room.users.push(username);
      await room.save();
    }

    socket.username = username;
    socket.roomId = roomId;
    socket.join(roomId);

    if (!usersInRoom[roomId]) usersInRoom[roomId] = [];
    usersInRoom[roomId].push(username);

    io.to(roomId).emit('update_user_list', usersInRoom[roomId]);
    socket.to(roomId).emit('system_message', `${username} joined the room`);
    callback({ success: true });

    console.log(`👥 ${username} joined room ${roomId}`);
  });

  socket.on('typing', ({ roomId, username }) => {
    socket.to(roomId).emit('user_typing', { username });
  });

  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing');
  });

  // ✅ Message sending (text + file + voice)
  socket.on('send_message', async ({ roomId, message, username, file, time }) => {
    const msg = new Message({
      roomId,
      author: username,
      message,
      file: file || null,
      time: time || new Date().toLocaleTimeString(),
    });

    await msg.save();

    io.to(roomId).emit('receive_message', {
      username,
      message,
      file,
      time: msg.time,
    });
  });

  socket.on('disconnecting', async () => {
    const roomId = socket.roomId;
    const username = socket.username;

    if (roomId && username) {
      if (usersInRoom[roomId]) {
        usersInRoom[roomId] = usersInRoom[roomId].filter((u) => u !== username);
        io.to(roomId).emit('update_user_list', usersInRoom[roomId]);
      }

      io.to(roomId).emit('system_message', `${username} left the room`);

      const room = await Room.findOne({ roomId });
      if (room && room.users.includes(username)) {
        room.users = room.users.filter((u) => u !== username);
        await room.save();
      }

      console.log(`❌ ${username} disconnected from ${roomId}`);
    } else {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    }
  });
});

// -------------------- Helper --------------------
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
