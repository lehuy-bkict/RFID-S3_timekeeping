import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import TableCheckInEvent from "./TableCheckInEvent";
import { useDebounce } from 'use-debounce';
import * as XLSX from 'xlsx';
import { GetData } from "../../../../service/apiAdmin/ApiAreaService";
import { toast } from 'react-toastify';
import './CheckInEvent.scss';

const CheckInEvent = () => {
    // Lấy ngày hôm nay và ngày hôm sau
    const getToday = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };
    const getTomorrow = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const [searchName, setSearchName] = useState("");
    const [startDate, setStartDate] = useState(getToday());
    const [endDate, setEndDate] = useState(getTomorrow());
    const [debouncedSearchName] = useDebounce(searchName, 1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [data, setData] = useState([]);
    const [isPass, setIsPass] = useState(undefined);

    const fetchData = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const formattedStartDate = startDate || today;
            const formattedEndDate = endDate || today;

            const response = await GetData({
                fromDate: formattedStartDate,
                toDate: formattedEndDate,
                ispass: isPass
            });

            const eventData = Array.isArray(response.data.data) ? response.data.data : [];
            setData(eventData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("An error occurred while connecting to the server.");
        }
    }, [startDate, endDate, isPass]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = data.filter(item => {
        const matchesSearch = Object.values(item).some(value =>
            String(value).toLowerCase().includes(debouncedSearchName.toLowerCase())
        );

        const checkTime = new Date(item.info?.CheckIn);
        const matchesDate =
            (!startDate || checkTime >= new Date(startDate)) &&
            (!endDate || checkTime <= new Date(endDate));

        return matchesSearch && matchesDate;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleChangeLimit = (event) => {
        setItemsPerPage(parseInt(event.target.value, 10));
        setCurrentPage(1);
    };

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
    };

    const handleSearch = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const formattedStartDate = startDate ? formatDate(startDate) : formatDate(today);
            const formattedEndDate = endDate ? formatDate(endDate) : formatDate(today);

            const response = await GetData({
                aFromDate: formattedStartDate,
                aToDate: formattedEndDate
            });
            if (response.data.success) {
                toast.success("Report data loaded successfully");
                fetchData();
            } else {
                toast.error(response.data.messages || "Unable to load report data");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while connecting to the server.");
        }
    };

    const handleExportExcel = () => {
        const dataForExcel = currentItems.map((item, index) => ({
            "STT": index + 1 + (currentPage - 1) * itemsPerPage,
            "Card number": item.cardNumber,
            "Status": item.ispass ? "Left the parking lot" : "Inside the parking lot",
            "Device": item.deviceID,
            "Check-in time": item.info?.CheckIn,
            "Check-out time": item.info?.CheckOut || "Not yet checked out",
            "Created at": item.CreateTime
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoChiTietVaoRa");
        XLSX.writeFile(workbook, "BaoCaoChiTietVaoRa.xlsx");
    };

    return (
        <div className="manage-account-container checkin-event-page">
            <div className='manage-account-hender row'>
                <div className='col'>
                    <h4>Detailed entry/exit report</h4>
                </div>
            </div>
            <Container fluid>
                <Row className="mb-3">
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>From</Form.Label>
                            <Form.Control
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>To</Form.Label>
                            <Form.Control
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={2}>
                        <Form.Group>
                            <Form.Label>Status</Form.Label>
                            <Form.Control
                                as="select"
                                onChange={(e) => setIsPass(e.target.value === "undefined" ? undefined : e.target.value === "true")}
                            >
                                <option value="undefined">  </option>
                                <option value="false">Inside the parking lot</option>
                                <option value="true">Left the parking lot</option>
                            </Form.Control>
                        </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                        <Col md={5}>
                            <Button variant="primary" onClick={handleSearch}>
                                ↻ Refresh
                            </Button>
                        </Col>
                        <Col md={6}>
                            <Button variant="success" className="ms-3" onClick={handleExportExcel}>
                                + Export Excel
                            </Button>
                        </Col>
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Col md={5}>
                        <Form.Group>
                            <Form.Label>Search</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter keyword"
                                onChange={(event) => setSearchName(event.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>
                <div>
                    <TableCheckInEvent
                        currentPage={currentPage}
                        currentItems={currentItems}
                        totalPages={totalPages}
                        searchName={searchName}
                        handlePagination={handlePagination}
                        limit={itemsPerPage}
                        handleChangeLimit={handleChangeLimit}
                        refreshData={fetchData} 
                    />
                </div>
            </Container>
        </div>
    );
};

export default CheckInEvent;
