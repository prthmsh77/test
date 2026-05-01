import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTrekStore } from "../../src/store/trekStore";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#4ADE80",
  moderate: "#FACC15",
  hard: "#F97316",
  extreme: "#EF4444",
};

export default function CreateTrekScreen() {
  const router = useRouter();
  const { trailId } = useLocalSearchParams();
  const trails = useTrekStore((s) => s.trails);
  const activeTrek = useTrekStore((s) => s.activeTrek);
  const startTrek = useTrekStore((s) => s.startTrek);

  const trail = trails.find((t) => t.id === trailId);

  if (!trail) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Trail not found</Text>
      </SafeAreaView>
    );
  }

  const diffColor = DIFFICULTY_COLORS[trail.difficulty] || "#888";

  const handleStartTrek = () => {
    if (activeTrek) {
      Alert.alert("Trek in Progress", "You already have an active trek. End it before starting a new one.");
      return;
    }

    const trek = {
      id: "trek_" + Date.now(),
      trailId: trail.id,
      trailName: trail.name,
      state: "ACTIVE" as const,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(), // +24h
      emergencyContacts: [],
    };

    startTrek(trek);
    Alert.alert(
      "Trek Started! 🏔️",
      `You are now live-tracking on ${trail.name}.\n\nYour emergency contacts will be notified.\nSwitch to the Map tab to see your location.`,
      [{ text: "Go to Map", onPress: () => router.replace("/(tabs)/map") }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Trail Image Placeholder */}
        <View style={styles.heroImage}>
          <Ionicons name="image-outline" size={48} color="#333" />
          <Text style={styles.heroRegion}>{trail.region}</Text>
        </View>

        {/* Trail Info */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.trailName}>{trail.name}</Text>
            <View style={[styles.badge, { backgroundColor: diffColor + "20" }]}>
              <Text style={[styles.badgeText, { color: diffColor }]}>
                {trail.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.region}>📍 {trail.region}</Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="resize-outline" size={20} color="#4ADE80" />
              <Text style={styles.statValue}>{trail.distanceKm} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={20} color="#60A5FA" />
              <Text style={styles.statValue}>{trail.peakAltitudeM}m</Text>
              <Text style={styles.statLabel}>Peak Altitude</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="location-outline" size={20} color="#FACC15" />
              <Text style={styles.statValue}>
                {trail.coordinates.latitude.toFixed(2)}°N
              </Text>
              <Text style={styles.statLabel}>Latitude</Text>
            </View>
          </View>

          {/* Safety Info */}
          <View style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#4ADE80" />
              <Text style={styles.safetyTitle}>Safety Features Active</Text>
            </View>
            <Text style={styles.safetyItem}>✓ Live GPS tracking every 5 seconds</Text>
            <Text style={styles.safetyItem}>✓ Off-route detection (150m threshold)</Text>
            <Text style={styles.safetyItem}>✓ Altitude alerts at 2400m, 3500m, 4500m</Text>
            <Text style={styles.safetyItem}>✓ SOS escalation (L0→L5)</Text>
            <Text style={styles.safetyItem}>✓ Duress PIN for coercion scenarios</Text>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startButton, activeTrek && styles.startButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleStartTrek}
          >
            <Text style={styles.startButtonText}>
              {activeTrek ? "Trek Already Active" : "Start Trek 🚀"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: 10,
    left: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },
  heroRegion: {
    color: "#555",
    fontSize: 14,
    marginTop: 8,
  },
  content: {
    padding: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  trailName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  region: {
    color: "#888",
    fontSize: 14,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  statValue: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    color: "#666",
    fontSize: 11,
    marginTop: 4,
  },
  safetyCard: {
    backgroundColor: "#0A1A0A",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1A2A1A",
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  safetyTitle: {
    color: "#4ADE80",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  safetyItem: {
    color: "#888",
    fontSize: 13,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: "#FFF",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 40,
  },
  startButtonDisabled: {
    backgroundColor: "#333",
  },
  startButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
  },
});
