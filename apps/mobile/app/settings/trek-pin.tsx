import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TrekPinScreen() {
  const router = useRouter();
  const [trekPin, setTrekPin] = useState("");
  const [duressPin, setDuressPin] = useState("");
  const [confirmTrekPin, setConfirmTrekPin] = useState("");
  const [confirmDuressPin, setConfirmDuressPin] = useState("");
  const [step, setStep] = useState<"trek" | "duress" | "done">("trek");

  const handleSetTrekPin = () => {
    if (trekPin.length < 4) {
      Alert.alert("Error", "PIN must be at least 4 digits.");
      return;
    }
    if (trekPin !== confirmTrekPin) {
      Alert.alert("Error", "PINs do not match.");
      return;
    }
    setStep("duress");
  };

  const handleSetDuressPin = () => {
    if (duressPin.length < 4) {
      Alert.alert("Error", "Duress PIN must be at least 4 digits.");
      return;
    }
    if (duressPin === trekPin) {
      Alert.alert("Error", "Duress PIN must be different from your Trek PIN.");
      return;
    }
    if (duressPin !== confirmDuressPin) {
      Alert.alert("Error", "PINs do not match.");
      return;
    }
    // In production: POST /api/v1/users/me/pins { trek_pin, duress_pin }
    Alert.alert(
      "PINs Set ✓",
      "Your Trek PIN and Duress PIN have been saved.\n\nRemember: if you're forced to check out under coercion, enter your Duress PIN. It will appear to succeed but silently trigger a CRITICAL SOS.",
      [{ text: "Got It", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trek PIN Setup</Text>
          <View style={{ width: 44 }} />
        </View>

        {step === "trek" && (
          <View style={styles.content}>
            <View style={styles.iconWrapper}>
              <Ionicons name="key" size={48} color="#60A5FA" />
            </View>
            <Text style={styles.title}>Set Trek PIN</Text>
            <Text style={styles.subtitle}>
              This 4-digit PIN is required to check out of a trek. It proves you're safely back.
            </Text>

            <Text style={styles.label}>Trek PIN</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor="#333"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={trekPin}
              onChangeText={setTrekPin}
              autoFocus
            />

            <Text style={styles.label}>Confirm Trek PIN</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor="#333"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={confirmTrekPin}
              onChangeText={setConfirmTrekPin}
            />

            <TouchableOpacity style={styles.nextButton} onPress={handleSetTrekPin}>
              <Text style={styles.nextButtonText}>Next → Duress PIN</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "duress" && (
          <View style={styles.content}>
            <View style={[styles.iconWrapper, { backgroundColor: "#1A0A0A" }]}>
              <Ionicons name="shield" size={48} color="#EF4444" />
            </View>
            <Text style={[styles.title, { color: "#EF4444" }]}>Set Duress PIN</Text>
            <Text style={styles.subtitle}>
              This is your silent SOS PIN. If someone forces you to check out of a trek, enter this PIN instead.
              {"\n\n"}
              It will appear to work normally, but it will silently trigger a CRITICAL SOS and alert all your emergency contacts.
              {"\n\n"}
              Designed for women's safety (PRD §7.6).
            </Text>

            <Text style={styles.label}>Duress PIN</Text>
            <TextInput
              style={[styles.pinInput, { borderColor: "#2A1010" }]}
              placeholder="••••"
              placeholderTextColor="#333"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={duressPin}
              onChangeText={setDuressPin}
              autoFocus
            />

            <Text style={styles.label}>Confirm Duress PIN</Text>
            <TextInput
              style={[styles.pinInput, { borderColor: "#2A1010" }]}
              placeholder="••••"
              placeholderTextColor="#333"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              value={confirmDuressPin}
              onChangeText={setConfirmDuressPin}
            />

            <TouchableOpacity style={[styles.nextButton, { backgroundColor: "#EF4444" }]} onPress={handleSetDuressPin}>
              <Text style={[styles.nextButtonText, { color: "#FFF" }]}>Save Both PINs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => setStep("trek")}>
              <Text style={styles.backLinkText}>← Back to Trek PIN</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#FFF" },
  content: { padding: 24 },
  iconWrapper: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#0A1530",
    justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#FFF", textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  label: { color: "#888", fontSize: 12, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  pinInput: {
    backgroundColor: "#111", borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
    color: "#FFF", fontSize: 28, fontWeight: "bold", letterSpacing: 12, textAlign: "center",
    borderWidth: 1, borderColor: "#222",
  },
  nextButton: {
    backgroundColor: "#FFF", paddingVertical: 16, borderRadius: 16,
    alignItems: "center", marginTop: 32,
  },
  nextButtonText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  backLink: { alignItems: "center", marginTop: 20 },
  backLinkText: { color: "#888", fontSize: 14 },
});
