import React, { useState } from 'react';
import './Admin.scss';
import { Outlet } from 'react-router-dom';
import PerfectScrollbar from 'react-perfect-scrollbar';
import Header from './header/Header';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap';
import './Admin.scss'

const Admin = () => {
    const [show, setShow] = useState(true);

    return (
        <>
            <Header show={show} setShow={setShow} />
            <div className="admin-container">
                {/* <div className="admin-sidebar">
                    <SideBar
                        show={show}
                        handleToggleSidebar={handleToggleSidebar}
                    />
                </div> */}
                <div className="admin-content">
                    <PerfectScrollbar>
                        <div className="admin-main">
                            <Outlet />
                        </div>
                    </PerfectScrollbar>
                </div>
            </div>
        </>

    );
}

export default Admin;
