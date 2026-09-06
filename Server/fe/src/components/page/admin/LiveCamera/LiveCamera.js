import React, { useEffect, useState, useRef } from 'react';
import { Card, Badge, Row, Col, Alert } from 'react-bootstrap';
import socketService from '../../../../service/serviceLayer/socketService';
import './LiveCamera.scss';

const LiveCamera = () => {
  const [frame, setFrame] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [fps, setFps] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(Date.now());

  useEffect(() => {
    socketService.connect();
    const socket = socketService.getSocket();

    if (!socket) return;

    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      setIsConnected(false);
      setFps(0);
    };

    const handleCameraFrame = (data) => {
      if (data?.image) {
        setFrame(data.image);
        setLastUpdate(Date.now());
        frameCountRef.current += 1;

        const now = Date.now();
        const elapsed = now - lastFpsCalcRef.current;
        if (elapsed >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / elapsed));
          frameCountRef.current = 0;
          lastFpsCalcRef.current = now;
        }
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('camera-frame', handleCameraFrame);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('camera-frame', handleCameraFrame);
    };
  }, []);

  return (
    <div className="manage-account-container live-camera-page">
      <div className="page-header d-flex justify-content-between align-items-center">
        <div>
          <h3 className="page-title">Màn Hình Camera Trực Tiếp</h3>
          <p className="text-muted mb-0">Luồng camera thời gian thực qua Socket.IO • Giám sát góc mặt người dùng tại cổng kiểm soát</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {isConnected && frame ? (
            <Badge bg="danger" className="pulse-live px-3 py-2">
              <span className="live-dot me-2"></span>LIVE • {fps || 15} FPS
            </Badge>
          ) : (
            <Badge bg="secondary" className="px-3 py-2">
              ĐANG KẾT NỐI...
            </Badge>
          )}
        </div>
      </div>

      <Row className="g-4 mt-1">
        <Col lg={8}>
          <Card className="camera-viewport-card border-0 shadow-sm overflow-hidden">
            <Card.Body className="p-0 position-relative camera-screen-wrapper">
              {frame ? (
                <div className="camera-viewport position-relative">
                  <img src={frame} alt="Live Camera Feed" className="camera-feed-img" />
                  
                  {/* Framing Overlay Guide for Face Position */}
                  <div className="face-guide-overlay">
                    <div className="face-target-oval">
                      <span className="guide-label">Góc mặt chính diện</span>
                    </div>
                  </div>

                  <div className="viewport-watermark">
                    <span className="gate-title">ENTRANCE GATE CAMERA</span>
                    <span className="timestamp">
                      {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="camera-loading-placeholder d-flex flex-column align-items-center justify-content-center">
                  <div className="spinner-border text-primary mb-3" role="status"></div>
                  <h5 className="text-white">Đang tải luồng camera từ server...</h5>
                  <p className="text-white-50 small mb-0">Vui lòng đảm bảo server Node.js và AI service đang hoạt động</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-transparent border-0 pt-3 pb-0">
              <h5 className="mb-0">Trạng Thái & Hướng Dẫn</h5>
            </Card.Header>
            <Card.Body>
              <div className="status-item d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Kênh truyền:</span>
                <Badge bg="info">Socket.IO (WebSocket)</Badge>
              </div>
              <div className="status-item d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Chế độ Camera:</span>
                <span className="fw-semibold text-success">Luôn mở (Không lưu đĩa)</span>
              </div>
              <div className="status-item d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Chụp & Đối chiếu:</span>
                <span className="fw-semibold">Khi quẹt thẻ RFID</span>
              </div>
              <div className="status-item d-flex justify-content-between py-2">
                <span className="text-muted">AI Xác thực:</span>
                <span className="fw-semibold">Port 5000 (InsightFace)</span>
              </div>
            </Card.Body>
          </Card>

          <Alert variant="primary" className="border-0 shadow-sm">
            <h6 className="alert-heading fw-bold mb-2">📌 Quan Sát Góc Mặt</h6>
            <p className="small mb-2">
              Khung bầu dục định vị trên màn hình giúp người đứng trước camera căn chỉnh góc mặt nhìn thẳng vào ống kính.
            </p>
            <hr className="my-2" />
            <ul className="small ps-3 mb-0 text-muted">
              <li>Đứng thẳng, hướng mặt vào khu vực trung tâm khung hình.</li>
              <li>Khoảng cách tối ưu từ 0.5m đến 1.2m tới camera.</li>
              <li>Khi quẹt thẻ, hệ thống sẽ tự động chụp ảnh hiện tại từ góc này để so khớp.</li>
            </ul>
          </Alert>
        </Col>
      </Row>
    </div>
  );
};

export default LiveCamera;
