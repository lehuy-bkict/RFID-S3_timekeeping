import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button } from "react-bootstrap";
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
            const eventData = Array.isArray(response?.data?.data) ? response.data.data : [];
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
                <div>
                    <h3 className="page-title">Detailed Entry / Exit Report</h3>
                    <p className="text-muted mb-0">Lịch sử quẹt thẻ RFID và trạng thái ra vào</p>
                </div>
            </div>

            <div className="event-filters-toolbar mb-4">
                <div className="filter-item date-picker-item">
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
                </div>
                <div className="filter-item status-select-item">
                    <Form.Label>Pass status</Form.Label>
                    <Form.Select
                        onChange={(e) => setIsPass(e.target.value === "undefined" ? undefined : e.target.value === "true")}
                    >
                        <option value="undefined">All Statuses</option>
                        <option value="false">Inside</option>
                        <option value="true">Outside</option>
                    </Form.Select>
                </div>
                <div className="filter-item search-input-item">
                    <Form.Label>Search keyword</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Search card, user, device..."
                        onChange={(event) => setSearchName(event.target.value)}
                    />
                </div>
                <div className="filter-actions-item">
                    <Button variant="outline-primary" onClick={handleSearch} className="action-btn">
                        ↻ Refresh
                    </Button>
                    <Button variant="success" onClick={handleExportExcel} className="action-btn">
                        📥 Export Excel
                    </Button>
                </div>
            </div>

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
        </div>
    );
};

export default CheckInEvent;
