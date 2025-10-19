import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
// Lazy require to avoid crashes if dependency not installed on web
let Pdf: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Pdf = require('react-native-pdf').default;
} catch (e) {
  Pdf = null;
}

interface Props {
  fileUri?: string | null; // file:// URI to a local PDF
}

export default function PdfPanel({ fileUri }: Props) {
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('window').height;

  if (!Pdf) {
    return (
      <View style={styles.wrapper}> 
        <Text style={styles.info}>
          PDF viewer module not installed. Please install 'react-native-pdf'.
        </Text>
      </View>
    );
  }

  if (!fileUri) {
    return (
      <View style={styles.wrapper}> 
        <Text style={styles.info}>Preparing PDF...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Pdf
        source={{ uri: fileUri }}
        style={{ width, height }}
        trustAllCerts={true}
        onError={(err: any) => console.warn('PDF error', err)}
        onLoadComplete={(pages: number) => console.log(`PDF loaded with ${pages} pages`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    color: '#ccc',
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
});