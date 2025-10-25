import React, { useState } from 'react';
import { FaEyeSlash } from "react-icons/fa";
import { FaEye } from "react-icons/fa";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

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
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text style={styles.linkText}>Register</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FF2A2A',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  secondaryButtonText: {
    color: '#FF2A2A',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
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
});
