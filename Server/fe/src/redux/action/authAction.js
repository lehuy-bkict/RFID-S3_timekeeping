import * as types from '../types/authTypes';

export const initialize = (payload) => (dispatch) => {
  dispatch({
    type: types.INITIALIZE,
    payload,
  });
};

export const login = (credentials) => (dispatch) => {
  dispatch({
    type: types.LOGIN,
    payload: credentials,
  });
};

export const logout = () => (dispatch) => {
  dispatch({
    type: types.LOGOUT,
  });
};
