import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from "react-native";
import { useAuthStore } from "../../src/store/authStore";
import { useTrekStore } from "../../src/store/trekStore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);
  const activeTrek = useTrekStore((s) => s.activeTrek);
  const locationHistory = useTrekStore((s) => s.locationHistory);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Avatar & Name */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#444" />
          </View>
          <Text style={styles.name}>Trekker</Text>
          <Text style={styles.phone}>Shikhar Member</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Treks Done</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{locationHistory.length}</Text>
            <Text style={styles.statLabel}>GPS Pings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/settings/emergency-contacts")}>
            <Ionicons name="people-outline" size={22} color="#FFF" />
            <Text style={styles.menuText}>Emergency Contacts</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/settings/trek-pin")}>
            <Ionicons name="key-outline" size={22} color="#FFF" />
            <Text style={styles.menuText}>Trek PIN / Duress PIN</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={22} color="#FFF" />
            <Text style={styles.menuText}>Notification Preferences</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#FFF" />
            <Text style={styles.menuText}>Safety Settings</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text-outline" size={22} color="#FFF" />
            <Text style={styles.menuText}>Terms & Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Active Trek Banner */}
        {activeTrek && (
          <TouchableOpacity
            style={styles.activeTrekCard}
            onPress={() => router.push("/trek/active")}
          >
            <View style={styles.activeDot} />
            <Text style={styles.activeTrekText}>
              Active: {activeTrek.trailName}
            </Text>
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Shikhar v0.0.1 (Beta)</Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#333",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
  },
  phone: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
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
    fontSize: 22,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#666",
    fontSize: 11,
    marginTop: 4,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  menuText: {
    flex: 1,
    color: "#FFF",
    fontSize: 15,
    marginLeft: 12,
  },
  activeTrekCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A3A1A",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2A5A2A",
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ADE80",
    marginRight: 12,
  },
  activeTrekText: {
    color: "#4ADE80",
    fontSize: 15,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A1010",
    backgroundColor: "#1A0808",
    gap: 8,
    marginBottom: 16,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    color: "#333",
    fontSize: 12,
    textAlign: "center",
  },
});
