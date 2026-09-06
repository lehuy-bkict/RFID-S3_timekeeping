import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8999/api/V1/Developer';

const DEFAULT_API_KEY = 'U2FsdGVkX1907NZ7/0RwlZtL7Llqkc7sig13nyAtorVdkM+UtLnZV37TiT3LG+GR';

const getApiKey = () => {
  return localStorage.getItem('apiKey') || DEFAULT_API_KEY;
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

export const getDashboardInfo = async () => {
  try {
    const response = await api.get('/Home/DashBoardInfo');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateDashboardInput = async (data) => {
  try {
    const response = await api.post('/Home/DashBoardInput', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
