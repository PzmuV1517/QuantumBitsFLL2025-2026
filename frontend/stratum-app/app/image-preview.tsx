import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fileService } from '../src/services/fileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhotoPanel from '../src/components/data/PhotoPanel';

export default function ImagePreviewScreen() {
  const { nodeId, name } = useLocalSearchParams<{ nodeId: string; name: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    (async () => {
      try {
        if (Platform.OS === 'web') {
          const token = await AsyncStorage.getItem('authToken');
          try {
            const result: any = await fileService.downloadFileStream(nodeId, token, undefined);
            const url = window.URL.createObjectURL(result.blob);
            if (!revoked) setBlobUrl(url);
          } catch {
            const res = await fileService.downloadFile(nodeId);
            const url = window.URL.createObjectURL(res.data);
            if (!revoked) setBlobUrl(url);
          }
        } else {
          const res = await fileService.downloadFile(nodeId);
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string' && !revoked) setBlobUrl(reader.result);
          };
            reader.readAsDataURL(res.data);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load image');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      revoked = true;
      if (blobUrl && Platform.OS === 'web') {
        try { window.URL.revokeObjectURL(blobUrl); } catch {}
      }
    };
  }, [nodeId]);

  const handleDownload = async () => {
    if (!blobUrl) return;
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = (name as string) || 'image';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      Alert.alert('Download', 'Mobile download not implemented yet.');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: (name as string) || 'Image',
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#FF2A2A',
          headerTitleStyle: { color: '#F5F5F5' },
        }}
      />
      <View style={styles.content}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color="#FF2A2A" />
            <Text style={styles.loadingText}>Loading image…</Text>
          </View>
        )}
        {!loading && error && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!loading && !error && blobUrl && <PhotoPanel uri={blobUrl} />}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleDownload} disabled={!blobUrl}>
          <Text style={styles.actionButtonText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.closeButton]} onPress={() => router.back()}>
          <Text style={[styles.actionButtonText, { color: '#9A9A9A' }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  content: { flex: 1, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#9A9A9A' },
  errorText: { color: '#FF4444', fontSize: 16 },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  actionButton: { flex: 1, backgroundColor: '#2A2A2A', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  closeButton: { backgroundColor: '#1A1A1A' },
  actionButtonText: { color: '#F5F5F5', fontWeight: '600' },
});