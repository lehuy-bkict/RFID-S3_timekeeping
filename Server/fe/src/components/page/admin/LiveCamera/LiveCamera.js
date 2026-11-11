import React, { useEffect, useState, useRef } from 'react';
import { Card, Badge, Row, Col, Alert, Form, Button } from 'react-bootstrap';
import socketService from '../../../../service/serviceLayer/socketService';
import { GetCameraConfig, SaveCameraConfig } from '../../../../service/apiAdmin/ApiAreaService';
import { toast } from 'react-toastify';
import './LiveCamera.scss';

const LiveCamera = () => {
  const [desktopFrame, setDesktopFrame] = useState(null);
  const [esp32Frame, setEsp32Frame] = useState(null);
  const [cameraSource, setCameraSource] = useState('desktop');
  const [savedCameraSource, setSavedCameraSource] = useState('desktop');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [fps, setFps] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(Date.now());
  const esp32FrameUrlRef = useRef(null);
  const cameraSourceRef = useRef(cameraSource);
  cameraSourceRef.current = cameraSource;

  useEffect(() => {
    let active = true;
    GetCameraConfig()
      .then((response) => {
        const configuredSource = response?.data?.data?.cameraSource;
        if (active && (configuredSource === 'desktop' || configuredSource === 'esp32')) {
          setCameraSource(configuredSource);
          setSavedCameraSource(configuredSource);
        }
      })
      .catch((error) => {
        console.error('Failed to load attendance camera configuration:', error);
        toast.error('Không tải được cấu hình camera đang sử dụng.');
      })
      .finally(() => {
        if (active) setIsConfigLoaded(true);
      });

    socketService.connect();
    const socket = socketService.getSocket();

    if (!socket) {
      return () => {
        active = false;
      };
    }

    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => {
      setSocketConnected(false);
      setEsp32Connected(false);
      setFps(0);
    };

    const recordFrame = (source) => {
      if (source !== cameraSourceRef.current) return;
      setLastUpdate(Date.now());
      frameCountRef.current += 1;

      const now = Date.now();
      const elapsed = now - lastFpsCalcRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastFpsCalcRef.current = now;
      }
    };

    const handleDesktopFrame = (data) => {
      if (data?.image) {
        setDesktopFrame(data.image);
        recordFrame('desktop');
      }
    };

    const handleEsp32Frame = (frameData) => {
      if (!frameData) return;
      const binaryFrame = frameData?.type === 'Buffer' && Array.isArray(frameData.data)
        ? new Uint8Array(frameData.data)
        : frameData;
      const frameUrl = URL.createObjectURL(
        binaryFrame instanceof Blob
          ? binaryFrame
          : new Blob([binaryFrame], { type: 'image/jpeg' })
      );
      if (esp32FrameUrlRef.current) {
        URL.revokeObjectURL(esp32FrameUrlRef.current);
      }
      esp32FrameUrlRef.current = frameUrl;
      setEsp32Frame(frameUrl);
      setEsp32Connected(true);
      recordFrame('esp32');
    };

    const handleEsp32Status = (status) => {
      setEsp32Connected(!!status?.connected);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('camera-frame', handleDesktopFrame);
    socket.on('esp32-camera-frame', handleEsp32Frame);
    socket.on('esp32-camera-status', handleEsp32Status);

    return () => {
      active = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('camera-frame', handleDesktopFrame);
      socket.off('esp32-camera-frame', handleEsp32Frame);
      socket.off('esp32-camera-status', handleEsp32Status);
      if (esp32FrameUrlRef.current) {
        URL.revokeObjectURL(esp32FrameUrlRef.current);
        esp32FrameUrlRef.current = null;
      }
    };
  }, []);

  const handleSaveCamera = async () => {
    setIsSaving(true);
    try {
      const response = await SaveCameraConfig(cameraSource);
      if (!response?.data?.success) {
        throw new Error(response?.data?.messages || 'Không thể lưu cấu hình camera.');
      }
      setSavedCameraSource(cameraSource);
      toast.success(response.data.messages || 'Đã lưu camera sử dụng cho lượt quẹt RFID.');
    } catch (error) {
      console.error('Failed to save attendance camera configuration:', error);
      toast.error(error.response?.data?.messages || error.message || 'Không thể lưu cấu hình camera.');
    } finally {
      setIsSaving(false);
    }
  };

  const frame = cameraSource === 'desktop' ? desktopFrame : esp32Frame;
  const cameraConnected = cameraSource === 'desktop'
    ? socketConnected && !!desktopFrame
    : socketConnected && esp32Connected && !!esp32Frame;

  return (
    <div className="manage-account-container live-camera-page">
      <div className="page-header d-flex justify-content-between align-items-center">
        <div>
          <h3 className="page-title">Màn Hình Camera Trực Tiếp</h3>
          <p className="text-muted mb-0">Luồng camera thời gian thực qua Socket.IO • Giám sát góc mặt người dùng tại cổng kiểm soát</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {cameraConnected ? (
            <Badge bg="danger" className="pulse-live px-3 py-2">
              <span className="live-dot me-2"></span>LIVE • {fps || (cameraSource === 'esp32' ? 4 : 15)} FPS
            </Badge>
          ) : (
            <Badge bg="secondary" className="px-3 py-2">
              {cameraSource === 'esp32' && !esp32Connected ? 'ESP32 OFFLINE' : 'ĐANG KẾT NỐI...'}
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
                  <h5 className="text-white">Đang tải luồng camera {cameraSource === 'esp32' ? 'ESP32' : 'desktop'}...</h5>
                  <p className="text-white-50 small mb-0">Kiểm tra trạng thái camera và kết nối MQTT nếu chưa có hình.</p>
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
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Camera dùng khi quẹt RFID</Form.Label>
                <Form.Select
                  value={cameraSource}
                  onChange={(event) => {
                    setCameraSource(event.target.value);
                    setFps(0);
                    frameCountRef.current = 0;
                    lastFpsCalcRef.current = Date.now();
                  }}
                  disabled={!isConfigLoaded || isSaving}
                >
                  <option value="desktop">Camera desktop (AI service trên máy chủ)</option>
                  <option value="esp32">ESP32-S3 Camera (MQTT)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Camera đã lưu: {savedCameraSource === 'esp32' ? 'ESP32-S3' : 'desktop'}.
                  Thay đổi chỉ có hiệu lực sau khi bấm lưu.
                </Form.Text>
                <Button
                  className="w-100 mt-2"
                  variant="primary"
                  onClick={handleSaveCamera}
                  disabled={!isConfigLoaded || isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu camera sử dụng'}
                </Button>
              </Form.Group>
              <div className="status-item d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Kênh truyền:</span>
                <Badge bg="info">Socket.IO (WebSocket)</Badge>
              </div>
              <div className="status-item d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Nguồn đang xem:</span>
                <Badge bg={cameraConnected ? 'success' : 'secondary'}>
                  {cameraSource === 'esp32' ? 'ESP32-S3' : 'Desktop'} {cameraConnected ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>
              <div className="status-item d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Nguồn dùng cho RFID:</span>
                <Badge bg="primary">
                  {savedCameraSource === 'esp32' ? 'ESP32-S3' : 'Desktop'}
                </Badge>
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
              <li>Khi quẹt thẻ, backend chụp từ camera đã lưu trong collection Config.</li>
            </ul>
          </Alert>
        </Col>
      </Row>
    </div>
  );
};

export default LiveCamera;
