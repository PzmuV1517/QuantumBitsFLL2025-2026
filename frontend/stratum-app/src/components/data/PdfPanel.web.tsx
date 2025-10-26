import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PdfPanel({ src }: { src: string | null }) {
  return (
    <View style={styles.wrapper}>
      {src ? (
        // Chromium-based inline PDF viewer via object URL
        <iframe src={src} title="PDF Preview" style={styles.iframe as any} />
      ) : (
        <Text style={styles.info}>No PDF to display</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#0E0E0E', overflow: 'hidden' },
  iframe: { width: '100%', height: '100%', border: 'none' },
  info: { color: '#9A9A9A', padding: 12, textAlign: 'center' },
});