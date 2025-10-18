import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fileService } from '../src/services/fileService';

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
        const res = await fileService.downloadFile(nodeId as string);
        if (Platform.OS === 'web') {
          const url = window.URL.createObjectURL(res.data as Blob);
          if (!revoked) setBlobUrl(url);
        } else {
          const buf = new Uint8Array(res.data as ArrayBuffer);
          let bin = '';
          for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          // @ts-ignore
          const b64 = (global?.btoa ?? btoa)(bin);
          const ctype = (res.headers?.['content-type'] || res.headers?.['Content-Type'] || 'image/*') as string;
          if (!revoked) setBlobUrl(`data:${ctype};base64,${b64}`);
        }
      } catch (e) {
        console.error('Image load failed', e);
        setError('Failed to load image');
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      revoked = true;
      if (Platform.OS === 'web' && blobUrl) {
        try { window.URL.revokeObjectURL(blobUrl); } catch {}
      }
    };
  }, [nodeId]);

  const handleDownload = async () => {
    try {
      await fileService.openDownload(nodeId as string); // preserves filename via Content-Disposition
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Unable to download this file.');
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
        {!loading && !error && blobUrl && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: blobUrl }} style={styles.image} resizeMode="contain" />
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
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
  imageWrapper: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', gap: 12, padding: 16 },
  actionButton: { flex: 1, backgroundColor: '#2A2A2A', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  closeButton: { backgroundColor: '#1A1A1A' },
  actionButtonText: { color: '#F5F5F5', fontWeight: '600' },
});