import React from 'react';
import { Alert } from 'react-bootstrap';
import './ErrorBoundary.scss';

const ErrorMessage = ({ message, onDismiss }) => {
  return (
    <Alert variant="danger" onClose={onDismiss} dismissible className="error-message">
      <Alert.Heading>Error!</Alert.Heading>
      <p>{message || 'An unexpected error occurred'}</p>
    </Alert>
  );
};

export default ErrorMessage;
