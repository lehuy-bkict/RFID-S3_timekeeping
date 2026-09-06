import React, { useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { verifyFaces } from '../../../../service/apiAdmin/ApiFaceVerificationService';
import './FaceVerification.scss';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type.startsWith('image/')) return reject(new Error('Please select an image file.'));
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error('Image size must not exceed 8 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function ImageInput({ title, hint, image, setImage }) {
  const input = useRef(null);
  const onChange = async (event) => {
    try { setImage(await readImage(event.target.files[0])); } catch (error) { window.alert(error.message); }
  };
  return (
    <Card className="face-image-card h-100 shadow-sm border-0">
      <Card.Body className="d-flex flex-column">
        <h5>{title}</h5>
        <p className="text-muted small">{hint}</p>
        <button type="button" className="image-dropzone" onClick={() => input.current?.click()}>
          {image ? <img src={image} alt={title} /> : <span>Click to select image<br /><small>JPG, PNG, WEBP · Max 8 MB</small></span>}
        </button>
        <input ref={input} type="file" accept="image/*" className="d-none" onChange={onChange} />
        <div className="d-flex gap-2 mt-3">
          <Button variant="outline-primary" size="sm" onClick={() => input.current?.click()}>Select Photo</Button>
          {image && <Button variant="outline-secondary" size="sm" onClick={() => { setImage(''); input.current.value = ''; }}>Remove</Button>}
        </div>
      </Card.Body>
    </Card>
  );
}

export default function FaceVerification() {
  const [firstImage, setFirstImage] = useState('');
  const [secondImage, setSecondImage] = useState('');
  const [threshold, setThreshold] = useState(0.4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setResult(null);
    if (!firstImage || !secondImage) return setError('Please select both photos to proceed with verification.');
    setLoading(true);
    try { setResult(await verifyFaces({ cardImage: firstImage, cameraImage: secondImage, threshold: Number(threshold) })); }
    catch (err) { setError(err.response?.data?.message || 'Verification failed. Please ensure Face AI service is running.'); }
    finally { setLoading(false); }
  };

  const matched = result?.success && result.isMatch;
  return (
    <div className="manage-account-container face-verification">
      <div className="page-header">
        <h3 className="page-title">Face Verification</h3>
      </div>
      <Form onSubmit={submit}>
        <Row className="g-4">
          <Col md={6}><ImageInput title="1. First Photo" hint="Select original profile photo or sample image." image={firstImage} setImage={setFirstImage} /></Col>
          <Col md={6}><ImageInput title="2. Second Photo" hint="Select captured face image for comparison." image={secondImage} setImage={setSecondImage} /></Col>
        </Row>
        <Card className="mt-4 border-0 shadow-sm"><Card.Body className="d-flex flex-wrap align-items-center gap-3">
          <Form.Group className="threshold-control"><Form.Label className="mb-0">Match threshold: <strong>{Number(threshold).toFixed(2)}</strong></Form.Label><Form.Range min="0" max="1" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Form.Group>
          <small className="text-muted flex-grow-1">Cosine similarity closer to 1 means higher similarity.</small>
          <Button type="submit" variant="primary" disabled={loading}>{loading ? <><Spinner animation="border" size="sm" className="me-2" />Comparing...</> : 'Compare Photos'}</Button>
        </Card.Body></Card>
      </Form>
      {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
      {result && <Card className={`result-card mt-4 border-0 ${matched ? 'matched' : 'not-matched'}`}><Card.Body>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div><Badge bg={matched ? 'success' : 'danger'} className="result-badge">{matched ? 'VERIFIED MATCH' : 'NOT MATCHED'}</Badge><h4 className="mt-3 mb-1">{matched ? 'The two photos likely belong to the same person' : (result.message || 'Photos did not meet the match threshold')}</h4><small className="text-muted">{result.model || 'Local InsightFace'}</small></div>
          <div className="score text-center"><small>Cosine similarity</small><div>{result.similarity ?? '—'}</div><small>Threshold: {result.threshold ?? Number(threshold).toFixed(2)}</small></div>
        </div>
      </Card.Body></Card>}
    </div>
  );
}
