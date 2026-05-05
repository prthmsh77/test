import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "../src/services/api";

const MSG91_WIDGET_ID = "366561676f49303130383533";
const MSG91_TOKEN_AUTH = "394914TCuS6I7H569f45349P1";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("https://api.msg91.com/api/v5/widget/sendOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetId: MSG91_WIDGET_ID,
          tokenAuth: MSG91_TOKEN_AUTH,
          identifier: "91" + phoneNumber
        })
      });

      const responseText = await response.text();
      console.log("=== MSG91 SEND OTP RESPONSE ===");
      console.log(responseText);
      console.log("===============================");
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Non-JSON response from MSG91: ${responseText}`);
      }
      
      if (data.type === "success") {
        // MSG91 returns the reqId inside the "message" field on success
        // Also notify the backend so it records the OTP request (dev: logs to console)
        api.requestOtp(phoneNumber).catch(() => {/* non-fatal */});
        router.push({ pathname: "/otp", params: { phone: phoneNumber, reqId: data.message } });
      } else {
        console.log("MSG91 Error Response:", data);
        Alert.alert(
          "MSG91 Blocked",
          `${data.message}\n\nContinuing in Dev Mode anyway.`
        );
        api.requestOtp(phoneNumber).catch(() => {/* non-fatal */});
        router.push({ pathname: "/otp", params: { phone: phoneNumber, reqId: data.reqId || "" } });
      }
    } catch (error) {
      console.log("MSG91 Error:", error);
      Alert.alert("Dev Mode", "Network error, bypassing SMS for development.");
      router.push({ pathname: "/otp", params: { phone: phoneNumber } });
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
          <Text style={styles.title}>Welcome to Shikhar</Text>
          <Text style={styles.subtitle}>Enter your phone number to receive an OTP and start your trekking journey safely.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.prefix}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="00000 00000"
              placeholderTextColor="#555"
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, phoneNumber.length < 10 && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={handleSendOtp}
            disabled={phoneNumber.length < 10 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 16,
    height: 60,
  },
  prefix: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
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
