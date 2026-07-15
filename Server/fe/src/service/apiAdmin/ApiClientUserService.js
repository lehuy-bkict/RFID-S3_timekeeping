import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8999';

const getToken = () => {
  return localStorage.getItem('token') || '';
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const LogIn = async () => {
  try {
    const response = await api.get('/ping');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
