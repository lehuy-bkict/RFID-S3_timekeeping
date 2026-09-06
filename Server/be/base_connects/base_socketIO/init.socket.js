const { Server } = require('socket.io');
const http = require('http');

let io = null;
let streamInterval = null;
let isFetchingFrame = false;
let clientCount = 0;

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000';

function fetchCameraFrame() {
  return new Promise((resolve) => {
    const req = http.get(`${AI_SERVICE_URL}/camera/frame`, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(`data:image/jpeg;base64,${buffer.toString('base64')}`);
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function startCameraStreamLoop() {
  if (streamInterval) return;
  streamInterval = setInterval(async () => {
    if (clientCount <= 0 || !io) {
      stopCameraStreamLoop();
      return;
    }
    if (isFetchingFrame) return;
    isFetchingFrame = true;
    try {
      const base64Image = await fetchCameraFrame();
      if (base64Image && io && clientCount > 0) {
        io.emit('camera-frame', {
          image: base64Image,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      // ignore dropped frames
    } finally {
      isFetchingFrame = false;
    }
  }, 65); // ~15 FPS
}

function stopCameraStreamLoop() {
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
  }
}

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    clientCount++;
    console.log(`[Socket] Client connected: ${socket.id} (Total: ${clientCount})`);
    startCameraStreamLoop();

    socket.on('disconnect', () => {
      clientCount = Math.max(0, clientCount - 1);
      console.log(`[Socket] Client disconnected: ${socket.id} (Total: ${clientCount})`);
      if (clientCount === 0) {
        stopCameraStreamLoop();
      }
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io chưa được khởi tạo.");
  }
  return io;
}

module.exports = {
  initSocket,
  getIO
};
