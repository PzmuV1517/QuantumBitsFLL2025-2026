import React, { useEffect, useState } from 'react';
import { FaEyeSlash } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/services/api';
import { config } from '../../src/config/config';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [showDevModal, setShowDevModal] = useState(false);
  const [apiInput, setApiInput] = useState('');
  const [savingApi, setSavingApi] = useState(false);

  useEffect(() => {
    (async () => {
      const override = await AsyncStorage.getItem('apiBaseUrlOverride');
      const current = override || config.apiBaseUrl;
      setApiInput(current);
      if (override) api.defaults.baseURL = override;
    })();
  }, []);

  const validateUrl = (url: string) => /^https?:\/\//i.test(url);

  const saveApiOverride = async () => {
    if (!validateUrl(apiInput)) {
      Alert.alert('Invalid URL', 'Please enter a valid http(s) URL, e.g. http://192.168.1.10:8000/api');
      return;
    }
    try {
      setSavingApi(true);
      await AsyncStorage.setItem('apiBaseUrlOverride', apiInput);
      api.defaults.baseURL = apiInput;
      setShowDevModal(false);
      Alert.alert('Applied', 'Backend API base URL updated for this app.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save API URL override');
    } finally {
      setSavingApi(false);
    }
  };

  const resetApiOverride = async () => {
    try {
      setSavingApi(true);
      await AsyncStorage.removeItem('apiBaseUrlOverride');
      api.defaults.baseURL = config.apiBaseUrl;
      setApiInput(config.apiBaseUrl);
      setShowDevModal(false);
      Alert.alert('Reset', 'Reverted to default backend API URL.');
    } catch (e) {
      Alert.alert('Error', 'Failed to reset API URL override');
    } finally {
      setSavingApi(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>STRATUM</Text>
        <Text style={styles.subtitle}>Archaeological Documentation System</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#4A4A4A"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter your password"
              placeholderTextColor="#4A4A4A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword((v) => !v)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {Platform.OS === 'web' ? (
                showPassword ? (
                  <FaEyeSlash size={18} color="#FF2A2A" />
                ) : (
                  <FaEye size={18} color="#FF2A2A" />
                )
              ) : (
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#FF2A2A" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#F5F5F5" />
          ) : (
            <Text style={styles.buttonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.devButton} onPress={() => setShowDevModal(true)}>
          <Text style={styles.devButtonText}>Dev: API Base URL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={styles.linkText}>Register</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Dev modal for API override */}
      <Modal visible={showDevModal} transparent animationType="fade" onRequestClose={() => setShowDevModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend API Base URL</Text>
            <Text style={styles.modalText}>Enter the full API url including /api. Example: http://192.168.1.100:8000/api</Text>
            <TextInput
              style={styles.input}
              placeholder="http://host:port/api"
              placeholderTextColor="#777"
              value={apiInput}
              onChangeText={setApiInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowDevModal(false)} disabled={savingApi}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#3A0C0C', borderWidth: 1, borderColor: '#FF4444' }]} onPress={resetApiOverride} disabled={savingApi}>
                {savingApi ? <ActivityIndicator color="#F5F5F5" /> : <Text style={[styles.modalButtonText, { color: '#FF4444' }]}>Reset</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#FF2A2A' }]} onPress={saveApiOverride} disabled={savingApi}>
                {savingApi ? <ActivityIndicator color="#F5F5F5" /> : <Text style={[styles.modalButtonText, { color: '#F5F5F5' }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    padding: 24
  },
  header: {
    marginBottom: 48,
    alignItems: 'center'
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8,
    letterSpacing: 1
  },
  subtitle: {
    fontSize: 14,
    color: '#9A9A9A',
    letterSpacing: 0.5
  },
  form: {
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 12,
    color: '#9A9A9A',
    marginBottom: 8,
    letterSpacing: 0.5,
    fontWeight: '600'
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#F5F5F5',
    letterSpacing: 0.5
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  button: {
    backgroundColor: '#FF2A2A',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF2A2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8
  },
  buttonText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A'
  },
  footerText: {
    fontSize: 14,
    color: '#9A9A9A',
    marginRight: 8,
    letterSpacing: 0.5
  },
  linkText: {
    fontSize: 14,
    color: '#FF2A2A',
    fontWeight: '600',
    letterSpacing: 0.5
  }
  ,
  devButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  devButtonText: {
    color: '#F5F5F5',
    fontWeight: '600'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    width: '100%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8
  },
  modalText: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 12
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2A2A2A'
  },
  modalButtonText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600'
  },
  
});
