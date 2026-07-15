import * as types from '../types/checkinTypes';
import { getCheckInData, deleteCheckInData } from '../../service/apiAdmin/ApiClientCheckInService';

export const fetchCheckInData = (filters) => async (dispatch) => {
  dispatch({ type: types.FETCH_CHECKIN_DATA });
  try {
    const response = await getCheckInData(filters);
    if (response.success) {
      dispatch({
        type: types.FETCH_CHECKIN_DATA_SUCCESS,
        payload: response.data,
      });
    } else {
      dispatch({
        type: types.FETCH_CHECKIN_DATA_FAILED,
        payload: response.messages,
      });
    }
  } catch (error) {
    dispatch({
      type: types.FETCH_CHECKIN_DATA_FAILED,
      payload: error.message,
    });
  }
};

export const deleteCheckIn = (id) => async (dispatch) => {
  dispatch({ type: types.DELETE_CHECKIN_DATA });
  try {
    const response = await deleteCheckInData({ _id: id });
    if (response.success) {
      dispatch({
        type: types.DELETE_CHECKIN_DATA_SUCCESS,
        payload: id,
      });
    } else {
      dispatch({
        type: types.DELETE_CHECKIN_DATA_FAILED,
        payload: response.messages,
      });
    }
  } catch (error) {
    dispatch({
      type: types.DELETE_CHECKIN_DATA_FAILED,
      payload: error.message,
    });
  }
};

export const addRealtimeEvent = (event) => (dispatch) => {
  dispatch({
    type: types.ADD_REALTIME_EVENT,
    payload: event,
  });
};
