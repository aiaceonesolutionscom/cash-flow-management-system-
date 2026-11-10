import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cashflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cashflow_token');
      localStorage.removeItem('cashflow_admin');
    }
    return Promise.reject(error);
  }
);

// Currency Formatter Utility
export const formatPKR = (amount: string | number | undefined): string => {
  if (amount === undefined || amount === null) return 'PKR 0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'PKR 0.00';
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `PKR ${parts.join('.')}`;
};
