import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#4A4A4A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
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
});
