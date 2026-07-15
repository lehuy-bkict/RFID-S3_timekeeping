import React from 'react';
import './Loading.scss';

const Loading = () => {
  return (
    <div className="loading-spinner">
      <div className="spinner">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
      <p className="loading-text">Loading...</p>
    </div>
  );
};

export default Loading;
