import * as types from '../types/dashboardTypes';
import { getDashboardInfo, updateDashboardInput } from '../../service/apiAdmin/ApiClientDashboardService';

export const fetchDashboardInfo = () => async (dispatch) => {
  dispatch({ type: types.FETCH_DASHBOARD_INFO });
  try {
    const response = await getDashboardInfo();
    if (response.success) {
      dispatch({
        type: types.FETCH_DASHBOARD_INFO_SUCCESS,
        payload: response.data,
      });
    } else {
      dispatch({
        type: types.FETCH_DASHBOARD_INFO_FAILED,
        payload: response.messages,
      });
    }
  } catch (error) {
    dispatch({
      type: types.FETCH_DASHBOARD_INFO_FAILED,
      payload: error.message,
    });
  }
};

export const updateDashboard = (data) => async (dispatch) => {
  dispatch({ type: types.UPDATE_DASHBOARD_INPUT });
  try {
    const response = await updateDashboardInput(data);
    if (response.success) {
      dispatch({
        type: types.UPDATE_DASHBOARD_INPUT_SUCCESS,
        payload: response.data,
      });
    } else {
      dispatch({
        type: types.UPDATE_DASHBOARD_INPUT_FAILED,
        payload: response.messages,
      });
    }
  } catch (error) {
    dispatch({
      type: types.UPDATE_DASHBOARD_INPUT_FAILED,
      payload: error.message,
    });
  }
};
