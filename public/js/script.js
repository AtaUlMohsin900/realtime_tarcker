// Connect to the server
const socket = io();

// Log when connected
socket.on('connect', () => {
    console.log('Connected to server with id:', socket.id);
});

// Listen for the 'message' event from the server
socket.on('message', (msg) => {
    console.log('Message from server:', msg);
});

// Log when disconnected
socket.on('disconnect', () => {
    console.log('Disconnected from server');
});