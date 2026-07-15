import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8999/api/V1/Developer';

const getApiKey = () => {
  return localStorage.getItem('apiKey') || '';
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const apiKey = getApiKey();
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});

export const getCheckInData = async (filters = {}) => {
  try {
    const response = await api.post('/CheckInOut/GetData', filters);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteCheckInData = async (data) => {
  try {
    const response = await api.post('/CheckInOut/DeleteData', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
