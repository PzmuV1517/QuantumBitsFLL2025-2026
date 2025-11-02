import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
// Use React Bits components directly (no wrappers)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ColorBends = require('../components/ColorBends.jsx').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GradualBlur = require('../components/GradualBlur.jsx').default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StarBorder = require('../components/StarBorder.jsx').default;

// Load component CSS only on web to avoid native errors
if (Platform.OS === 'web') {
  // @ts-ignore - CSS handled by web bundler
  require('../components/ColorBends.css');
  // @ts-ignore - CSS handled by web bundler
  require('../components/GradualBlur.css');
  // @ts-ignore - CSS handled by web bundler
  require('../components/StarBorder.css');
}

export default function LandingPage() {
  const router = useRouter();

  return (

<section style={{position: 'relative',overflow: 'hidden'}}>
    <div style={{ height: '100%',overflowY: 'auto'}}>

            <View style={styles.container}>
            <View style={[styles.hero, Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : null]}>
                {/* Animated background */}
                <View style={styles.bg}>
                <ColorBends
                    colors={["#ff0000", "#ff1717ff", "#9d0000ff"]}
                    rotation={19}
                    autoRotate={0}
                    speed={0.35}
                    scale={1}
                    frequency={1}
                    warpStrength={1}
                    mouseInfluence={1}
                    parallax={0.5}
                    noise={0.1}
                    transparent
                />
                </View>

                {/* Content overlay */}
                <View style={styles.center}>
                <Text style={styles.logo}>STRATUM</Text>
                <Text style={styles.title}>Organize research. Share results.</Text>
                <Text style={styles.subtitle}>Projects, artefacts, and notes in one streamlined workspace.</Text>
                <View style={{ marginTop: 24 }}>
                    <StarBorder
                    as="button"
                    color="white"
                    speed="5s"
                    className="thin-border"
                    thickness={1}
                    onClick={() => router.push('/(auth)/login')}
                    onPress={() => router.push('/(auth)/login')}
                    >
                    Begin
                    </StarBorder>
                </View>
                </View>

            </View>
            {/* Informational section */}
            <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>Why STRATUM?</Text>
                <View style={styles.cards}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Artefacts, not files</Text>
                    <Text style={styles.cardBody}>Group results, notes, and assets with a living manifest that stays in sync.</Text>
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Collaborate safely</Text>
                    <Text style={styles.cardBody}>Role-based access, history, and site-styled confirmations prevent mistakes.</Text>
                </View>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Edit anything</Text>
                    <Text style={styles.cardBody}>CSV, Excel, Markdown, and JSON with a unified preview and quick saves.</Text>
                </View>
                </View>
            </View>
            </View>


    </div>

    <GradualBlur
    target="screen"
    position="bottom"
    height="6rem"
    strength={5}
    divCount={10}
    curve="bezier"
    exponential={true}
    opacity={1}
    responsive={true}
  />
<GradualBlur
    target="screen"
    position="top"
    height="3rem"
    strength={2}
    divCount={5}
    curve="bezier"
    exponential={true}
    opacity={1}
  />

</section>


  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    width: '100%',
    maxWidth: 960,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    color: '#ffffff',
    opacity: 0.9,
    fontSize: 14,
    letterSpacing: 6,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  subtitle: {
    color: '#e5e5e5',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 720,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: '#FF2A2A',
    borderColor: '#FF2A2A',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: '#2A2A2A',
  },
  buttonText: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonTextSecondary: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoSection: {
    backgroundColor: '#000',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  sectionHeading: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 24,
  },
  cards: {
    width: '100%',
    maxWidth: 1040,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  cardBody: {
    color: '#CFCFCF',
    fontSize: 14,
    lineHeight: 20,
  },
});
