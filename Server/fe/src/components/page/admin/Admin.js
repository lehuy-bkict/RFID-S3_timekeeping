import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './header/Header';
import Sidebar from './sidebar/Sidebar';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap';
import './Admin.scss';

const Admin = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const location = useLocation();

  // Automatically close mobile drawer when route changes
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  // Toggle desktop sidebar collapse and persist to localStorage
  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className={`minimal-dashboard-root ${isCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <div className={`desktop-sidebar-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        <Sidebar 
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Mobile Drawer with Backdrop (< 1024px) */}
      <div className={`mobile-drawer-wrapper ${isMobileNavOpen ? 'open' : ''}`}>
        <div 
          className="mobile-drawer-backdrop" 
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
        <div className="mobile-drawer-content">
          <Sidebar isMobile={true} onClose={() => setIsMobileNavOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-main-area">
        <Header 
          onOpenMobileNav={() => setIsMobileNavOpen(true)} 
          onToggleDesktopCollapse={handleToggleCollapse}
          isCollapsed={isCollapsed}
        />
        <main className="admin-content-wrapper">
          <div className="admin-page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
