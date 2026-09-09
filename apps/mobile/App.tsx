import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function App() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <StatusBar style="dark" />

      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.burstMark}>
          <View style={[styles.burstPoint, styles.p1]} />
          <View style={[styles.burstPoint, styles.p2]} />
          <View style={[styles.burstPoint, styles.p3]} />
          <View style={[styles.burstPoint, styles.p4]} />
        </View>
        <Text style={styles.wordmark}>CREATORS CIRCLE.</Text>
      </View>

      {/* Headline */}
      <Text style={styles.headline}>
        Where Pakistani{' '}
        <Text style={styles.gradient}>creators</Text> and{' '}
        <Text style={styles.gradient}>brands</Text> meet.
      </Text>

      <Text style={styles.sub}>
        The influencer marketing platform for Pakistan. Discover vetted Instagram,
        YouTube, TikTok, and Facebook creators. Pay in PKR. Escrow on every deal.
      </Text>

      <View style={styles.statusBadge}>
        <View style={styles.pulseDot} />
        <Text style={styles.statusText}>
          Phase 1A complete — repo scaffold ready
        </Text>
      </View>

      {/* Build chunks */}
      <View style={styles.chunks}>
        {[
          { id: '1A', label: 'Scaffold', status: 'done' },
          { id: '1B', label: 'Design system', status: 'next' },
          { id: '1C', label: 'Landing page', status: 'queued' },
          { id: '1D', label: 'Auth + DB', status: 'queued' },
          { id: '1E', label: 'Profiles', status: 'queued' },
        ].map((chunk) => (
          <View
            key={chunk.id}
            style={[
              styles.chunk,
              chunk.status === 'done' && styles.chunkDone,
              chunk.status === 'next' && styles.chunkNext,
              chunk.status === 'queued' && styles.chunkQueued,
            ]}
          >
            <Text
              style={[
                styles.chunkId,
                chunk.status === 'queued' && styles.chunkIdQueued,
              ]}
            >
              {chunk.id}
            </Text>
            <Text
              style={[
                styles.chunkLabel,
                chunk.status === 'queued' && styles.chunkLabelQueued,
              ]}
            >
              {chunk.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>Mobile preview — read PLAN.md for the full build</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 48,
  },
  burstMark: {
    width: 44,
    height: 44,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstPoint: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  p1: { top: 0, left: 15, backgroundColor: '#FF006E', transform: [{ rotate: '45deg' }] },
  p2: { top: 15, right: 0, backgroundColor: '#8338EC', transform: [{ rotate: '45deg' }] },
  p3: { bottom: 0, left: 15, backgroundColor: '#00D9FF', transform: [{ rotate: '45deg' }] },
  p4: { top: 15, left: 0, backgroundColor: '#FFD60A', transform: [{ rotate: '45deg' }] },
  wordmark: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#0A0A0F',
  },
  headline: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 46,
    color: '#0A0A0F',
    textAlign: 'center',
    marginBottom: 20,
  },
  gradient: {
    color: '#8338EC',
    fontWeight: '800',
  },
  sub: {
    fontSize: 17,
    lineHeight: 24,
    color: '#4A4A55',
    textAlign: 'center',
    marginBottom: 32,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5EA',
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 40,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#25D366',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0A0A0F',
  },
  chunks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    maxWidth: 360,
  },
  chunk: {
    width: 96,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chunkDone: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5EA',
  },
  chunkNext: {
    backgroundColor: '#FFF0F7',
    borderColor: '#FF006E',
    borderWidth: 1.5,
  },
  chunkQueued: {
    backgroundColor: 'transparent',
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  chunkId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A0A0F',
    marginBottom: 2,
  },
  chunkIdQueued: {
    color: '#4A4A55',
  },
  chunkLabel: {
    fontSize: 11,
    color: '#4A4A55',
  },
  chunkLabelQueued: {
    color: '#4A4A55',
  },
  footer: {
    marginTop: 48,
    fontSize: 12,
    color: '#4A4A55',
    textAlign: 'center',
  },
});
