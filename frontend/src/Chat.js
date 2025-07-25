import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import './App.css';


function Chat({ username, roomId }) {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [typingUser, setTypingUser] = useState('');
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [theme, setTheme] = useState('light');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send_message', {
        username,
        roomId,
        message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setMessage('');
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { roomId, username });

    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socket.emit('stop_typing', { roomId });
    }, 1000);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      socket.emit('send_message', {
        username,
        roomId,
        message: '',
        file: {
          name: data.name,
          url: data.url,
          mimetype: data.type,
        },
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`);

        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await res.json();

          socket.emit('send_message', {
            username,
            roomId,
            message: '',
            type: 'voice',
            file: {
              name: data.name,
              url: data.url,
              mimetype: data.type,
            },
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } catch (err) {
          console.error('Voice message upload failed:', err);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error('Could not start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
  }, [theme]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setChatLog((prev) => [...prev, { type: 'chat', ...data }]);
      scrollToBottom();
    });

    socket.on('system_message', (msg) => {
      setChatLog((prev) => [...prev, { type: 'system', message: msg }]);
      scrollToBottom();
    });

    socket.on('user_left', (leftUsername) => {
      setChatLog((prev) => [...prev, { type: 'system', message: `${leftUsername} left the room.` }]);
    });

    socket.on('user_typing', ({ username }) => {
      setTypingUser(username);
    });

    socket.on('user_stop_typing', () => {
      setTypingUser('');
    });

    socket.on('update_user_list', (userList) => {
      console.log("user list : ",userList)
      setUsersInRoom(userList);
    });

    return () => {
      socket.off('receive_message');
      socket.off('system_message');
      socket.off('user_left');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('update_user_list');
    };
  }, []);

  console.log("users in room :", usersInRoom)

  return (
    <div className="chat-layout" style={{
    // backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${chatBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    minHeight: '100vh',
    width: '100%',
  }}
    >
      <div className="chat-overlay" />
      <div className="chat-sidebar">
        <h3>
          <img
            src="people-svgrepo-com.svg"
            alt="Roommates"
            style={{ height: '20px', verticalAlign: 'middle', marginRight: '6px' }}
          />
          Members
        </h3>
        <ul>
          {usersInRoom.map((user, index) => (
            <li key={index}>
              <div className="user-avatar">{user[0].toUpperCase()}</div>
              <span>{user}</span>
              <div className="user-status-dot"></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-wrapper">
        <div className="chat-header">
          <div className="chat-logo-container">
            <img
              src="Transparant_logo.png"
              alt="Ready to Speak"
              className="chat-logo"
            />
          </div>
          <div className="chat-header-controls">
            <h3>Room: {roomId}</h3>
            <div>
              <button onClick={toggleTheme}>
                {theme === 'light' ? '☀ Light' : '🌙 Dark'}
              </button>
              <button onClick={() => window.location.reload()}>Exit</button>
            </div>
          </div>
        </div>

        <div className="chat-box">
          {chatLog.map((msg, index) =>
            msg.type === 'system' ? (
              <div key={index} className="system-message fade-in">
                <em>{msg.message}</em>
              </div>
            ) : (
              <div
                key={index}
                className={`message-bubble fade-in ${msg.username === username ? 'sent' : 'received'}`}
              >
                {msg.file ? (
                  msg.file.mimetype.startsWith('image') ? (
                    <img src={msg.file.url} alt={msg.file.name} className="chat-image" />
                  ) : msg.file.mimetype.startsWith('video') ? (
                    <video src={msg.file.url} controls className="chat-video" />
                  ) : msg.file.mimetype.startsWith('audio') ? (
                    <audio controls className="chat-audio">
                      <source src={msg.file.url} type={msg.file.mimetype || 'audio/webm'} />
                      Your browser does not support the audio element.
                    </audio>
                  ) : (
                    <a href={msg.file.url} download className="chat-file-link">
                      📄 {msg.file.name}
                    </a>
                  )
                ) : (
                  <p>{msg.message}</p>
                )}
                <small>
                  {msg.username === username ? 'You' : msg.username} • {msg.time}
                </small>
              </div>
            )
          )}
          <div ref={chatEndRef} />
        </div>

        {typingUser && (
          <div className="typing-indicator bounce">
            <em>{typingUser} is typing...</em>
          </div>
        )}

        <div className="chat-input">
          <input
            type="file"
            id="fileInput"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button onClick={() => document.getElementById('fileInput').click()}>📎</button>
          <input
            type="text"
            value={message}
            placeholder="Type a message..."
            onChange={handleTyping}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
          <button
            onClick={recording ? stopRecording : startRecording}
            title={recording ? 'Stop Recording' : 'Start Recording'}
          >
            {recording ? (
              '⏹️'
            ) : (
              <img
                src="/microphone-svgrepo-com.svg"
                alt="Mic"
                style={{ height: '20px', verticalAlign: 'middle' }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
