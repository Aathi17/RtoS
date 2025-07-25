import React, { useState } from 'react';
import socket from './socket';
import Lottie from 'lottie-react';
import animationData from './assets/ContactUs.json'; // ✅ your Lottie file
import './App.css';

function JoinRoom({ setUsername, setRoomId, setJoined }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  const createRoom = () => {
    if (!name) return;
    socket.emit('create_room', { username: name }, ({ roomId }) => {
      setUsername(name);
      setRoomId(roomId);
      setJoined(true);
    });
  };

  const joinRoom = () => {
    if (!name || !room) return;
    socket.emit('join_room', { roomId: room, username: name }, (res) => {
      if (res.success) {
        setUsername(name);
        setRoomId(room);
        setJoined(true);
      } else {
        alert(res.message);
      }
    });
  };

  return (
    <div className="App">
      {/* ✅ Background Lottie */}
      <Lottie animationData={animationData} loop autoplay className="lottie-bg" />

      <div className="join-room">
        <h2>RtoS – Ready to Speak 💬</h2>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Enter Room ID (or create one)"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={createRoom}>Create Room</button>
        <button onClick={joinRoom}>Join Room</button>
      </div>

      {/* ✅ Footer */}
      <footer className="footer">
        All rights reserved © Athish Muthukumar 2025
      </footer>
    </div>
  );
}

export default JoinRoom;
