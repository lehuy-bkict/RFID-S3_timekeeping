import Cookies from 'js-cookie';

export const setToken = (token) => {
  localStorage.setItem('token', token);
  Cookies.set('token', token, { expires: 7 });
};

export const getToken = () => {
  return localStorage.getItem('token') || Cookies.get('token');
};

export const clearToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('apiKey');
  Cookies.remove('token');
};

export const setApiKey = (apiKey) => {
  localStorage.setItem('apiKey', apiKey);
};

export const getApiKey = () => {
  return localStorage.getItem('apiKey');
};

export default {
  setToken,
  getToken,
  clearToken,
  setApiKey,
  getApiKey,
};
