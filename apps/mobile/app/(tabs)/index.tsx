import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, FlatList, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTrekStore, Trail } from "../../src/store/trekStore";

const { width } = Dimensions.get("window");

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#4ADE80",
  moderate: "#FACC15",
  hard: "#F97316",
  extreme: "#EF4444",
};

export default function FeedScreen() {
  const router = useRouter();
  const trails = useTrekStore((s) => s.trails);
  const activeTrek = useTrekStore((s) => s.activeTrek);

  const renderTrailCard = ({ item }: { item: Trail }) => (
    <TouchableOpacity
      style={styles.trailCard}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/trek/create", params: { trailId: item.id } })}
    >
      <View style={styles.trailImagePlaceholder}>
        <Ionicons name="trail-sign-outline" size={32} color="#333" />
      </View>
      <View style={styles.trailInfo}>
        <View style={styles.trailHeader}>
          <Text style={styles.trailName}>{item.name}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[item.difficulty] + "20" }]}>
            <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>
              {item.difficulty.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.trailRegion}>📍 {item.region}</Text>
        <View style={styles.trailStats}>
          <Text style={styles.statText}>🏔 {item.peakAltitudeM}m</Text>
          <Text style={styles.statText}>📏 {item.distanceKm} km</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Namaste 🙏</Text>
          <Text style={styles.headerTitle}>Explore Trails</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {activeTrek && (
        <TouchableOpacity
          style={styles.activeTrekBanner}
          onPress={() => router.push("/trek/active")}
          activeOpacity={0.8}
        >
          <View style={styles.activeDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTrekLabel}>ACTIVE TREK</Text>
            <Text style={styles.activeTrekName}>{activeTrek.trailName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      )}

      <FlatList
        data={trails}
        renderItem={renderTrailCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Popular Trails</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  activeTrekBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A3A1A",
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
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
  activeTrekLabel: {
    fontSize: 10,
    color: "#4ADE80",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  activeTrekName: {
    fontSize: 16,
    color: "#FFF",
    fontWeight: "600",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#AAA",
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  trailCard: {
    backgroundColor: "#111",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  trailImagePlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },
  trailInfo: {
    padding: 16,
  },
  trailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trailName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  trailRegion: {
    fontSize: 13,
    color: "#888",
    marginBottom: 10,
  },
  trailStats: {
    flexDirection: "row",
    gap: 16,
  },
  statText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "500",
  },
});
