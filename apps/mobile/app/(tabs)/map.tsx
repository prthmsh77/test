import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert, Platform, Dimensions } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useTrekStore } from "../../src/store/trekStore";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const currentLocation = useTrekStore((s) => s.currentLocation);
  const locationHistory = useTrekStore((s) => s.locationHistory);
  const activeTrek = useTrekStore((s) => s.activeTrek);
  const updateLocation = useTrekStore((s) => s.updateLocation);
  const isTracking = useTrekStore((s) => s.isTracking);

  const [hasPermission, setHasPermission] = useState(false);
  const [region, setRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 15,
    longitudeDelta: 15,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required for tracking.");
        return;
      }
      setHasPermission(true);

      // Get initial location
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const ping = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude || 0,
        accuracy: loc.coords.accuracy || 0,
        timestamp: loc.timestamp,
      };
      updateLocation(ping);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  // Live tracking subscription
  useEffect(() => {
    if (!isTracking || !hasPermission) return;

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (loc) => {
          updateLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude || 0,
            accuracy: loc.coords.accuracy || 0,
            timestamp: loc.timestamp,
          });
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, [isTracking, hasPermission]);

  const centerOnUser = () => {
    if (currentLocation) {
      mapRef.current?.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  };

  const polylineCoords = locationHistory.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={darkMapStyle}
      >
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#4ADE80"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay}>
        <Text style={styles.headerTitle}>
          {activeTrek ? activeTrek.trailName : "Live Map"}
        </Text>
        {activeTrek && (
          <View style={styles.trackingBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.trackingText}>TRACKING</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Center button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {activeTrek ? (
          <>
            <View style={styles.panelRow}>
              <View>
                <Text style={styles.panelLabel}>ALTITUDE</Text>
                <Text style={styles.panelValue}>
                  {currentLocation?.altitude
                    ? `${Math.round(currentLocation.altitude)}m`
                    : "—"}
                </Text>
              </View>
              <View>
                <Text style={styles.panelLabel}>ACCURACY</Text>
                <Text style={styles.panelValue}>
                  {currentLocation?.accuracy
                    ? `±${Math.round(currentLocation.accuracy)}m`
                    : "—"}
                </Text>
              </View>
              <View>
                <Text style={styles.panelLabel}>PINGS</Text>
                <Text style={styles.panelValue}>{locationHistory.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.sosButton}
              onPress={() => router.push("/trek/sos")}
            >
              <Text style={styles.sosButtonText}>🚨 SOS</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.panelHint}>
              Start a trek from the Feed tab to begin live tracking
            </Text>
            {currentLocation && (
              <View style={styles.panelRow}>
                <View>
                  <Text style={styles.panelLabel}>LAT</Text>
                  <Text style={styles.panelValue}>
                    {currentLocation.latitude.toFixed(4)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.panelLabel}>LNG</Text>
                  <Text style={styles.panelValue}>
                    {currentLocation.longitude.toFixed(4)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.panelLabel}>ALT</Text>
                  <Text style={styles.panelValue}>
                    {currentLocation.altitude
                      ? `${Math.round(currentLocation.altitude)}m`
                      : "—"}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

// Dark map style for Google Maps
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  map: {
    width: width,
    height: height,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(74, 222, 128, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
    marginRight: 6,
  },
  trackingText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  centerButton: {
    position: "absolute",
    right: 20,
    bottom: 240,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(30, 30, 30, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 10, 10, 0.95)",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "#222",
  },
  panelRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  panelLabel: {
    color: "#666",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: "center",
  },
  panelValue: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  panelHint: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  sosButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  sosButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
