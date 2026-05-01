import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=2072&auto=format&fit=crop" }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)", "rgba(0,0,0,1)"]}
          style={styles.gradient}
        >
          <View style={styles.contentContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.logoText}>SHIKHAR</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>BETA</Text>
              </View>
            </View>
            
            <Text style={styles.subtitle}>
              India's Trekking Social + Safety Platform
            </Text>
            
            <Text style={styles.description}>
              Live-track your treks, share updates, and stay protected with our multi-level emergency escalation system.
            </Text>

            <TouchableOpacity 
              style={styles.button}
              activeOpacity={0.8}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>

            <Text style={styles.loginHint}>
              Already have an account? <Text style={styles.loginText}>Log in</Text>
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  contentContainer: {
    alignItems: "flex-start",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  badge: {
    backgroundColor: "#FF4D4D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 12,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    color: "#A0A0A0",
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  loginHint: {
    color: "#888888",
    fontSize: 14,
    alignSelf: "center",
  },
  loginText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
