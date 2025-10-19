import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function PhotoPanel({ uri }: { uri: string }) {
  return (
    <View style={styles.imageWrapper}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrapper: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
});
