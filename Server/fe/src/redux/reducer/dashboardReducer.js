import * as types from '../types/dashboardTypes';

const initialState = {
  dashboardInfo: [],
  loading: false,
  error: null,
};

const dashboardReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.FETCH_DASHBOARD_INFO:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case types.FETCH_DASHBOARD_INFO_SUCCESS:
      return {
        ...state,
        dashboardInfo: action.payload,
        loading: false,
      };
    case types.FETCH_DASHBOARD_INFO_FAILED:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case types.UPDATE_DASHBOARD_INPUT:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case types.UPDATE_DASHBOARD_INPUT_SUCCESS:
      return {
        ...state,
        dashboardInfo: action.payload,
        loading: false,
      };
    case types.UPDATE_DASHBOARD_INPUT_FAILED:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

export default dashboardReducer;
