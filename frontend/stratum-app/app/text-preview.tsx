import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform, TouchableOpacity, TextInput, Linking } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { fileService } from '../src/services/fileService';

export default function TextPreviewScreen() {
  const { nodeId, name } = useLocalSearchParams<{ nodeId?: string; name?: string }>();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('');
  const [filename, setFilename] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!nodeId) throw new Error('Missing file identifier');
        const res = await fileService.getText(nodeId as string);
        if (!active) return;

        // Normalize BOM + CRLF to ensure consistent Markdown rendering
        const normalize = (s: string) =>
          String(s || '')
            .replace(/^\uFEFF/, '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        setContent(normalize(res?.text || ''));
        setContentType((res?.content_type || '').toLowerCase());
        setFilename(res?.filename || (name as string) || 'Text File');
      } catch (err) {
        // Web fallback to blob->text if /text fails
        if (Platform.OS === 'web') {
          try {
            const txt = await fileService.downloadText(nodeId as string);
            const fname = typeof name === 'string' ? name : 'Text File';
            const normalize = (s: string) =>
              String(s || '')
                .replace(/^\uFEFF/, '')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');
            setContent(normalize(txt || ''));
            setContentType(fname.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain');
            setFilename(fname);
          } catch (e2) {
            console.error('Text preview fallback failed:', e2);
            Alert.alert('Error', 'Failed to load file', [{ text: 'OK', onPress: () => router.back() }]);
          }
        } else {
          console.error('Text preview failed:', err);
          Alert.alert('Error', 'Failed to load file', [{ text: 'OK', onPress: () => router.back() }]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [nodeId, name]);

  const lowerName = (filename || '').toLowerCase();
  const isMarkdown =
    contentType.includes('markdown') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.markdown');

  // Open links safely from Markdown
  const onLinkPress = (url: string) => {
    try {
      Linking.openURL(url);
      return false; // prevent default
    } catch {
      return false;
    }
  };

  const displayTitle = (filename || '').replace(/\.[^.]+$/, '');
  const handleDownload = async () => {
    try {
      await fileService.openDownload(nodeId as string); // match image-preview behavior and color
    } catch (err: any) {
      Alert.alert('Download failed', err?.message || 'Unable to download this file.');
    }
  };

  const handleSave = async () => {
    if (!nodeId) return;
    setSaving(true);
    try {
      // Save for both FILE (MinIO) and NOTE (DB) via unified backend /files/{id}/content
      const mimeType = isMarkdown ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
      if (Platform.OS !== 'web') {
        Alert.alert('Edit', 'Editing files is currently only supported on web.');
        setSaving(false);
        return;
      }
      const blob = new Blob([content], { type: mimeType });
      const safeName = filename || (isMarkdown ? 'file.md' : 'file.txt');
      const file = new File([blob], safeName, { type: mimeType });
      const form = new FormData();
      form.append('file', file);
      await fileService.replaceFile(nodeId as string, form);
      Alert.alert('Saved', 'File updated successfully.');
      setEditing(false);
    } catch (e: any) {
      console.error('Save failed', e);
      Alert.alert('Save failed', e?.response?.data?.detail || 'Could not save file.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: displayTitle || 'Text',
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#FF2A2A',
          headerTitleStyle: { color: '#F5F5F5', fontSize: 18, fontWeight: '600' },
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF2A2A" />
          <Text style={styles.loadingText}>Loading file…</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.contentWrapper}>
            {/* Title (top) */}
            <Text style={styles.pageTitle}>
              {displayTitle}
              {!!filename && filename.includes('.') && (
                <Text style={styles.fileExt}> .{filename.split('.').pop()}</Text>
              )}
            </Text>

            {/* Content (separate box) */}
            <View style={styles.card}>
              {editing ? (
                <TextInput
                  style={styles.editor}
                  multiline
                  value={content}
                  onChangeText={setContent}
                  editable={!saving}
                />
              ) : isMarkdown ? (
                <Markdown
                  style={markdownStyles as any}
                  onLinkPress={onLinkPress}
                >
                  {content}
                </Markdown>
              ) : (
                <Text style={styles.plainText}>{content || '— No content —'}</Text>
              )}
            </View>
          </ScrollView>

          {/* Actions — match image-preview neutral buttons per styleguide */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownload}
              disabled={!nodeId}
            >
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => (editing ? handleSave() : setEditing(true))}
              disabled={saving}
            >
              <Text style={styles.actionButtonText}>{editing ? (saving ? 'Saving…' : 'Save') : 'Edit'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.closeButton]} onPress={() => router.back()}>
              <Text style={[styles.actionButtonText, { color: '#9A9A9A' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  scroll: { flex: 1 },
  contentWrapper: { padding: 20, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#9A9A9A' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#F5F5F5', letterSpacing: 0.5, marginBottom: 8 },
  fileExt: { color: '#9A9A9A', fontSize: 14 },
  card: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  plainText: { color: '#F5F5F5', fontSize: 16, lineHeight: 24, letterSpacing: 0.2 },
  editor: {
    minHeight: 220,
    color: '#F5F5F5',
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: '#0E0E0E',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  actions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  actionButton: { flex: 1, backgroundColor: '#2A2A2A', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  actionButtonText: { color: '#F5F5F5', fontWeight: '600' },
  closeButton: { backgroundColor: '#1A1A1A' },
});

const markdownStyles = {
  body: { fontSize: 16, lineHeight: 24, color: '#F5F5F5' },
  heading1: { fontSize: 32, fontWeight: '700', color: '#F5F5F5', marginBottom: 8 },
  heading2: { fontSize: 24, fontWeight: '700', color: '#F5F5F5', marginBottom: 6 },
  heading3: { fontSize: 20, fontWeight: '700', color: '#F5F5F5', marginBottom: 4 },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { marginBottom: 4 },
  code_block: {
    backgroundColor: '#0E0E0E',
    borderRadius: 12,
    padding: 12,
    color: '#F5F5F5',
    // monospace fonts per styleguide feel
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  fence: {
    backgroundColor: '#0E0E0E',
    borderRadius: 12,
    padding: 12,
    color: '#F5F5F5',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  link: { color: '#FF2A2A' },
};