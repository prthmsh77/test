import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTrekStore } from "../../src/store/trekStore";

export default function ActiveTrekScreen() {
  const router = useRouter();
  const activeTrek = useTrekStore((s) => s.activeTrek);
  const currentLocation = useTrekStore((s) => s.currentLocation);
  const locationHistory = useTrekStore((s) => s.locationHistory);
  const endTrek = useTrekStore((s) => s.endTrek);

  if (!activeTrek) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noTrek}>
          <Ionicons name="walk-outline" size={64} color="#333" />
          <Text style={styles.noTrekText}>No active trek</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const elapsed = Date.now() - new Date(activeTrek.startDate).getTime();
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);

  const handleEndTrek = () => {
    Alert.alert(
      "End Trek",
      "Are you sure you want to end this trek? In production, you would need to enter your 2FA PIN.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Trek",
          style: "destructive",
          onPress: () => {
            endTrek();
            Alert.alert("Trek Ended ✓", "Great job! Your trek data has been saved.", [
              { text: "OK", onPress: () => router.replace("/(tabs)") },
            ]);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Trek Header */}
        <View style={styles.header}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.trekName}>{activeTrek.trailName}</Text>
          <Text style={styles.trekTime}>
            {hours}h {minutes}m elapsed
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="navigate-outline" size={24} color="#60A5FA" />
            <Text style={styles.statValue}>{locationHistory.length}</Text>
            <Text style={styles.statLabel}>GPS Pings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={24} color="#4ADE80" />
            <Text style={styles.statValue}>
              {currentLocation?.altitude
                ? `${Math.round(currentLocation.altitude)}m`
                : "—"}
            </Text>
            <Text style={styles.statLabel}>Altitude</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="radio-outline" size={24} color="#FACC15" />
            <Text style={styles.statValue}>
              {currentLocation?.accuracy
                ? `±${Math.round(currentLocation.accuracy)}m`
                : "—"}
            </Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location-outline" size={24} color="#A78BFA" />
            <Text style={styles.statValue}>
              {currentLocation
                ? `${currentLocation.latitude.toFixed(3)}°`
                : "—"}
            </Text>
            <Text style={styles.statLabel}>Latitude</Text>
          </View>
        </View>

        {/* Safety Status */}
        <View style={styles.safetySection}>
          <Text style={styles.sectionTitle}>Safety Status</Text>
          <View style={styles.safetyItem}>
            <View style={[styles.statusDot, { backgroundColor: "#4ADE80" }]} />
            <Text style={styles.safetyText}>GPS Tracking Active</Text>
          </View>
          <View style={styles.safetyItem}>
            <View style={[styles.statusDot, { backgroundColor: "#4ADE80" }]} />
            <Text style={styles.safetyText}>Escalation Workflow Running</Text>
          </View>
          <View style={styles.safetyItem}>
            <View style={[styles.statusDot, { backgroundColor: "#FACC15" }]} />
            <Text style={styles.safetyText}>Emergency Contacts: Not configured</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => router.push("/(tabs)/map")}
        >
          <Ionicons name="map-outline" size={20} color="#000" />
          <Text style={styles.mapButtonText}>Open Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => router.push("/trek/sos")}
        >
          <Text style={styles.sosButtonText}>🚨 Emergency SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndTrek}
        >
          <Text style={styles.endButtonText}>End Trek</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
    marginRight: 8,
  },
  liveText: {
    color: "#4ADE80",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  trekName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
  },
  trekTime: {
    color: "#888",
    fontSize: 16,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  statValue: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  safetySection: {
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  safetyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  safetyText: {
    color: "#888",
    fontSize: 14,
  },
  mapButton: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  mapButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  sosButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  sosButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  endButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  endButtonText: {
    color: "#888",
    fontSize: 16,
    fontWeight: "600",
  },
  noTrek: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noTrekText: {
    color: "#555",
    fontSize: 18,
    marginTop: 16,
  },
  goBackText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
  },
});
