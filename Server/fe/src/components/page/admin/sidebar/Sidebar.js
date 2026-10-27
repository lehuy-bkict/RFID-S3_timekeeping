import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaChartPie, 
  FaBolt, 
  FaCalendarCheck, 
  FaUsers, 
  FaVideo, 
  FaUserCheck,
  FaMicrochip
} from 'react-icons/fa6';
import { FiX, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import './Sidebar.scss';

const NAV_ITEMS = [
  {
    title: 'Dashboard',
    path: '/access/admins/home',
    icon: <FaChartPie className="nav-icon" />,
  },
  {
    title: 'Realtime Check',
    path: '/access/admins/CheckInRealtime',
    icon: <FaBolt className="nav-icon" />,
  },
  {
    title: 'Events History',
    path: '/access/admins/checkinevent',
    icon: <FaCalendarCheck className="nav-icon" />,
  },
  {
    title: 'User Management',
    path: '/access/admins/users',
    icon: <FaUsers className="nav-icon" />,
  },
  {
    title: 'Live Camera',
    path: '/access/admins/live-camera',
    icon: <FaVideo className="nav-icon" />,
  },
  {
    title: 'Face Verification',
    path: '/access/admins/face-verification',
    icon: <FaUserCheck className="nav-icon" />,
  },
];

const Sidebar = ({ 
  isMobile = false, 
  onClose = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {} 
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className={`minimal-sidebar ${isMobile ? 'mobile-drawer' : 'desktop-fixed'} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <Link to="/access/admins/home" className="brand-link" onClick={onClose} title="ESP32-S3 Timekeeping">
          <div className="brand-logo-box">
            <FaMicrochip className="brand-icon" />
          </div>
          {!isCollapsed && (
            <div className="brand-info">
              <span className="brand-name">ESP32-S3</span>
              <span className="brand-sub">Attendance IoT</span>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        {isMobile && (
          <button className="btn-close-drawer" onClick={onClose} aria-label="Close menu">
            <FiX />
          </button>
        )}
      </div>

      {/* Account / Workspace Mini-card (Minimal UI signature) */}
      <div className="sidebar-account-card" title={isCollapsed ? "System Admin (Administrator)" : undefined}>
        <div className="account-avatar">
          <span>AD</span>
        </div>
        {!isCollapsed && (
          <div className="account-details">
            <span className="account-name">System Admin</span>
            <span className="account-role">Administrator</span>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        {!isCollapsed && <div className="nav-section-title">OVERVIEW & CONTROLS</div>}
        <ul className="nav-list">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath.toLowerCase() === item.path.toLowerCase() || 
                             (item.path !== '/access/admins/home' && currentPath.toLowerCase().includes(item.path.toLowerCase()));
            return (
              <li key={item.path} className="nav-item">
                <Link
                  to={item.path}
                  className={`nav-link-btn ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                  title={isCollapsed ? item.title : undefined}
                >
                  <span className="nav-icon-wrapper">{item.icon}</span>
                  {!isCollapsed && <span className="nav-item-title">{item.title}</span>}
                  {isActive && !isCollapsed && <span className="active-dot" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer Info */}
      <div className="sidebar-footer">
        <div className="system-pill" title={isCollapsed ? "ESP32 Server v1.0 (Online)" : undefined}>
          <span className="pulse-dot"></span>
          {!isCollapsed && <span>ESP32 Server v1.0</span>}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
