import React, { useState } from 'react';
import Table3 from '../../../default/table/table.3/index';
import { toast } from 'react-toastify';
import { MdDelete } from 'react-icons/md';
import { FaImage } from 'react-icons/fa6';
import { DeleteData } from "../../../../service/apiAdmin/ApiAreaService";

const highlightText = (text, searchTerm) => {
    if (!text || !searchTerm || typeof text !== 'string') return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, `<span style="background-color: yellow;">$1</span>`);
};

const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const TableCheckInEvent = ({ currentItems, searchName, currentPage, totalPages, handlePagination, limit, handleChangeLimit, refreshData }) => {
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('checkin'); // 'checkin' | 'checkout'

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
                    toast.error("Deletion failed: " + (response?.data?.messages || "Something went wrong!"));
                }
            } catch (error) {
                console.error("Deletion error:", error);
                toast.error("Deletion failed. Please try again!");
            }
        }
    };

    const handleViewPhoto = (dataId) => {
        const item = (Array.isArray(currentItems) ? currentItems : []).find(i => i._id === dataId);
        setSelectedItem(item || null);
        setActiveTab('checkin');
        setShowPhotoModal(true);
    };

    const titleArr = [
        'No.', 'User', 'Card number', 'Device ID', 'Status', 'Check-in time', 'Check-out time', 'Created at', 'Action'
    ];

    const actionArr = [
        {
            icon: <FaImage className="icon-black" style={{ marginRight: "6px" }} />,
            title: "View Check-in/Check-out photos",
            callback: (e, data) => handleViewPhoto(data.id),
            isVisible: true,
        },
        {
            icon: <MdDelete className="icon-black" />,
            title: "Delete",
            callback: (e, data) => handleDelete(data.id),
            isVisible: true,
        }
    ];

    // Xử lý dữ liệu bảng
    const dataArr = Array.isArray(currentItems) ? currentItems.map((item, index) => {
        const isClient = !item.userName || item.userName.toLowerCase() === 'client';
        return {
            id: item._id,
            stt: index + 1 + (currentPage - 1) * limit,
            userName: (
                isClient ? (
                    <span className="badge bg-secondary px-2 py-1" style={{ fontSize: "12px", textTransform: "lowercase" }}>
                        client
                    </span>
                ) : (
                    <span className="badge bg-primary px-2 py-1" style={{ fontSize: "12px" }}>
                        <span dangerouslySetInnerHTML={{ __html: highlightText(item.userName, searchName) }} />
                    </span>
                )
            ),
            cardNumber: (
                <div dangerouslySetInnerHTML={{ __html: highlightText(item.cardNumber, searchName) }} />
            ),
            deviceID: (
                <div dangerouslySetInnerHTML={{ __html: highlightText(item.deviceID, searchName) }} />
            ),
            isPass: item.ispass ? "Outside" : "Inside",
            checkInTime: (
                <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.info?.CheckIn || ""), searchName) }} />
            ),
            checkOutTime: item.info?.CheckOut ? (
                <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.info.CheckOut), searchName) }} />
            ) : "Not yet checked out",
            createTime: (
                <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.CreateTime || ""), searchName) }} />
            ),
        };
    }) : [];

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

            {/* Modal hiển thị ảnh Check-in / Check-out */}
            {showPhotoModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                    onClick={() => setShowPhotoModal(false)}
                >
                    <div
                        style={{
                            background: "#fff",
                            padding: 24,
                            borderRadius: 8,
                            maxWidth: 540,
                            width: "90%",
                            textAlign: "center",
                            position: "relative"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h5>Check-in / Check-out Photos</h5>

                        <div className="mb-2 text-start p-2 rounded bg-light small">
                            <div>
                                <strong>User: </strong>
                                {selectedItem?.userName && selectedItem.userName.toLowerCase() !== 'client' ? (
                                    <span className="badge bg-primary ms-1">{selectedItem.userName}</span>
                                ) : (
                                    <span className="badge bg-secondary ms-1">client</span>
                                )}
                            </div>
                            <div><strong>Card Number:</strong> {selectedItem?.cardNumber}</div>
                            {selectedItem?.similarity !== null && selectedItem?.similarity !== undefined && (
                                <div><strong>AI Similarity:</strong> {Number(selectedItem.similarity).toFixed(3)}</div>
                            )}
                        </div>

                        {/* Navigation Tabs */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '16px 0' }}>
                            <button
                                type="button"
                                className={`btn btn-sm ${activeTab === 'checkin' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab('checkin')}
                            >
                                Check-in Photo
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${activeTab === 'checkout' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab('checkout')}
                            >
                                Check-out Photo
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div style={{ margin: "16px 0", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            {activeTab === 'checkin' && (
                                <div>
                                    <p style={{ fontWeight: "500", marginBottom: "8px", fontSize: "14px" }}>
                                        Check-in Time: {selectedItem?.info?.CheckIn ? formatDateTime(selectedItem.info.CheckIn) : 'N/A'}
                                    </p>
                                    {selectedItem?.info?.CheckInImage ? (
                                        <img
                                            src={selectedItem.info.CheckInImage}
                                            alt="Check-in snapshot"
                                            style={{ width: "100%", maxHeight: "340px", objectFit: "contain", borderRadius: 6, border: "1px solid #ddd" }}
                                        />
                                    ) : (
                                        <p className="text-muted" style={{ padding: "40px 0" }}>No Check-in photo available.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'checkout' && (
                                <div>
                                    <p style={{ fontWeight: "500", marginBottom: "8px", fontSize: "14px" }}>
                                        Check-out Time: {selectedItem?.info?.CheckOut ? formatDateTime(selectedItem.info.CheckOut) : 'Not checked out yet'}
                                    </p>
                                    {selectedItem?.info?.CheckOutImage ? (
                                        <img
                                            src={selectedItem.info.CheckOutImage}
                                            alt="Check-out snapshot"
                                            style={{ width: "100%", maxHeight: "340px", objectFit: "contain", borderRadius: 6, border: "1px solid #ddd" }}
                                        />
                                    ) : (
                                        <p className="text-muted" style={{ padding: "40px 0" }}>No Check-out photo available.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <button className="btn btn-secondary btn-sm" onClick={() => setShowPhotoModal(false)}>Close</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default TableCheckInEvent;
