import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

interface Props {
  src?: string | null;      // web: object URL or data URI for PDF
  fileUri?: string | null;  // native: file:// URI (ignored on web)
}

export default function PdfPanel({ src }: Props) {
  return (
    <View style={styles.wrapper}>
      {Platform.OS === 'web' ? (
        src ? (
          // Inline web PDF preview
          <iframe src={src} style={styles.iframe as any} title="PDF preview" />
        ) : (
          <Text style={styles.info}>No PDF to display</Text>
        )
      ) : (
        <Text style={styles.info}>PDF preview is not supported on this platform yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Matches other panels: bordered card, dark bg
  wrapper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0E0E0E', overflow: 'hidden' },
  iframe: { width: '100%', height: '100%', border: 'none' },
  info: { color: '#9A9A9A', padding: 12 },
});