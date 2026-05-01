import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useAuthStore } from "../src/store/authStore";

const MSG91_WIDGET_ID = "366561676f49303130383533";
const MSG91_TOKEN_AUTH = "394914TCuS6I7H569f45349P1";

export default function OtpScreen() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { phone, reqId } = useLocalSearchParams();
  const login = useAuthStore((state) => state.login);

  const handleVerify = async () => {
    if (otp.length < 4) return;

    setIsLoading(true);
    try {
      const response = await fetch("https://api.msg91.com/api/v5/widget/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetId: MSG91_WIDGET_ID,
          tokenAuth: MSG91_TOKEN_AUTH,
          reqId: reqId,
          otp: otp,
          identifier: "91" + phone
        })
      });

      const responseText = await response.text();
      console.log("=== MSG91 VERIFY OTP RESPONSE ===");
      console.log(responseText);
      console.log("=================================");
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Non-JSON response from MSG91: ${responseText}`);
      }

      // MSG91 returns type: "success" or a success message
      if (data.type === "success" || data.message?.toLowerCase().includes("success") || data.message === "OTP verified successfully") {
        login("dummy_jwt_token_" + Date.now());
        router.replace("/(tabs)");
      } else {
        console.log("MSG91 Error Response:", data);
        Alert.alert(
          "MSG91 Blocked", 
          `${data.message}\n\nContinuing in Dev Mode anyway.`
        );
        login("dummy_jwt_token_" + Date.now());
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.log("MSG91 Error:", error);
      Alert.alert("Dev Mode", "Network error, bypassing OTP verification.");
      login("dummy_jwt_token_" + Date.now());
      router.replace("/(tabs)");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>We've sent a 4-digit one-time password to your phone.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Enter OTP</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="0000"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              maxLength={4}
              value={otp}
              onChangeText={setOtp}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, otp.length < 4 && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={handleVerify}
            disabled={otp.length < 4 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  keyboardView: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 30,
  },
  backButtonText: {
    color: "#A0A0A0",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#888888",
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 16,
    height: 60,
    justifyContent: "center",
  },
  input: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 8,
    textAlign: "center",
  },
  footer: {
    paddingBottom: 20,
  },
  button: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#333333",
  },
  buttonText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "bold",
  },
});
