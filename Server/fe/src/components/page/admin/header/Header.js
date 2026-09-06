import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link, useLocation } from 'react-router-dom';
import './Header.scss';

const CollapsibleExample = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    return (
        <Navbar collapseOnSelect expand="lg" className="header-navbar navbar-custom px-4 py-2">
            <Container fluid>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />

                <Navbar.Collapse id="responsive-navbar-nav">
                    <Nav className="me-auto">
                        <Nav.Link as={Link} to="/access/admins/home" className={currentPath.includes('/access/admins/home') ? 'active' : ''}>Home</Nav.Link>
                        <Nav.Link as={Link} to="/access/admins/CheckInRealtime" className={currentPath.includes('/access/admins/CheckInRealtime') ? 'active' : ''}>Realtime Check</Nav.Link>
                        <Nav.Link as={Link} to="/access/admins/checkinevent" className={currentPath.includes('/access/admins/checkinevent') ? 'active' : ''}>Events</Nav.Link>
                        <Nav.Link as={Link} to="/access/admins/users" className={currentPath.includes('/access/admins/users') ? 'active' : ''}>Users</Nav.Link>
                        <Nav.Link as={Link} to="/access/admins/face-verification" className={currentPath.includes('/access/admins/face-verification') ? 'active' : ''}>Face Verification</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default CollapsibleExample;
