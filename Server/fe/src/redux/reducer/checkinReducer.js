import * as types from '../types/checkinTypes';

const initialState = {
  checkInData: [],
  realtimeEvents: [],
  loading: false,
  error: null,
};

const checkinReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.FETCH_CHECKIN_DATA:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case types.FETCH_CHECKIN_DATA_SUCCESS:
      return {
        ...state,
        checkInData: action.payload,
        loading: false,
      };
    case types.FETCH_CHECKIN_DATA_FAILED:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case types.DELETE_CHECKIN_DATA:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case types.DELETE_CHECKIN_DATA_SUCCESS:
      return {
        ...state,
        checkInData: state.checkInData.filter((item) => item._id !== action.payload),
        loading: false,
      };
    case types.DELETE_CHECKIN_DATA_FAILED:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case types.ADD_REALTIME_EVENT:
      return {
        ...state,
        realtimeEvents: [action.payload, ...state.realtimeEvents],
      };
    default:
      return state;
  }
};

export default checkinReducer;
