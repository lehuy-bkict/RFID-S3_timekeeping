import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBell, 
  FiCheck, 
  FiTrash2, 
  FiClock, 
  FiArrowDownRight, 
  FiArrowUpRight, 
  FiAlertTriangle 
} from 'react-icons/fi';
import socketService from '../../../../service/serviceLayer/socketService';
import './NotificationPopover.scss';

const MAX_NOTIFICATIONS = 10;

// Format relative time in Vietnamese
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Vừa xong';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`;
};

const NotificationPopover = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => n.isUnRead).length;

  // Listen to Socket.IO scan events onboard (browser memory only)
  useEffect(() => {
    socketService.connect();
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleScanCompleted = (data) => {
      const isOut = !!data.isCheckOut;
      const userName = data.userName && data.userName.toLowerCase() !== 'client' 
        ? data.userName 
        : 'Khách';

      const newNotif = {
        id: data.eventId || `${data.rfid}-${Date.now()}-${Math.random()}`,
        type: isOut ? 'checkout' : 'checkin',
        title: `${userName} vừa ${isOut ? 'Check-out (Ra)' : 'Check-in (Vào)'}`,
        description: `Thẻ: ${data.rfid} • Thiết bị: ${data.device || 'Cổng kiểm soát'}`,
        status: data.verificationStatus === 'MATCHED' 
          ? 'Khớp mặt' 
          : (data.verificationStatus === 'UNASSIGNED_CLIENT' ? 'Thẻ khách' : 'Không khớp'),
        timestamp: data.timestamp || new Date().toISOString(),
        isUnRead: true,
        image: data.image || null,
        rfid: data.rfid
      };

      setNotifications(prev => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
    };

    const handleScanRejected = (data) => {
      const newNotif = {
        id: `reject-${data.rfid}-${Date.now()}`,
        type: 'rejected',
        title: `CẢNH BÁO: Quẹt thẻ bị từ chối!`,
        description: `Thẻ: ${data.rfid} (${data.userName || 'Không rõ'}) - ${data.reason || 'Khuôn mặt không khớp'}`,
        status: 'Từ chối',
        timestamp: data.timestamp || new Date().toISOString(),
        isUnRead: true,
        image: null,
        rfid: data.rfid
      };

      setNotifications(prev => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
    };

    socket.on('rfid-scan-completed', handleScanCompleted);
    socket.on('rfid-scan-rejected', handleScanRejected);

    return () => {
      socket.off('rfid-scan-completed', handleScanCompleted);
      socket.off('rfid-scan-rejected', handleScanRejected);
    };
  }, []);

  // Handle clicking outside to close popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark all notifications as read
  const handleMarkAllAsRead = (e) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, isUnRead: false })));
  };

  // Clear all in-memory notifications
  const handleClearAll = (e) => {
    e.stopPropagation();
    setNotifications([]);
  };

  // Click on a notification item
  const handleItemClick = (item) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isUnRead: false } : n));
    setIsOpen(false);
    navigate('/access/admins/CheckInRealtime');
  };

  return (
    <div className="notification-popover-container" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button 
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo ra vào mới"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <FiBell className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge-count">
            {unreadCount > 9 ? '10' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="notification-dropdown-panel animate-popover">
          {/* Header */}
          <div className="notif-header">
            <div className="notif-header-info">
              <h4 className="notif-title">Thông báo</h4>
              <p className="notif-subtitle">
                {unreadCount > 0 
                  ? `Có ${unreadCount} lượt ra vào mới` 
                  : 'Không có tin mới'}
              </p>
            </div>
            {notifications.length > 0 && (
              <div className="notif-header-actions">
                {unreadCount > 0 && (
                  <button 
                    type="button" 
                    className="notif-action-btn"
                    title="Đánh dấu tất cả đã đọc"
                    onClick={handleMarkAllAsRead}
                  >
                    <FiCheck />
                  </button>
                )}
                <button 
                  type="button" 
                  className="notif-action-btn delete-btn"
                  title="Xóa danh sách"
                  onClick={handleClearAll}
                >
                  <FiTrash2 />
                </button>
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="notif-list-wrapper">
            {notifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="empty-bell-icon">
                  <FiBell />
                </div>
                <p className="empty-title">Chưa có thông báo mới</p>
                <span className="empty-desc">
                  Khi người dùng quẹt thẻ RFID hoặc camera nhận diện, thông báo sẽ hiển thị tại đây theo thời gian thực.
                </span>
              </div>
            ) : (
              <ul className="notif-list">
                {notifications.map((item) => (
                  <li 
                    key={item.id}
                    className={`notif-item ${item.isUnRead ? 'unread' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Event Type Icon Badge */}
                    <div className={`notif-avatar-icon ${item.type}`}>
                      {item.type === 'checkin' && <FiArrowDownRight />}
                      {item.type === 'checkout' && <FiArrowUpRight />}
                      {item.type === 'rejected' && <FiAlertTriangle />}
                    </div>

                    {/* Notification Content */}
                    <div className="notif-content">
                      <div className="notif-item-title-row">
                        <span className="notif-item-title">{item.title}</span>
                        {item.isUnRead && <span className="unread-dot"></span>}
                      </div>
                      <p className="notif-item-desc">{item.description}</p>
                      <div className="notif-item-meta">
                        <span className="notif-time">
                          <FiClock className="time-icon" /> {formatRelativeTime(item.timestamp)}
                        </span>
                        <span className={`notif-pill ${item.type}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="notif-footer">
            <button 
              type="button" 
              className="notif-view-all-btn"
              onClick={() => {
                setIsOpen(false);
                navigate('/access/admins/checkinevent');
              }}
            >
              Xem tất cả lịch sử sự kiện →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPopover;

