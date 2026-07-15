import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { initialize } from '../redux/action/authAction';

export default function Auth({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('key') || localStorage.getItem('token');
      if (!token) {
        return dispatch(initialize({ isAuthenticated: false, user: null }));
      }
      try {
        // Verify token is valid
        // In a real app, you'd make an API call here
        const user = { username: 'Admin', role: 'admin' };
        return dispatch(initialize({ isAuthenticated: true, user }));
      } catch (e) {
        return dispatch(initialize({ isAuthenticated: false, user: null }));
      }
    })();
  }, [dispatch]);

  return <>{children}</>;
}