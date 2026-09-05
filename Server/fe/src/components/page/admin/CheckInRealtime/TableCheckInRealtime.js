import React, { useState } from 'react';
import Table3 from '../../../default/table/table.3/index';
import { FaQrcode } from "react-icons/fa6";
import { QRCodeSVG } from "qrcode.react";

const TableCheckInRealtime = ({ currentPage, currentItems, totalPages, searchName, handlePagination, limit, handleChangeLimit }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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

  // Đảm bảo currentItems luôn là mảng
  const safeItems = Array.isArray(currentItems) ? currentItems : [];

  const titleArr = [
    'No.', 'Card number', 'Device ID', 'Time', 'Action'
  ];

  const actionArr = [
    {
      icon: <FaQrcode className="icon-black" style={{ fontSize: "1.2rem", cursor: "pointer" }} />,
      title: "Scan QR Code & View Details",
      callback: (e, data) => {
        const item = safeItems.find(i => i.id === data.id);
        setSelectedItem(item || null);
        setShowModal(true);
      },
      isVisible: true,
    }
  ];

  const dataArr = safeItems.map((item, index) => {
    return {
      id: item.id,
      stt: index + 1 + (currentPage - 1) * limit,
      rfid: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(item.rfid, searchName) }} />
      ),
      device: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(item.device, searchName) }} />
      ),
      time: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.time), searchName) }} />
      ),
    };
  });

  // Unique QR payload string
  const getQrValue = (item) => {
    if (!item) return "";
    return JSON.stringify({
      cardNumber: item.rfid,
      device: item.device,
      time: item.time
    });
  };

  return (
    <div>
      <div>
        {safeItems.length > 0 ? (
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
        ) : (
          <p>Waiting for data from the server...</p>
        )}
      </div>

      {/* Modal Popup hiển thị QR Code + Thông tin + 1 Ảnh duy nhất */}
      {showModal && selectedItem && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              maxWidth: 480,
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h5 className="text-center mb-3">Scan Details & QR Code</h5>

            {/* QR Code section */}
            <div className="d-flex justify-content-center my-3 p-3 style-qr-wrapper" style={{ background: "#f8f9fa", borderRadius: 8 }}>
              <QRCodeSVG value={getQrValue(selectedItem)} size={140} level="H" />
            </div>

            {/* Info details table */}
            <div className="card mb-3">
              <div className="card-body p-3 text-start" style={{ fontSize: "14px", lineHeight: "1.8" }}>
                <div><strong>Card Number:</strong> {selectedItem.rfid}</div>
                <div><strong>Device ID:</strong> {selectedItem.device}</div>
                <div><strong>Time:</strong> {formatDateTime(selectedItem.time) || "N/A"}</div>
              </div>
            </div>

            {/* Single Captured Photo */}
            <div className="mb-3">
              <h6 className="text-start mb-2">Captured Photo</h6>
              <div className="border p-2 rounded text-center" style={{ background: "#fafafa" }}>
                {(selectedItem.image || selectedItem.checkinImage || selectedItem.checkoutImage) ? (
                  <img
                    src={selectedItem.image || selectedItem.checkinImage || selectedItem.checkoutImage}
                    alt="Captured Scan Event"
                    style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: 4 }}
                  />
                ) : (
                  <span className="text-muted d-block py-4" style={{ fontSize: "12px" }}>No photo available</span>
                )}
              </div>
            </div>

            <div className="text-center mt-3">
              <button className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableCheckInRealtime;
