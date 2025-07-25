import { io } from 'socket.io-client';

// Replace with your backend address if hosted
const socket = io('http://localhost:5050');

export default socket;
