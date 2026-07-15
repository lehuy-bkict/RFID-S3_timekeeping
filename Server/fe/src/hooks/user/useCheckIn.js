import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';

export const useCheckIn = () => {
  const dispatch = useDispatch();
  const checkin = useSelector((state) => state.checkin);

  const getCheckInData = useCallback((filters) => {
    // dispatch(fetchCheckInData(filters));
  }, [dispatch]);

  const deleteCheckInRecord = useCallback((id) => {
    // dispatch(deleteCheckIn(id));
  }, [dispatch]);

  return {
    ...checkin,
    getCheckInData,
    deleteCheckInRecord,
  };
};

export default useCheckIn;
