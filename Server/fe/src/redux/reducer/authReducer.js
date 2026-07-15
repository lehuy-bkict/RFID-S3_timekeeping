import * as types from '../types/authTypes';

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.INITIALIZE:
      return {
        ...state,
        isAuthenticated: action.payload?.isAuthenticated,
        user: action.payload?.user,
      };
    case types.LOGIN:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case types.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
      };
    case types.LOGIN_FAILED:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

export default authReducer;
