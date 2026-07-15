import moment from 'moment';

export const formatDate = (date, format = 'DD/MM/YYYY') => {
  return moment(date).format(format);
};

export const formatDateTime = (date, format = 'DD/MM/YYYY HH:mm:ss') => {
  return moment(date).format(format);
};

export const parseDate = (dateString) => {
  return moment(dateString).toDate();
};

export const isDateValid = (date) => {
  return moment(date).isValid();
};

export default {
  formatDate,
  formatDateTime,
  parseDate,
  isDateValid,
};
