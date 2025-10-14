import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  // Login with email and password
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      const { access_token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return { success: true, token: access_token, user };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Login failed' 
      };
    }
  },

  // Register new user
  register: async (email, password, displayName) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        display_name: displayName,
      });
      const { access_token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return { success: true, token: access_token, user };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Registration failed' 
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      // Optional: Call backend logout endpoint if needed
      // await api.post('/auth/logout');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Get current user from storage
  getCurrentUser: async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      return userDataString ? JSON.parse(userDataString) : null;
    } catch (error) {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  },
};
