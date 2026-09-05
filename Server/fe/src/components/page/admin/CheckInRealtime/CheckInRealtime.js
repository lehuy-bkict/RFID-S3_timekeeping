import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form } from "react-bootstrap";
import TableCheckInRealtime from "./TableCheckInRealtime";
import { useDebounce } from 'use-debounce';
import socketService from '../../../../service/serviceLayer/socketService';
import { GetData } from "../../../../service/apiAdmin/ApiAreaService";
import './CheckInRealtime.scss';

const CheckInRealtime = () => {
    const [searchName, setSearchName] = useState("");
    const [debouncedSearchName] = useDebounce(searchName, 1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [data, setData] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const today = new Date();
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - 1);

                const response = await GetData({
                    fromDate: pastDate.toISOString().split('T')[0],
                    toDate: today.toISOString().split('T')[0]
                });

                if (response?.data?.success && Array.isArray(response.data.data)) {
                    const dbItems = response.data.data.map(item => ({
                        id: item._id,
                        rfid: item.cardNumber,
                        device: item.deviceID,
                        isCheckOut: !!item.ispass,
                        status: item.ispass ? "Left the parking lot" : "Inside the parking lot",
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
            const statusText = isOut ? "Left the parking lot" : "Inside the parking lot";

            setData(prevData => {
                if (isOut) {
                    const idx = prevData.findIndex(d => d.rfid === rfidData.rfid && !d.checkout);
                    if (idx !== -1) {
                        const updated = [...prevData];
                        updated[idx] = {
                            ...updated[idx],
                            isCheckOut: true,
                            status: "Left the parking lot",
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

        socket.on('rfid-scan-completed', handleScanData);

        return () => {
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

    return (
        <div className="manage-account-container checkin-realtime-page">
            <div className='manage-account-hender row'>
                <div className='col'>
                    <h4>Detailed entry/exit control</h4>
                </div>
            </div>
            <Container fluid>
                <Row className="mb-3">
                    <Col md={5}>
                        <Form.Group>
                            <Form.Label>Search</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter keyword"
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
}
export default CheckInRealtime;