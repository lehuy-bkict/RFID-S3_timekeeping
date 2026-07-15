import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form } from "react-bootstrap";
import TableCheckInRealtime from "./TableCheckInRealtime";
import { useDebounce } from 'use-debounce';
import socketService from '../../../../service/serviceLayer/socketService';
import './CheckInRealtime.scss';

const CheckInRealtime = () => {
    const [searchName, setSearchName] = useState(""); 
    const [debouncedSearchName] = useDebounce(searchName, 1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [data, setData] = useState([]);

    useEffect(() => {
        socketService.connect();
        const socket = socketService.getSocket();
        socket.on('rfid-scan', (rfidData) => {
            setData(prevData => {
                const idx = prevData.findIndex(
                    d => d.rfid === rfidData.rfid && !d.checkout
                );
                if (idx !== -1) {
                    const updated = [...prevData];
                    updated[idx] = {
                        ...updated[idx],
                        checkout: rfidData.timestamp
                    };
                    return updated;
                } else {
                    return [
                        {
                            rfid: rfidData.rfid,
                            device: rfidData.device,
                            checkin: rfidData.timestamp,
                            checkout: null
                        },
                        ...prevData
                    ].slice(0, 50);
                }
            });
        });
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