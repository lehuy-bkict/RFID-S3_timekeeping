import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Badge } from "react-bootstrap";
import TableCheckInRealtime from "./TableCheckInRealtime";
import { useDebounce } from 'use-debounce';
import socketService from '../../../../service/serviceLayer/socketService';
import { GetData } from "../../../../service/apiAdmin/ApiAreaService";
import { toast } from 'react-toastify';
import './CheckInRealtime.scss';

const CheckInRealtime = () => {
    const [searchName, setSearchName] = useState("");
    const [debouncedSearchName] = useDebounce(searchName, 1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [data, setData] = useState([]);
    const [showLiveCam, setShowLiveCam] = useState(true);
    const [liveFrame, setLiveFrame] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await GetData({});

                if (response?.data?.success && Array.isArray(response.data.data)) {
                    const dbItems = response.data.data.map(item => ({
                        id: item._id,
                        rfid: item.cardNumber,
                        userName: item.userName || 'client',
                        verificationStatus: item.verificationStatus || 'UNASSIGNED_CLIENT',
                        similarity: item.similarity ?? null,
                        device: item.deviceID,
                        isCheckOut: !!item.ispass,
                        status: item.ispass ? "Outside" : "Inside",
                        checkin: item.info?.CheckIn,
                        checkinImage: item.info?.CheckInImage || null,
                        checkout: item.info?.CheckOut || null,
                        checkoutImage: item.info?.CheckOutImage || null,
                        time: item.ispass ? item.info?.CheckOut : item.info?.CheckIn
                    }));
                    setData(dbItems.reverse());
                }
            } catch (error) {
                console.error("Error loading initial DB scans:", error);
            }
        };

        fetchInitialData();

        socketService.connect();
        const socket = socketService.getSocket();

        const handleScanData = (rfidData) => {
            const isOut = !!rfidData.isCheckOut;
            const statusText = isOut ? "Outside" : "Inside";
            const userName = rfidData.userName || 'client';

            setData(prevData => {
                if (isOut) {
                    const idx = prevData.findIndex(d => d.rfid === rfidData.rfid && !d.checkout);
                    if (idx !== -1) {
                        const updated = [...prevData];
                        updated[idx] = {
                            ...updated[idx],
                            userName: userName,
                            verificationStatus: rfidData.verified ? 'MATCHED' : (updated[idx].verificationStatus || 'UNASSIGNED_CLIENT'),
                            similarity: rfidData.similarity ?? updated[idx].similarity,
                            isCheckOut: true,
                            status: "Outside",
                            checkout: rfidData.timestamp,
                            checkoutImage: rfidData.image || updated[idx].checkoutImage,
                            time: rfidData.timestamp
                        };
                        return updated;
                    }
                }

                return [
                    {
                        id: rfidData.eventId || `${rfidData.rfid}-${Date.now()}`,
                        rfid: rfidData.rfid,
                        userName: userName,
                        verificationStatus: rfidData.verified ? 'MATCHED' : 'UNASSIGNED_CLIENT',
                        similarity: rfidData.similarity ?? null,
                        device: rfidData.device,
                        isCheckOut: isOut,
                        status: statusText,
                        checkin: rfidData.timestamp,
                        checkinImage: isOut ? null : (rfidData.image || null),
                        checkout: isOut ? rfidData.timestamp : null,
                        checkoutImage: isOut ? (rfidData.image || null) : null,
                        time: rfidData.timestamp
                    },
                    ...prevData
                ].slice(0, 50);
            });
        };

        const handleScanRejected = (rejectData) => {
            toast.error(
                <div>
                    <strong className="d-block mb-1">WARNING: RFID SCAN REJECTED!</strong>
                    <div>Card: <code>{rejectData.rfid}</code> ({rejectData.userName || 'Unknown'})</div>
                    <div className="small text-white-50 mt-1">{rejectData.reason || 'Face does not match profile photo! Event not recorded.'}</div>
                </div>,
                { autoClose: 7000 }
            );
        };

        const handleCameraFrame = (camData) => {
            if (camData?.image) {
                setLiveFrame(camData.image);
            }
        };

        socket.on('rfid-scan-completed', handleScanData);
        socket.on('rfid-scan-rejected', handleScanRejected);
        socket.on('camera-frame', handleCameraFrame);

        return () => {
            socket.off('rfid-scan-completed', handleScanData);
            socket.off('rfid-scan-rejected', handleScanRejected);
            socket.off('camera-frame', handleCameraFrame);
            socketService.disconnect();
        };
    }, []);

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleChangeLimit = (event) => {
        setItemsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(1);
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

    return (
        <div className="manage-account-container checkin-realtime-page">
            <div className="page-header d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="page-title">Realtime Entry / Exit Check</h3>
                    <p className="text-muted mb-0">Giám sát quẹt thẻ RFID & Camera luồng trực tiếp</p>
                </div>
                <Button
                    variant={showLiveCam ? "outline-primary" : "primary"}
                    size="sm"
                    onClick={() => setShowLiveCam(!showLiveCam)}
                >
                    {showLiveCam ? "Ẩn Camera Trực Tiếp" : "📷 Mở Camera Trực Tiếp"}
                </Button>
            </div>

            <Container fluid className="px-0">
                {showLiveCam && (
                    <Row className="mb-4 g-3">
                        <Col lg={7}>
                            <Card className="camera-embed-card border-0 shadow-sm overflow-hidden">
                                <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-2 px-3">
                                    <span className="fw-semibold small">
                                        <span className="live-bullet me-2"></span>LIVE STREAM CAMERA
                                    </span>
                                    <Badge bg="danger" className="small">REALTIME</Badge>
                                </Card.Header>
                                <Card.Body className="p-0 position-relative camera-embed-body">
                                    {liveFrame ? (
                                        <div className="camera-embed-screen position-relative">
                                            <img src={liveFrame} alt="Live Camera" className="img-fluid w-100 camera-feed" />
                                            <div className="face-target-guide">
                                                <div className="target-oval">
                                                    <span className="target-hint">Góc mặt chính diện</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="camera-loading-box d-flex flex-column align-items-center justify-content-center text-white py-5">
                                            <div className="spinner-border text-light spinner-border-sm mb-2" role="status"></div>
                                            <small className="text-white-50">Đang nhận luồng camera qua Socket.IO...</small>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={5}>
                            <Card className="border-0 shadow-sm h-100 latest-scan-card">
                                <Card.Header className="bg-white border-bottom py-2">
                                    <span className="fw-bold small text-uppercase text-muted">Lần Quẹt Thẻ Gần Nhất</span>
                                </Card.Header>
                                <Card.Body className="d-flex flex-column justify-content-center">
                                    {latestScan ? (
                                        <div>
                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                <h5 className="mb-0 text-primary">{latestScan.userName}</h5>
                                                <Badge bg={latestScan.verificationStatus === 'MATCHED' ? 'success' : (latestScan.verificationStatus === 'UNASSIGNED_CLIENT' ? 'secondary' : 'danger')}>
                                                    {latestScan.verificationStatus === 'MATCHED' ? 'KHỚP MẶT (CHÍNH CHỦ)' : (latestScan.verificationStatus === 'UNASSIGNED_CLIENT' ? 'THẺ KHÁCH' : 'KHÔNG KHỚP')}
                                                </Badge>
                                            </div>
                                            <Row className="small text-muted mb-3 g-2">
                                                <Col sm={6}>Mã thẻ: <strong>{latestScan.rfid}</strong></Col>
                                                <Col sm={6}>Thiết bị: <strong>{latestScan.device}</strong></Col>
                                                <Col sm={6}>Trạng thái: <strong>{latestScan.status}</strong></Col>
                                                {latestScan.similarity !== null && (
                                                    <Col sm={6}>Độ tương đồng: <strong>{(latestScan.similarity * 100).toFixed(1)}%</strong></Col>
                                                )}
                                                <Col sm={12}>Thời gian: <strong>{new Date(latestScan.time).toLocaleString()}</strong></Col>
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
                    <Col md={5}>
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