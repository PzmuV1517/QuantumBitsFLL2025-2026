import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { fileService } from '../src/services/fileService';

export default function TextPreviewScreen() {
  const { nodeId, name } = useLocalSearchParams<{ nodeId?: string; name?: string }>();
  const router = useRouter();

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (!nodeId) throw new Error('File node ID is missing.');
        // Try to fetch as text to avoid Blob->JSON coercion issues
        try {
          const text = await fileService.downloadText(nodeId as string);
          setContent(text);
        } catch {
          // Fallback: fetch blob then convert to text
          const response = await fileService.downloadFile(nodeId as string);
          if (!response || response.status !== 200) throw new Error(`Failed to load file (${response?.status})`);
          const blob = response.data as Blob;
          const text = await blob.text();
          setContent(text);
        }
      } catch (err: any) {
        console.error(err);
        Alert.alert('Error', err?.message || 'Failed to load file', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nodeId]);

  const fileName = typeof name === 'string' ? name : '';
  const isMarkdown = fileName.toLowerCase().endsWith('.md');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: fileName || 'Text',
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#FF2A2A',
          headerTitleStyle: { color: '#F5F5F5', fontSize: 18, fontWeight: '600' },
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF2A2A" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          {!!fileName && <Text style={styles.title}>{fileName}</Text>}
          {isMarkdown ? (
            <Markdown style={markdownStyles as any}>{content}</Markdown>
          ) : (
            <Text style={styles.plainText}>{content}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#9A9A9A' },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  plainText: {
    color: '#F5F5F5',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});

const markdownStyles = {
  body: { fontSize: 16, lineHeight: 24, color: '#F5F5F5' },
  heading1: { fontSize: 28, fontWeight: '700', color: '#F5F5F5' },
  heading2: { fontSize: 24, fontWeight: '700', color: '#F5F5F5' },
  link: { color: '#FF2A2A' },
};