import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import api from '../lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // --- NEW STATE for Onboarding ---
  // 'loading': We haven't checked yet.
  // 'onboarded': User has completed all steps.
  // 'incomplete': User has started but not finished.
  const [onboardingStatus, setOnboardingStatus] = useState('loading');

  const checkOnboardingStatus = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setOnboardingStatus('incomplete');
      return;
    }
    try {
      const res = await api.get('/onboarding/status');
      if (res.data.isOnboarded) {
        setOnboardingStatus('onboarded');
      } else {
        setOnboardingStatus('incomplete');
      }
      return res.data;
    } catch (err) {
      console.error('Failed to check onboarding status', err);
      // Default to incomplete on error to be safe
      setOnboardingStatus('incomplete');
      return { isOnboarded: false };
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // Fetch user profile and onboarding status when token is available
      api
        .get('/user/me')
        .then((res) => {
          if (res.data.status) setUser(res.data.user);
        })
        .catch((err) => {
          console.error('Profile fetch error:', err);
          logout(); // Log out if token is invalid
        });
      checkOnboardingStatus();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setOnboardingStatus('incomplete'); // Not onboarded if not logged in
    }
  }, [token, checkOnboardingStatus]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const login = (data) => {
    setToken(data.token);
    setUser(data.user);
    // After login, immediately check onboarding status
    checkOnboardingStatus();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // --- NEW FUNCTION to manually update status ---
  const completeOnboarding = () => {
    setOnboardingStatus('onboarded');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        onboardingStatus,
        checkOnboardingStatus,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
