import React from 'react';
import Table3 from '../../../default/table/table.3/index';
import { toast } from 'react-toastify';
import { MdDelete } from 'react-icons/md';
import { DeleteData } from "../../../../service/apiAdmin/ApiAreaService";

const highlightText = (text, searchTerm) => {
    if (!text || !searchTerm || typeof text !== 'string') return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, `<span style="background-color: yellow;">$1</span>`);
};

const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const TableCheckInEvent = ({ currentItems, searchName, currentPage, totalPages, handlePagination, limit, handleChangeLimit,refreshData }) => {

    const handleDelete = async (DataId) => {
        if (!DataId) {
            console.error("No ID found to delete!");
            return;
        }
        if (window.confirm(`Are you sure you want to delete ${DataId}?`)) {
            try {
                const response = await DeleteData({ _id: DataId }); 
                if (response?.data?.success) {
                    toast.success("Deleted successfully!");
                    refreshData();
                } else {
                    toast.error("Deletion failed: " + response?.data?.messages || "Something went wrong!");
                }
            } catch (error) {
                console.error("Deletion error:", error);
                toast.error("Deletion failed. Please try again!");
            }
        }
    };
    const titleArr = [
        'No.', 'Card number', 'Device ID', 'Status', 'Check-in time', 'Check-out time', 'Created at', 'Action'
    ];
    const actionArr = [
        {
            icon: <MdDelete className="icon-black" />,
            title: "Delete",
            callback: (e, data) => handleDelete(data.id), 
            isVisible: true,
        }
    ];
    // Xử lý dữ liệu bảng
    const dataArr = Array.isArray(currentItems) ? currentItems.map((item, index) => ({
        id: item._id,
        stt: index + 1 + (currentPage - 1) * limit,
        cardNumber: (
            <div dangerouslySetInnerHTML={{ __html: highlightText(item.cardNumber, searchName) }} />
        ),
        deviceID: (
            <div dangerouslySetInnerHTML={{ __html: highlightText(item.deviceID, searchName) }} />
        ),
        isPass: item.ispass ? "Left the parking lot" : "Inside the parking lot",
        checkInTime: (
            <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.info?.CheckIn || ""), searchName) }} />
        ),
        checkOutTime: item.info?.CheckOut ? (
            <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.info.CheckOut), searchName) }} />
        ) : "Not yet checked out",
        createTime: (
            <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.CreateTime || ""), searchName) }} />
        ),
    })) : []; 

    return (
        <>
            <Table3
                titleArr={titleArr}
                actionArr={actionArr}
                dataArr={dataArr}
                currentPage={currentPage}
                totalPages={totalPages}
                handlePagination={handlePagination}
                limit={limit}
                handleChangeLimit={handleChangeLimit}
            />
        </>
    );
};

export default TableCheckInEvent;
