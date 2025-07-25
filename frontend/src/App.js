import React, { useState } from 'react';
import JoinRoom from './JoinRoom';
import Chat from './Chat';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);

  return (
    <div className="App">
      {!joined ? (
        <JoinRoom
          setUsername={setUsername}
          setRoomId={setRoomId}
          setJoined={setJoined}
        />
      ) : (
        <Chat username={username} roomId={roomId} />
      )}
    </div>
  );
}

export default App;
