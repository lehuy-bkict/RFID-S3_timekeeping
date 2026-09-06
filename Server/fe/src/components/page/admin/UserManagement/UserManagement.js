import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Table, Badge, Spinner } from 'react-bootstrap';
import { FaUserPlus, FaIdCard, FaImage, FaTrash, FaPen, FaMagnifyingGlass, FaEye } from 'react-icons/fa6';
import { useDebounce } from 'use-debounce';
import { toast } from 'react-toastify';
import { GetUserData, CreateUser, UpdateUser, DeleteUser } from '../../../../service/apiAdmin/ApiUserService';
import './UserManagement.scss';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type.startsWith('image/')) return reject(new Error('Please select an image file.'));
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error('Image size must not exceed 8 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cardNumber: '',
    avatar: '',
    phone: '',
    email: '',
    department: '',
    note: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Full-size Photo Modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedUserPhoto, setSelectedUserPhoto] = useState(null);

  const fileInputRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await GetUserData({ search: debouncedSearch });
      if (response?.data?.success && Array.isArray(response.data.data)) {
        setUsers(response.data.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users from server.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      cardNumber: '',
      avatar: '',
      phone: '',
      email: '',
      department: '',
      note: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setIsEditing(true);
    setEditingId(user._id);
    setFormData({
      name: user.name || '',
      cardNumber: user.cardNumber || '',
      avatar: user.avatar || '',
      phone: user.phone || '',
      email: user.email || '',
      department: user.department || '',
      note: user.note || ''
    });
    setShowModal(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await readImageFile(file);
      setFormData(prev => ({ ...prev, avatar: base64 }));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.warn('Please enter full name.');
    if (!formData.cardNumber.trim()) return toast.warn('Please enter RFID card number.');
    if (!formData.avatar) return toast.warn('Please select a profile photo for the user.');

    setFormSubmitting(true);
    try {
      if (isEditing) {
        const response = await UpdateUser({ _id: editingId, ...formData });
        if (response?.data?.success) {
          toast.success('User updated successfully!');
          setShowModal(false);
          fetchUsers();
        } else {
          toast.error(response?.data?.messages || 'Failed to update user.');
        }
      } else {
        const response = await CreateUser(formData);
        if (response?.data?.success) {
          toast.success('User created successfully!');
          setShowModal(false);
          fetchUsers();
        } else {
          toast.error(response?.data?.messages || 'Failed to create user.');
        }
      }
    } catch (err) {
      console.error('Submit user error:', err);
      toast.error('An error occurred while saving user data.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.name}" (Card: ${user.cardNumber})?`)) return;
    try {
      const response = await DeleteUser({ _id: user._id });
      if (response?.data?.success) {
        toast.success('User deleted successfully!');
        fetchUsers();
      } else {
        toast.error(response?.data?.messages || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      toast.error('An error occurred while deleting user.');
    }
  };

  const handleViewPhoto = (user) => {
    setSelectedUserPhoto(user);
    setShowPhotoModal(true);
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '—';
    const d = new Date(dateTime);
    return d.toLocaleString('en-US');
  };

  return (
    <div className="manage-account-container user-management-page">
      <Container fluid className="p-0">
        <div className="page-header">
          <h3 className="page-title">User & RFID Card Management</h3>
          <Button variant="primary" className="d-flex align-items-center gap-2 px-3 py-2 shadow-sm" onClick={handleOpenAddModal}>
            <FaUserPlus /> Add New User
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-3">
            <Row className="align-items-center">
              <Col md={6}>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <FaMagnifyingGlass className="text-muted" />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, RFID card, phone, department..."
                    className="border-start-0 ps-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button variant="outline-secondary" size="sm" onClick={() => setSearchTerm('')}>Clear</Button>
                  )}
                </div>
              </Col>
              <Col md={6} className="text-md-end mt-2 mt-md-0">
                <span className="text-muted small">Total: <strong>{users.length}</strong> users</span>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Users Table */}
        <div className="my-table">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2 mb-0">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5">
              <FaIdCard style={{ fontSize: '3rem', color: '#cbd5e1' }} />
              <p className="text-muted mt-3 mb-0">No users found. Click "Add New User" to get started.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                      <th style={{ width: '60px' }} className="text-center">No.</th>
                      <th style={{ width: '80px' }} className="text-center">Photo</th>
                      <th>Full Name</th>
                      <th>RFID Card Number</th>
                      <th>Phone Number</th>
                      <th>Department / Notes</th>
                      <th>Registration Date</th>
                      <th style={{ width: '120px' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user._id}>
                        <td className="text-center text-muted">{index + 1}</td>
                        <td className="text-center">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="user-avatar-thumb"
                              title="Click to view original photo"
                              onClick={() => handleViewPhoto(user)}
                            />
                          ) : (
                            <span className="text-muted small">None</span>
                          )}
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{user.name}</div>
                          {user.email && <small className="text-muted d-block">{user.email}</small>}
                        </td>
                        <td>
                          <Badge bg="light" className="rfid-badge text-dark border">
                            {user.cardNumber}
                          </Badge>
                        </td>
                        <td>{user.phone || '—'}</td>
                        <td>
                          {user.department && <Badge bg="secondary" className="me-1">{user.department}</Badge>}
                          <small className="text-muted">{user.note || '—'}</small>
                        </td>
                        <td className="text-muted small">{formatDateTime(user.createdAt)}</td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center gap-2">
                            <Button
                              variant="outline-info"
                              size="sm"
                              title="View original profile photo"
                              onClick={() => handleViewPhoto(user)}
                            >
                              <FaEye />
                            </Button>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              title="Edit user"
                              onClick={() => handleOpenEditModal(user)}
                            >
                              <FaPen />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              title="Delete user"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
        </div>

        {/* Add / Edit User Modal */}
        <Modal
          show={showModal}
          onHide={() => !formSubmitting && setShowModal(false)}
          size="lg"
          centered
          className="user-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              {isEditing ? 'Edit User Details' : 'Add New User'}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body className="p-4">
              <Row className="g-4">
                {/* Profile Photo Upload */}
                <Col md={5}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">
                      Profile Photo (Avatar) <span className="text-danger">*</span>
                    </Form.Label>
                    <div
                      className="image-dropzone"
                      style={{
                        height: '330px',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        borderRadius: '12px',
                        border: '2px dashed #93c5fd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer'
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {formData.avatar ? (
                        <img
                          src={formData.avatar}
                          alt="User avatar preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <div className="text-center p-3">
                          <FaImage style={{ fontSize: '2.5rem', color: '#60a5fa' }} />
                          <div className="mt-2 fw-medium">Select Profile Photo</div>
                          <small className="text-muted">JPG, PNG, WEBP · Max 8MB</small>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="d-none"
                      onChange={handleImageChange}
                    />
                    <div className="d-flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline-primary"
                        size="sm"
                        className="w-100"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {formData.avatar ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                      {formData.avatar && (
                        <Button
                          type="button"
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </Form.Group>
                </Col>

                {/* Form Fields */}
                <Col md={7}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Full Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter full name (e.g. John Doe)"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      RFID Card Number <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter RFID card number (e.g. 3173163155)"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                      required
                    />
                    <Form.Text className="text-muted">
                      Each RFID card number must be unique.
                    </Form.Text>
                  </Form.Group>

                  <Row className="g-2 mb-3">
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Phone Number</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Contact phone number"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold">Department / Class</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="e.g. IT, HR, Marketing..."
                          value={formData.department}
                          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label className="fw-semibold">Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Additional notes (optional)..."
                      value={formData.note}
                      onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={formSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={formSubmitting}>
                {formSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  isEditing ? 'Save Changes' : 'Create User'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Full-size Photo Modal */}
        <Modal
          show={showPhotoModal}
          onHide={() => setShowPhotoModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              Profile Photo: {selectedUserPhoto?.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center p-3">
            {selectedUserPhoto?.avatar ? (
              <div>
                <img
                  src={selectedUserPhoto.avatar}
                  alt={selectedUserPhoto.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '450px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
                <div className="mt-3 text-start small bg-light p-3 rounded">
                  <div><strong>RFID Card:</strong> <code>{selectedUserPhoto.cardNumber}</code></div>
                  <div><strong>Full Name:</strong> {selectedUserPhoto.name}</div>
                  <div><strong>Department:</strong> {selectedUserPhoto.department || '—'}</div>
                </div>
              </div>
            ) : (
              <p className="text-muted">No profile photo available.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPhotoModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default UserManagement;
