import React from 'react';
import { useLocation } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import NotificationPopover from './NotificationPopover';
import './Header.scss';

const PAGE_TITLES = {
  '/access/admins/home': 'Dashboard Overview',
  '/access/admins/checkinrealtime': 'Realtime Entry / Exit Check',
  '/access/admins/checkinevent': 'Events History & Reports',
  '/access/admins/users': 'User Management & RFID',
  '/access/admins/live-camera': 'Live Stream Camera',
  '/access/admins/face-verification': 'Face Verification AI',
};

const Header = ({ onOpenMobileNav, onToggleDesktopCollapse, isCollapsed = false }) => {
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase();
  
  // Find matching title or fallback
  const pageTitle = Object.keys(PAGE_TITLES).find(path => currentPath.includes(path))
    ? PAGE_TITLES[Object.keys(PAGE_TITLES).find(path => currentPath.includes(path))]
    : 'Admin Portal';

  const handleMenuClick = () => {
    if (window.innerWidth < 1024) {
      if (onOpenMobileNav) onOpenMobileNav();
    } else {
      if (onToggleDesktopCollapse) onToggleDesktopCollapse();
    }
  };

  return (
    <header className="minimal-header">
      <div className="header-left">
        <button 
          type="button"
          className="btn-menu-toggle" 
          onClick={handleMenuClick}
          title={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
          aria-label="Toggle navigation menu"
        >
          <FiMenu />
        </button>
        <div className="header-page-info">
          <h1 className="header-title">{pageTitle}</h1>
        </div>
      </div>

      <div className="header-right">
        <div className="header-status-pill">
          <span className="status-indicator"></span>
          <span className="status-text">ESP32 Connected</span>
        </div>

        {/* Real-time Notifications Popover (Max 10 items onboard) */}
        <NotificationPopover />

        <div className="header-user-badge">
          <div className="user-avatar-circle">
            <span>A</span>
          </div>
          <span className="user-label">Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
