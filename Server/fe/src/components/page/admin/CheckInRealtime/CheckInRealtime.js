import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Badge } from "react-bootstrap";
import TableCheckInRealtime from "./TableCheckInRealtime";
import { useDebounce } from 'use-debounce';
import socketService from '../../../../service/serviceLayer/socketService';
import { CreateBypassScan, GetCameraConfig, SaveCameraConfig } from "../../../../service/apiAdmin/ApiAreaService";
import { toast } from 'react-toastify';
import { FaCamera } from 'react-icons/fa';
import './CheckInRealtime.scss';

const CheckInRealtime = () => {
    const [searchName, setSearchName] = useState("");
    const [debouncedSearchName] = useDebounce(searchName, 1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [data, setData] = useState([]);
    const [showLiveCam, setShowLiveCam] = useState(true);
    const [liveFrame, setLiveFrame] = useState(null);
    const [esp32FrameUrl, setEsp32FrameUrl] = useState(null);
    const [cameraSource, setCameraSource] = useState('desktop');
    const [esp32CameraConnected, setEsp32CameraConnected] = useState(false);
    const esp32FrameUrlRef = React.useRef(null);
    const [isSubmittingBypass, setIsSubmittingBypass] = useState(false);

    useEffect(() => {
        GetCameraConfig()
            .then(response => {
                const configuredSource = response?.data?.data?.cameraSource;
                if (configuredSource === 'desktop' || configuredSource === 'esp32') {
                    setCameraSource(configuredSource);
                }
            })
            .catch(error => {
                console.error("Error loading camera configuration:", error);
                toast.error("Không tải được cấu hình camera.");
            });

        socketService.connect();
        const socket = socketService.getSocket();

        const handleRealtimeScan = (rfidData) => {
            if (!rfidData?.rfid) return;
            const eventId = rfidData.eventId || rfidData.id || `${rfidData.rfid}-${Date.now()}`;
            setData(prevData => [
                {
                    id: eventId,
                    rfid: rfidData.rfid,
                    userName: rfidData.userName || 'Unknown',
                    verificationStatus: rfidData.verificationStatus || 'PENDING',
                    similarity: null,
                    device: rfidData.device,
                    isCheckOut: false,
                    status: "Processing",
                    checkin: rfidData.timestamp,
                    checkinImage: null,
                    checkout: null,
                    checkoutImage: null,
                    time: rfidData.timestamp,
                    pendingScan: true
                },
                ...prevData
            ].slice(0, 50));
        };

        const handleScanData = (rfidData) => {
            const isOut = !!rfidData.isCheckOut;
            const statusText = isOut ? "Outside" : "Inside";
            const userName = rfidData.userName || 'client';

            setData(prevData => {
                const eventId = rfidData.eventId || rfidData.id;
                if (isOut) {
                    const idx = prevData.findIndex(d => d.rfid === rfidData.rfid && !d.checkout);
                    if (idx !== -1) {
                        const updated = [...prevData];
                        updated[idx] = {
                            ...updated[idx],
                            userName: userName,
                            verificationStatus: rfidData.verificationStatus || (rfidData.verified ? 'MATCHED' : (updated[idx].verificationStatus || 'UNASSIGNED_CLIENT')),
                            similarity: rfidData.similarity ?? updated[idx].similarity,
                            isCheckOut: true,
                            status: "Outside",
                            checkout: rfidData.timestamp,
                            checkoutImage: rfidData.image || updated[idx].checkoutImage,
                            time: rfidData.timestamp,
                            pendingScan: false
                        };
                        return updated.filter(item => item.id !== eventId);
                    }
                }

                const completedItem = {
                    id: eventId || `${rfidData.rfid}-${Date.now()}`,
                    rfid: rfidData.rfid,
                    userName: userName,
                    verificationStatus: rfidData.verificationStatus || (rfidData.verified ? 'MATCHED' : 'UNASSIGNED_CLIENT'),
                    similarity: rfidData.similarity ?? null,
                    device: rfidData.device,
                    isCheckOut: isOut,
                    status: statusText,
                    checkin: rfidData.timestamp,
                    checkinImage: isOut ? null : (rfidData.image || null),
                    checkout: isOut ? rfidData.timestamp : null,
                    checkoutImage: isOut ? (rfidData.image || null) : null,
                    time: rfidData.timestamp,
                    pendingScan: false
                };
                const existingIndex = prevData.findIndex(item => item.id === eventId);
                if (existingIndex !== -1) {
                    const updated = [...prevData];
                    updated[existingIndex] = { ...updated[existingIndex], ...completedItem };
                    return updated;
                }
                return [
                    completedItem,
                    ...prevData
                ].slice(0, 50);
            });
        };

        const handleScanRejected = (rejectData) => {
            setData(prevData => prevData.map(item =>
                item.id === (rejectData.eventId || rejectData.id)
                    ? {
                        ...item,
                        userName: rejectData.userName || item.userName,
                        verificationStatus: rejectData.failureCode || 'REJECTED',
                        status: 'Rejected',
                        pendingScan: false,
                        image: rejectData.image || null
                    }
                    : item
            ));
            toast.error(
                <div>
                    <strong className="d-block mb-1">WARNING: RFID SCAN REJECTED!</strong>
                    <div>Card: <code>{rejectData.rfid}</code> ({rejectData.userName || 'Unknown'})</div>
                    <div className="small mt-1">{rejectData.reason || 'Face verification failed. Event not recorded.'}</div>
                    {Number.isFinite(rejectData.similarity) && (
                        <div className="small mt-1">
                            Similarity: {(rejectData.similarity * 100).toFixed(1)}%
                            {Number.isFinite(rejectData.threshold) &&
                                ` (required: ${(rejectData.threshold * 100).toFixed(0)}%)`}
                        </div>
                    )}
                    {typeof rejectData.imagePersisted === 'boolean' && (
                        <div className="small mt-1">
                            {rejectData.imagePersisted
                                ? 'Scan attempt saved to the rejection log.'
                                : 'Scan attempt could not be saved to the rejection log.'}
                        </div>
                    )}
                    {rejectData.image && (
                        <img
                            src={rejectData.image}
                            alt="Camera frame used for rejected RFID scan"
                            className="mt-2 rounded"
                            style={{ display: 'block', maxWidth: '100%', maxHeight: '180px', objectFit: 'contain' }}
                        />
                    )}
                </div>,
                { autoClose: 7000 }
            );
        };

        const handleScanCameraPending = (scanData) => {
            toast.warning(
                <div>
                    <strong className="d-block mb-1">RFID EVENT SAVED — WAITING FOR CAMERA</strong>
                    <div>Card: <code>{scanData.rfid}</code> ({scanData.userName || 'Unknown'})</div>
                    <div className="small mt-1">
                        Sự kiện đang được xử lý bằng camera đã chọn;
                        ảnh sẽ được lưu khi chụp được.
                    </div>
                </div>,
                { autoClose: 7000 }
            );
        };

        const handleCameraFrame = (camData) => {
            if (camData?.image) {
                setLiveFrame(camData.image);
            }
        };

        const handleEsp32CameraFrame = (frame) => {
            if (!frame) return;
            const binaryFrame = frame?.type === 'Buffer' && Array.isArray(frame.data)
                ? new Uint8Array(frame.data)
                : frame;
            const imageUrl = URL.createObjectURL(
                binaryFrame instanceof Blob
                    ? binaryFrame
                    : new Blob([binaryFrame], { type: 'image/jpeg' })
            );
            if (esp32FrameUrlRef.current) {
                URL.revokeObjectURL(esp32FrameUrlRef.current);
            }
            esp32FrameUrlRef.current = imageUrl;
            setEsp32FrameUrl(imageUrl);
            setEsp32CameraConnected(true);
        };

        const handleEsp32CameraStatus = (status) => {
            setEsp32CameraConnected(!!status?.connected);
        };

        socket.on('rfid-scan-realtime', handleRealtimeScan);
        socket.on('rfid-scan-completed', handleScanData);
        socket.on('rfid-scan-rejected', handleScanRejected);
        socket.on('rfid-scan-camera-pending', handleScanCameraPending);
        socket.on('camera-frame', handleCameraFrame);
        socket.on('esp32-camera-frame', handleEsp32CameraFrame);
        socket.on('esp32-camera-status', handleEsp32CameraStatus);

        return () => {
            socket.off('rfid-scan-realtime', handleRealtimeScan);
            socket.off('rfid-scan-completed', handleScanData);
            socket.off('rfid-scan-rejected', handleScanRejected);
            socket.off('rfid-scan-camera-pending', handleScanCameraPending);
            socket.off('camera-frame', handleCameraFrame);
            socket.off('esp32-camera-frame', handleEsp32CameraFrame);
            socket.off('esp32-camera-status', handleEsp32CameraStatus);
            if (esp32FrameUrlRef.current) {
                URL.revokeObjectURL(esp32FrameUrlRef.current);
                esp32FrameUrlRef.current = null;
            }
            socketService.disconnect();
        };
    }, []);

    const handleCameraSourceChange = async () => {
        const nextSource = cameraSource === 'desktop' ? 'esp32' : 'desktop';
        setCameraSource(nextSource);
        try {
            const response = await SaveCameraConfig(nextSource);
            if (!response?.data?.success) {
                throw new Error(response?.data?.messages || 'Không thể lưu cấu hình camera.');
            }
        } catch (error) {
            setCameraSource(cameraSource);
            toast.error(error.response?.data?.messages || error.message || 'Không thể lưu cấu hình camera.');
        }
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleChangeLimit = (event) => {
        setItemsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(1);
    };

    const handleBypassScan = async () => {
        setIsSubmittingBypass(true);
        try {
            const response = await CreateBypassScan(cameraSource);
            if (!response.data?.success) {
                throw new Error(response.data?.messages || 'Không thể tạo lượt bypass.');
            }
            toast.success(response.data.messages || 'Đã chụp ảnh và lưu lượt bypass.');
        } catch (error) {
            toast.error(error.response?.data?.messages || error.message || 'Không thể tạo lượt bypass.');
        } finally {
            setIsSubmittingBypass(false);
        }
    };

    const filtered = data.filter(item => {
        const matchesSearch = Object.values(item).some(value =>
            String(value).toLowerCase().includes(debouncedSearchName.toLowerCase())
        );
        return matchesSearch;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const latestScan = data[0] || null;
    const displayedCameraFrame = cameraSource === 'desktop' ? liveFrame : esp32FrameUrl;

    return (
        <div className="manage-account-container checkin-realtime-page">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="page-title">Realtime Entry / Exit Check</h3>
                    <p className="text-muted mb-0">Giám sát quẹt thẻ RFID & Camera luồng trực tiếp</p>
                </div>
                <div className="d-flex gap-2">
                    <Button
                        variant={cameraSource === 'esp32' ? 'success' : 'outline-secondary'}
                        size="sm"
                        title={`Chuyển sang camera ${cameraSource === 'desktop' ? 'ESP32' : 'desktop'}`}
                        aria-label={`Chuyển sang camera ${cameraSource === 'desktop' ? 'ESP32' : 'desktop'}`}
                        onClick={handleCameraSourceChange}
                    >
                        <FaCamera className="me-1" />
                        {cameraSource === 'desktop' ? 'Desktop' : 'ESP32'}
                        {cameraSource === 'esp32' && (
                            <span className={`ms-2 badge ${esp32CameraConnected ? 'bg-light text-success' : 'bg-danger'}`}>
                                {esp32CameraConnected ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        )}
                    </Button>
                    <Button
                        variant="warning"
                        size="sm"
                        onClick={handleBypassScan}
                        disabled={isSubmittingBypass}
                    >
                        {isSubmittingBypass
                            ? `Đang chụp từ ${cameraSource === 'esp32' ? 'ESP32' : 'desktop'}...`
                            : (cameraSource === 'esp32'
                                ? 'Chụp ảnh ESP32 & ghi nhận bypass'
                                : 'Chụp ảnh & ghi nhận bypass')}
                    </Button>
                    <Button
                        variant={showLiveCam ? "outline-primary" : "primary"}
                        size="sm"
                        onClick={() => setShowLiveCam(!showLiveCam)}
                    >
                        {showLiveCam ? "Ẩn Camera Trực Tiếp" : "📷 Mở Camera Trực Tiếp"}
                    </Button>
                </div>
            </div>

            <Container fluid className="px-0">
                {showLiveCam && (
                    <Row className="mb-4 g-3">
                        <Col xs={12} lg={7}>
                            <Card className="camera-embed-card border-0 shadow-sm overflow-hidden">
                                <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-2 px-3">
                                    <span className="fw-semibold small">
                                        <span className="live-bullet me-2"></span>LIVE STREAM CAMERA
                                    </span>
                                    <Badge bg="danger" className="small">REALTIME</Badge>
                                </Card.Header>
                                <Card.Body className="p-0 position-relative camera-embed-body">
                                    {displayedCameraFrame ? (
                                        <div className="camera-embed-screen position-relative">
                                            <img
                                                src={displayedCameraFrame}
                                                alt={cameraSource === 'desktop' ? 'Desktop live camera' : 'ESP32 live camera'}
                                                className="img-fluid w-100 camera-feed"
                                            />
                                            <div className="face-target-guide">
                                                <div className="target-oval">
                                                    <span className="target-hint">Góc mặt chính diện</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="camera-loading-box d-flex flex-column align-items-center justify-content-center text-white py-5">
                                            <div className="spinner-border text-light spinner-border-sm mb-2" role="status"></div>
                                            <small className="text-white-50">
                                                {cameraSource === 'desktop'
                                                    ? 'Đang nhận luồng camera desktop qua Socket.IO...'
                                                    : 'Chưa nhận được luồng ảnh từ camera ESP32.'}
                                            </small>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col xs={12} lg={5}>
                            <Card className="border-0 shadow-sm h-100 latest-scan-card">
                                <Card.Header className="bg-white border-bottom py-2">
                                    <span className="fw-bold small text-uppercase text-muted">Lần Quẹt Thẻ Gần Nhất</span>
                                </Card.Header>
                                <Card.Body className="d-flex flex-column justify-content-center">
                                    {latestScan ? (
                                        <div>
                                            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                                                <h5 className="mb-0 text-primary">{latestScan.userName}</h5>
                                                <Badge bg={latestScan.verificationStatus === 'MATCHED' ? 'success' : (latestScan.verificationStatus === 'BYPASS' ? 'warning' : (latestScan.verificationStatus === 'UNASSIGNED_CLIENT' ? 'secondary' : 'danger'))}>
                                                    {latestScan.verificationStatus === 'MATCHED' ? 'KHỚP MẶT (CHÍNH CHỦ)' : (latestScan.verificationStatus === 'BYPASS' ? 'BYPASS' : (latestScan.verificationStatus === 'UNASSIGNED_CLIENT' ? 'THẺ KHÁCH' : 'KHÔNG KHỚP'))}
                                                </Badge>
                                            </div>
                                            <Row className="small text-muted mb-3 g-2">
                                                <Col xs={6} sm={6}>Mã thẻ: <strong>{latestScan.rfid}</strong></Col>
                                                <Col xs={6} sm={6}>Thiết bị: <strong>{latestScan.device}</strong></Col>
                                                <Col xs={6} sm={6}>Trạng thái: <strong>{latestScan.status}</strong></Col>
                                                {latestScan.similarity !== null && (
                                                    <Col xs={6} sm={6}>Độ tương đồng: <strong>{(latestScan.similarity * 100).toFixed(1)}%</strong></Col>
                                                )}
                                                <Col xs={12}>Thời gian: <strong>{new Date(latestScan.time).toLocaleString()}</strong></Col>
                                            </Row>
                                            {(latestScan.checkinImage || latestScan.checkoutImage) && (
                                                <div className="snapshot-preview text-center mt-2">
                                                    <small className="d-block text-muted mb-1">Ảnh chụp lúc quẹt thẻ:</small>
                                                    <img
                                                        src={latestScan.checkoutImage || latestScan.checkinImage}
                                                        alt="Snapshot"
                                                        className="img-thumbnail"
                                                        style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted py-4">
                                            <p className="mb-1">Chưa có lượt quẹt thẻ nào.</p>
                                            <small>Khi người dùng quẹt thẻ, ảnh từ camera đang mở sẽ tự động chụp và đối chiếu tại đây.</small>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                )}

                <Row className="mb-3">
                    <Col xs={12} sm={8} md={5}>
                        <Form.Group>
                            <Form.Label>Search</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter keyword (Card, User, Device...)"
                                value={searchName}
                                onChange={(event) => setSearchName(event.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>
                <div>
                    <TableCheckInRealtime
                        currentPage={currentPage}
                        currentItems={currentItems}
                        totalPages={totalPages}
                        searchName={searchName}
                        handlePagination={handlePagination}
                        limit={itemsPerPage}
                        handleChangeLimit={handleChangeLimit}
                        refreshData={null}
                    />
                </div>
            </Container>
        </div>
    );
};

export default CheckInRealtime;