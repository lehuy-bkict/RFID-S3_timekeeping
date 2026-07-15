import io from 'socket.io-client';
import { toast } from 'react-toastify';

const SOCKET_URL = 'http://localhost:8999';

class SocketService {
  socket = null;

  connect() {
    if (this.socket) return;        

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],     
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected, id =', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connect error:', err.message);
    });

    this.socket.on('rfid-scan', this.handleRfidScan);
  }

  handleRfidScan = (data) => {
    console.log('[Socket] rfid-scan:', data);

    toast.success(`📡 RFID ${data.rfid} (device ${data.device})`);
  };

  disconnect() {
    if (this.socket) {
      this.socket.off('rfid-scan', this.handleRfidScan);
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;
