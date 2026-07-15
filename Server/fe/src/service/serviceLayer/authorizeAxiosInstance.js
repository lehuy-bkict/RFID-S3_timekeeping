import axios from "axios";
import { toast } from 'react-toastify';

let authorizeAxiosInstance = axios.create({
  baseURL: `http://localhost:8999/api/V1/Developer`,
}
);

authorizeAxiosInstance.interceptors.request.use(
  function (config) {
    try {
      const apiKey = 'U2FsdGVkX1907NZ7/0RwlZtL7Llqkc7sig13nyAtorVdkM+UtLnZV37TiT3LG+GR'; 
      config.headers['x-api-key'] = apiKey;
    } catch (e) {
      console.error("Error attaching API Key:", e);
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

authorizeAxiosInstance.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response?.status === 401) {
      toast.error("API Key is invalid or has expired");
    } else if (error.response?.status === 403) {
      toast.error("You do not have permission to access this resource");
    } else {
      toast.error(error.response?.data?.error || "An unknown error occurred");
    }
    return Promise.reject(error);
  }
);

export default authorizeAxiosInstance;