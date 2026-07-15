import React, { useState } from 'react';
import Table3 from '../../../default/table/table.3/index';
import { FaBarcode } from "react-icons/fa6";
import Barcode from "react-barcode";

const TableCheckInRealtime = ({ currentPage, currentItems, totalPages, searchName, handlePagination, limit, handleChangeLimit, refreshData }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalBarcode, setModalBarcode] = useState("");
  const [modalCheckin, setModalCheckin] = useState("");
  const [modalCheckout, setModalCheckout] = useState("");

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

  // Tính tiền gửi xe
  const calcParkingFee = (checkin, checkout) => {
    if (!checkin || !checkout) return "Not eligible";
    const inTime = new Date(checkin);
    const outTime = new Date(checkout);
    const diffMs = outTime - inTime;
    if (isNaN(diffMs) || diffMs <= 0) return "Not eligible";
    const diffMin = diffMs / 60000;
    if (diffMin < 10) return "$0";
    // Đã quá 10 phút
    let fee = 5000;
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH > 12) {
      // Mỗi 12h tăng thêm 10k
      const extra = Math.ceil((diffH - 12) / 12);
      fee += extra * 10000;
    }
    return "$" + fee.toLocaleString('en-US');
  };

  // Đảm bảo currentItems luôn là mảng
  const safeItems = Array.isArray(currentItems) ? currentItems : [];

  const titleArr = [
    'No.', 'Card number', 'Device ID', 'Status', 'Check-in time', 'Check-out time', 'Action'
  ];

  const actionArr = [
    {
      icon: <FaBarcode className="icon-black" />,
      title: "View barcode",
      callback: (e, data) => {
        const item = safeItems.find(i => i.rfid === data.id);
        setModalBarcode(data.id);
        setShowModal(true);
        setModalCheckin(item?.checkin || "");
        setModalCheckout(item?.checkout || "");
      },
      isVisible: true,
    }
  ];

  const dataArr = safeItems.map((item, index) => {
    const status = item.checkout ? "Left the parking lot" : "Inside the parking lot";
    return {
      id: item.rfid,
      stt: index + 1 + (currentPage - 1) * limit,
      rfid: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(item.rfid, searchName) }} />
      ),
      device: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(item.device, searchName) }} />
      ),
      status: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(status, searchName) }} />
      ),
      checkin: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(formatDateTime(item.checkin), searchName) }} />
      ),
      checkout: (
        <div dangerouslySetInnerHTML={{ __html: highlightText(item.checkout ? formatDateTime(item.checkout) : '', searchName) }} />
      ),
    };
  });

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
      {/* Modal hiển thị barcode và tiền gửi xe */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.3)",
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
              borderRadius: 8,
              minWidth: 320,
              minHeight: 120,
              textAlign: "center",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h5>Barcode</h5>
            <div style={{ margin: "24px 0" }}>
              {modalBarcode && (
                <Barcode value={modalBarcode} width={2} height={80} fontSize={18} />
              )}
            </div>
            <div style={{ margin: "12px 0", fontWeight: "bold" }}>
              Parking fee: {calcParkingFee(modalCheckin, modalCheckout)}
            </div>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableCheckInRealtime;
