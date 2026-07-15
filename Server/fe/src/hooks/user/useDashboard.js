import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';

export const useDashboard = () => {
  const dispatch = useDispatch();
  const dashboard = useSelector((state) => state.dashboard);

  const getDashboardInfo = useCallback(() => {
    // dispatch(fetchDashboardInfo());
  }, [dispatch]);

  return {
    ...dashboard,
    getDashboardInfo,
  };
};

export default useDashboard;
