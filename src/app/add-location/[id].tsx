import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { API_BASE_URL } from "../../config/api";
import { getAuthSession } from "../../utils/storage";
import { Colors, Spacing, Radii, Shadows } from "../../constants/theme";
import { fontScale } from "../../utils/responsive";

export default function AddLocationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = Colors.light;
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Screen 9 Form State
  const [locationType, setLocationType] = useState("Customer Home");
  const [label, setLabel] = useState("");
  const [remarks, setRemarks] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number>(8);
  const [addressPreview, setAddressPreview] = useState("Kozhikode, Kerala");

  useEffect(() => {
    init();
  }, [id]);

  const init = async () => {
    try {
      setLoading(true);
      const session = await getAuthSession();
      if (!session.token) {
        router.replace("/");
        return;
      }
      setToken(session.token);

      const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      setCustomer(data.customer);

      await captureGps();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const captureGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let currentLat: number | null = null;
      let currentLng: number | null = null;
      let reportedAcc = 0;

      if (status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          currentLat = loc.coords.latitude;
          currentLng = loc.coords.longitude;
          reportedAcc = Math.round(loc.coords.accuracy || 8);

          const reverse = await Location.reverseGeocodeAsync({ latitude: currentLat, longitude: currentLng });
          if (reverse && reverse[0]) {
            const r = reverse[0];
            setAddressPreview([r.name || r.street, r.subregion || r.city, r.region].filter(Boolean).join(", "));
          }
        } catch {}
      }

      if (currentLat !== null && currentLng !== null) {
        setCoords({ lat: currentLat, lng: currentLng });
        setAccuracy(reportedAcc);
      } else {
        setCoords(null);
        Alert.alert("GPS Required", "Could not get live GPS fix. Please ensure location services are enabled on your device.");
      }
    } catch (err: any) {
      Alert.alert("GPS Error", err.message);
    }
  };

  const handleSaveLocation = async () => {
    if (!coords) {
      Alert.alert("GPS Required", "Waiting for GPS fix before saving.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/locations/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: id,
          locationType,
          label: label.trim() || `${locationType} (${customer?.name || "Customer"})`,
          lat: coords.lat,
          lng: coords.lng,
          accuracy,
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Alert.alert(
        "Location Saved",
        "New customer location has been tagged and submitted for admin review.",
        [
          {
            text: "Back to Customer",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Notice", err.message || "Failed to save location.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !customer) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Initializing GPS Locator...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER: < Add Location (Reference Screen 9) */}
      <View style={styles.topHeaderBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.topHeaderTitle}>Add Location</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Map Pin Box (Screen 9) */}
          <View style={styles.mapPinCard}>
            <View style={styles.mapPinGraphic}>
              <View style={styles.mapPinCenterCircle}>
                <Ionicons name="location" size={24} color={Colors.light.primary} />
              </View>
            </View>
            <Text style={styles.mapCoordsText}>
              {coords?.lat?.toFixed(5)}, {coords?.lng?.toFixed(5)} • Accuracy {accuracy}m
            </Text>
            <Text style={styles.mapAddressText}>{addressPreview}</Text>
            <Pressable onPress={captureGps} hitSlop={6} style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="refresh" size={14} color={Colors.light.primary} />
              <Text style={{ fontSize: fontScale(12), color: Colors.light.primary, fontWeight: "700" }}>
                Refresh Live Pin
              </Text>
            </Pressable>
          </View>

          {/* Location Type Selector (Screen 9: Customer Home >) */}
          <Text style={styles.fieldLabel}>Location Type</Text>
          <View style={styles.typeSelectorRow}>
            {[
              "Customer Home",
              "Workplace / Office",
              "Relative's House",
              "Business / Shop",
              "Other",
            ].map((type) => {
              const active = locationType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.typePill, active && styles.typePillActive]}
                  onPress={() => setLocationType(type)}
                >
                  <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Location Label (Screen 9: e.g. Main House) */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Location Label</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Main House, Green Gate"
            placeholderTextColor="#94A3B8"
            value={label}
            onChangeText={setLabel}
          />

          {/* Remarks (optional) (Screen 9: e.g. Gate photo, nearby landmark) */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Remarks (optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Near temple, second house on right"
            placeholderTextColor="#94A3B8"
            value={remarks}
            onChangeText={setRemarks}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Button: Save Location (Screen 9) */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSaveLocation}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Location</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAF9",
  },
  loadingText: {
    fontSize: fontScale(14),
    color: "#64748B",
    marginTop: 12,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },

  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backButtonIcon: {
    fontSize: 24,
    color: "#0F172A",
    lineHeight: 26,
  },
  topHeaderTitle: {
    fontSize: fontScale(17),
    fontWeight: "800",
    color: "#0F172A",
  },

  // Map Pin Card (Screen 9)
  mapPinCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    marginBottom: 20,
    ...Shadows.sm,
  },
  mapPinGraphic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F6ED",
    borderWidth: 2,
    borderColor: "#B4E3C9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  mapPinCenterCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  mapCoordsText: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#0F172A",
  },
  mapAddressText: {
    fontSize: fontScale(12),
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
  },

  fieldLabel: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typePillActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  typePillText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#475569",
  },
  typePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: fontScale(14),
    color: "#0F172A",
  },

  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5EAE7",
    ...Shadows.lg,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.primary, // FieldFlow Emerald Green #00A86B
    height: 52,
    borderRadius: Radii.lg,
    ...Shadows.md,
  },
  saveButtonText: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
