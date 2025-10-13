import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  // Login with email and password
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', access_token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      return { token: access_token, user };
    } catch (error) {
      throw error.response?.data || error;
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
      
      return { token: access_token, user };
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Logout
  logout: async () => {
    try {
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
