import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTrekStore, SOSType } from "../../src/store/trekStore";
import { useAuthStore } from "../../src/store/authStore";
import { api } from "../../src/services/api";

export default function SOSScreen() {
  const router = useRouter();
  const activeTrek = useTrekStore((s) => s.activeTrek);
  const token = useAuthStore((s) => s.token);

  const handleSOS = (type: SOSType) => {
    const messages: Record<SOSType, string> = {
      HELP: "Your emergency contacts will be notified that you need help.",
      MEDICAL: "A medical dispatch team will be alerted. Sentinel rescue will be mobilized.",
      CRITICAL: "CRITICAL SOS will immediately escalate to L4.\nERSS-112 dispatch will be triggered.\nAll emergency contacts will be called.",
    };

    Alert.alert(
      `${type} SOS`,
      messages[type],
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "CONFIRM SOS",
          style: "destructive",
          onPress: async () => {
            if (!activeTrek) return;
            if (token) api.setToken(token);
            const { error } = await api.triggerSOS(activeTrek.id, type);
            if (error) {
              console.error("SOS API error:", error);
            }
            Alert.alert(
              "SOS Sent ✓",
              "Help is on the way. Stay calm and stay where you are.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  };

  if (!activeTrek) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noTrek}>
          <Ionicons name="alert-circle-outline" size={64} color="#333" />
          <Text style={styles.noTrekText}>No active trek</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="warning" size={48} color="#EF4444" />
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>
            Select the type of emergency. This will trigger the escalation system.
          </Text>
        </View>

        {/* HELP */}
        <TouchableOpacity
          style={[styles.sosCard, styles.helpCard]}
          onPress={() => handleSOS("HELP")}
          activeOpacity={0.7}
        >
          <View style={styles.sosCardHeader}>
            <Ionicons name="hand-left" size={28} color="#FACC15" />
            <Text style={[styles.sosCardTitle, { color: "#FACC15" }]}>HELP</Text>
          </View>
          <Text style={styles.sosCardDesc}>
            I need assistance but I'm not in immediate danger.{"\n"}
            Emergency contacts will be notified via SMS.
          </Text>
        </TouchableOpacity>

        {/* MEDICAL */}
        <TouchableOpacity
          style={[styles.sosCard, styles.medicalCard]}
          onPress={() => handleSOS("MEDICAL")}
          activeOpacity={0.7}
        >
          <View style={styles.sosCardHeader}>
            <Ionicons name="medkit" size={28} color="#F97316" />
            <Text style={[styles.sosCardTitle, { color: "#F97316" }]}>MEDICAL</Text>
          </View>
          <Text style={styles.sosCardDesc}>
            I need medical attention.{"\n"}
            Sentinel dispatch team will be mobilized to your location.
          </Text>
        </TouchableOpacity>

        {/* CRITICAL */}
        <TouchableOpacity
          style={[styles.sosCard, styles.criticalCard]}
          onPress={() => handleSOS("CRITICAL")}
          activeOpacity={0.7}
        >
          <View style={styles.sosCardHeader}>
            <Ionicons name="skull" size={28} color="#EF4444" />
            <Text style={[styles.sosCardTitle, { color: "#EF4444" }]}>CRITICAL</Text>
          </View>
          <Text style={styles.sosCardDesc}>
            Life-threatening emergency.{"\n"}
            Immediately escalates to L4. ERSS-112 will be dispatched.{"\n"}
            Voice calls will be made to all emergency contacts.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#EF4444",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  sosCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  helpCard: {
    backgroundColor: "#1A1800",
    borderColor: "#2A2800",
  },
  medicalCard: {
    backgroundColor: "#1A1000",
    borderColor: "#2A1800",
  },
  criticalCard: {
    backgroundColor: "#1A0808",
    borderColor: "#2A0808",
  },
  sosCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sosCardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 12,
    letterSpacing: 1,
  },
  sosCardDesc: {
    color: "#888",
    fontSize: 14,
    lineHeight: 22,
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
