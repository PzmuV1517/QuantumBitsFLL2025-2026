import React, { useEffect, useState } from 'react';
import { Platform, View, Text, Image, TouchableOpacity } from 'react-native';

interface Props {
  value: string;
  size?: number;
  label?: string; // text below (e.g., name + number)
  onReadyDataUrl?: (url: string) => void; // for saving/printing
}

export default function QRCodeView({ value, size = 220, label, onReadyDataUrl }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Platform.OS === 'web') {
        try {
          const QR = await import('qrcode');
          const url = await QR.toDataURL(value, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: size,
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          if (mounted) {
            setDataUrl(url);
            onReadyDataUrl?.(url);
          }
        } catch (e) {
          console.warn('Failed to generate QR', e);
        }
      }
    })();
    return () => { mounted = false; };
  }, [value, size]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#9A9A9A', textAlign: 'center', padding: 12 }}>QR available on web. Link:</Text>
          <Text selectable style={{ color: '#F5F5F5', fontWeight: '600', textAlign: 'center' }}>{value}</Text>
        </View>
        {label ? <Text style={{ color: '#F5F5F5', marginTop: 8, fontWeight: '700' }}>{label}</Text> : null}
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      {dataUrl ? (
        <Image source={{ uri: dataUrl }} style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#FFF' }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#111' }}>Generating QR…</Text>
        </View>
      )}
      {label ? <Text style={{ color: '#F5F5F5', marginTop: 8, fontWeight: '700' }}>{label}</Text> : null}
    </View>
  );
}
