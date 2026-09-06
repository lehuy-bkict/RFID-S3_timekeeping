import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import TableCheckInEvent from "./TableCheckInEvent";
import { useDebounce } from 'use-debounce';
import * as XLSX from 'xlsx';
import { GetData } from "../../../../service/apiAdmin/ApiAreaService";
import { toast } from 'react-toastify';
import DateRangePicker from '../Home/DateRangePicker';
import './CheckInEvent.scss';

const CheckInEvent = () => {
    const [searchName, setSearchName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [debouncedSearchName] = useDebounce(searchName, 1000);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [data, setData] = useState([]);
    const [isPass, setIsPass] = useState(undefined);

    const fetchData = useCallback(async () => {
        try {
            const params = {};
            if (startDate) params.fromDate = startDate;
            if (endDate) params.toDate = endDate;
            if (typeof isPass !== 'undefined') params.ispass = isPass;

            const response = await GetData(params);
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
        if (!debouncedSearchName || !debouncedSearchName.trim()) return true;
        const term = debouncedSearchName.toLowerCase().trim();
        return (
            (item.cardNumber && String(item.cardNumber).toLowerCase().includes(term)) ||
            (item.userName && String(item.userName).toLowerCase().includes(term)) ||
            (item.deviceID && String(item.deviceID).toLowerCase().includes(term))
        );
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

    const handleSearch = () => {
        fetchData();
        toast.success("Report data refreshed successfully");
    };

    const handleExportExcel = () => {
        const dataForExcel = currentItems.map((item, index) => ({
            "STT": index + 1 + (currentPage - 1) * itemsPerPage,
            "Card number": item.cardNumber,
            "Status": item.ispass ? "Outside" : "Inside",
            "Device": item.deviceID,
            "Check-in time": item.info?.CheckIn,
            "Check-out time": item.info?.CheckOut || "Not yet checked out",
            "Created at": item.CreateTime
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DetailedEntryExitReport");
        XLSX.writeFile(workbook, "DetailedEntryExitReport.xlsx");
    };

    return (
        <div className="manage-account-container checkin-event-page">
            <div className="page-header">
                <h3 className="page-title">Detailed Entry / Exit Report</h3>
            </div>
            <Container fluid>
                <Row className="mb-3">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label>Date range</Form.Label>
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={({ startDate, endDate }) => {
                                    setStartDate(startDate);
                                    setEndDate(endDate);
                                }}
                                maxDays={30}
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
                                <option value="false">Inside</option>
                                <option value="true">Outside</option>
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
