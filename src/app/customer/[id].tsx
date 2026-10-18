import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config/api";
import { getAuthSession } from "../../utils/storage";
import { Colors, Spacing, Radii, Shadows } from "../../constants/theme";
import { fontScale } from "../../utils/responsive";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = Colors.light;
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  // Tab State: 'Details' | 'Locations' | 'History'
  const [activeTab, setActiveTab] = useState<"Details" | "Locations" | "History">("Details");

  // Call Logging Modal
  const [showCallModal, setShowCallModal] = useState(false);
  const [callOutcome, setCallOutcome] = useState("Connected");
  const [callRemarks, setCallRemarks] = useState("");
  const [callLogging, setCallLogging] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
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
      if (!res.ok) throw new Error(data.message);

      setCustomer(data.customer);
      setLocations(data.locations || []);
      setVisits(data.visits || []);
      setCalls(data.calls || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load customer profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCall = () => {
    if (!customer?.phone) return;
    Linking.openURL(`tel:${customer.phone}`);
  };

  const handleOpenWhatsApp = () => {
    if (!customer?.phone) return;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(customer.name || "")},%20this%20is%20regarding%20your%20FieldFlow%20account.`);
  };

  const handleOpenMaps = () => {
    if (!customer) return;
    const defaultLoc = locations.find((l) => l.isDefault) || locations[0];
    let query = "";

    if (defaultLoc?.coordinates?.lat && defaultLoc?.coordinates?.lng) {
      query = `${defaultLoc.coordinates.lat},${defaultLoc.coordinates.lng}`;
    } else {
      query = encodeURIComponent(`${customer.address}, ${customer.city || customer.area || "Kerala"}`);
    }

    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const handleLogCall = async () => {
    try {
      setCallLogging(true);
      const res = await fetch(`${API_BASE_URL}/calls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: id,
          phoneNumberCalled: customer.phone,
          outcome: callOutcome,
          remarks: callRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setShowCallModal(false);
      setCallRemarks("");
      Alert.alert("Call Logged", "Call interaction outcome saved to customer timeline.");
      loadCustomer();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setCallLogging(false);
    }
  };

  if (loading || !customer) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading Customer Details...</Text>
      </SafeAreaView>
    );
  }

  const initial = (customer.name || "C").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* TOP HEADER: < Customer Details (Reference Screen 6) */}
      <View style={styles.topHeaderBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.topHeaderTitle}>Customer Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* CUSTOMER PROFILE CARD (Screen 6) */}
        <View style={styles.profileCard}>
          {/* Circular Green Avatar with letter "R" */}
          <View style={styles.customerAvatarWrapper}>
            <Text style={styles.customerAvatarInitial}>{initial}</Text>
          </View>

          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerAccountId}>
            #{customer.loanAccountNo || "CUST" + (customer._id?.slice(-4) || "001")}
          </Text>

          {/* Phone + Call & WhatsApp Circular Action Buttons */}
          <View style={styles.contactRow}>
            <Text style={styles.customerPhone}>+91 {customer.phone}</Text>
            <View style={styles.contactButtonsRow}>
              {/* Call Button */}
              <Pressable style={styles.contactCircularBtn} onPress={handleOpenCall} hitSlop={6}>
                <Ionicons name="call" size={16} color={Colors.light.primary} />
              </Pressable>
              {/* WhatsApp Button */}
              <Pressable style={styles.contactCircularBtn} onPress={handleOpenWhatsApp} hitSlop={6}>
                <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
              </Pressable>
            </View>
          </View>

          {/* 3 KPI PILL CARDS (Outstanding, Due Days, Risk Level) */}
          <View style={styles.kpiPillsRow}>
            {/* Outstanding */}
            <View style={styles.kpiPillCard}>
              <Text style={styles.kpiPillLabel}>Outstanding</Text>
              <Text style={styles.kpiPillValue}>
                ₹{(customer.outstandingAmount || customer.emiAmount || 12500).toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Due Days */}
            <View style={styles.kpiPillCard}>
              <Text style={styles.kpiPillLabel}>Due Days</Text>
              <Text style={[styles.kpiPillValue, { color: "#D97706" }]}>
                {customer.dueDays || 45}
              </Text>
            </View>

            {/* Risk Level */}
            <View style={styles.kpiPillCard}>
              <Text style={styles.kpiPillLabel}>Risk Level</Text>
              <Text style={[styles.kpiPillValue, { color: "#EA580C" }]}>
                {customer.riskLevel || (customer.dpdBucket ? `${customer.dpdBucket}` : "Medium")}
              </Text>
            </View>
          </View>
        </View>

        {/* 3 SEGMENTED TABS: Details | Locations | History (Screen 6) */}
        <View style={styles.segmentedTabsContainer}>
          {(["Details", "Locations", "History"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                style={[styles.segmentedTabBtn, isActive && styles.segmentedTabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.segmentedTabBtnText,
                    isActive && styles.segmentedTabBtnTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TAB 1: DETAILS (Screen 6) */}
        {activeTab === "Details" && (
          <View style={styles.sectionCard}>
            {/* Address Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="location-outline" size={18} color={Colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>
                  {customer.address || "Edappally, Ernakulam, Kerala"}
                </Text>
                <Pressable onPress={handleOpenMaps} style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: fontScale(12), color: Colors.light.primary, fontWeight: "700" }}>
                    Open in Google Maps →
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Account No Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="card-outline" size={18} color={Colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Account No</Text>
                <Text style={styles.detailValue}>
                  {customer.loanAccountNo || "1234567890"}
                </Text>
              </View>
            </View>

            {/* Customer Type Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="person-outline" size={18} color={Colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Customer Type</Text>
                <Text style={styles.detailValue}>
                  {customer.loanType || "Personal Loan"}
                </Text>
              </View>
            </View>

            {/* Assigned Date Row */}
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="calendar-outline" size={18} color={Colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Assigned Date</Text>
                <Text style={styles.detailValue}>
                  {customer.assignedDate || "12 Aug 2024"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: LOCATIONS */}
        {activeTab === "Locations" && (
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: fontScale(15), fontWeight: "800", color: "#0F172A" }}>
                Saved Locations ({locations.length})
              </Text>
              <Pressable
                onPress={() => router.push(`/add-location/${id}` as any)}
                style={styles.addLocationSmallBtn}
              >
                <Text style={styles.addLocationSmallBtnText}>+ Add Location</Text>
              </Pressable>
            </View>

            {locations.length === 0 ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <Text style={{ fontSize: fontScale(13), color: "#64748B" }}>
                  No extra coordinates saved yet.
                </Text>
              </View>
            ) : (
              locations.map((loc, idx) => (
                <View key={loc._id || idx} style={styles.savedLocationItem}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: fontScale(14), fontWeight: "700", color: "#0F172A" }}>
                        {loc.locationType || "Customer Home"}
                      </Text>
                      {loc.isDefault && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: fontScale(12), color: "#64748B", marginTop: 2 }}>
                      {loc.label || loc.address || "Residence"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      if (loc.coordinates?.lat) {
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.coordinates.lat},${loc.coordinates.lng}`);
                      }
                    }}
                    style={styles.mapPinSmallBtn}
                  >
                    <Ionicons name="navigate-outline" size={16} color={Colors.light.primary} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === "History" && (
          <View style={styles.sectionCard}>
            <Text style={{ fontSize: fontScale(15), fontWeight: "800", color: "#0F172A", marginBottom: 12 }}>
              Visit & Interaction Timeline
            </Text>

            {visits.length === 0 && calls.length === 0 ? (
              <View style={{ paddingVertical: 18, alignItems: "center" }}>
                <Text style={{ fontSize: fontScale(13), color: "#64748B" }}>
                  No recorded visits or calls yet.
                </Text>
              </View>
            ) : (
              visits.map((v, i) => (
                <View key={v._id || i} style={styles.historyItemRow}>
                  <Text style={styles.historyItemDot}>•</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyItemTitle}>{v.outcome || "Field Visit"}</Text>
                    <Text style={styles.historyItemDate}>
                      {new Date(v.createdAt).toLocaleDateString()} at {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {v.notes ? <Text style={styles.historyItemNotes}>"{v.notes}"</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR: START VISIT (Reference Screen 6) */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          style={styles.startVisitButton}
          onPress={() =>
            router.push({
              pathname: `/visit/${id}`,
              params: {
                customerName: customer?.name || "",
                loanAccountNo: customer?.loanAccountNo || "",
                phone: customer?.phone || "",
                emiAmount: customer?.emiAmount ? String(customer.emiAmount) : "",
                portfolioId: customer?.portfolioId?._id || customer?.portfolioId || "",
                caseId: customer?.caseId || customer?._id || "",
              },
            } as any)
          }
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.startVisitButtonText}>Start Visit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
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

  // Top Header Bar (Screen 6)
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
    borderWidth: 1.5,
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

  // Profile Card (Screen 6)
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    ...Shadows.sm,
  },
  customerAvatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E8F6ED",
    borderWidth: 2.5,
    borderColor: "#B4E3C9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  customerAvatarInitial: {
    fontSize: fontScale(28),
    fontWeight: "900",
    color: Colors.light.primary,
  },
  customerName: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: "#0F172A",
  },
  customerAccountId: {
    fontSize: fontScale(12),
    color: "#64748B",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  customerPhone: {
    fontSize: fontScale(13),
    color: "#475569",
    fontWeight: "600",
  },
  contactButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  contactCircularBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F6ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B4E3C9",
  },

  // 3 KPI Pill Cards (Screen 6)
  kpiPillsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  kpiPillCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  kpiPillLabel: {
    fontSize: fontScale(11),
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 3,
  },
  kpiPillValue: {
    fontSize: fontScale(14),
    fontWeight: "800",
    color: "#0F172A",
  },

  // Segmented Tabs (Screen 6)
  segmentedTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: Radii.lg,
    padding: 3,
    marginBottom: 16,
  },
  segmentedTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: Radii.md,
  },
  segmentedTabBtnActive: {
    backgroundColor: "#FFFFFF",
    ...Shadows.sm,
  },
  segmentedTabBtnText: {
    fontSize: fontScale(13),
    fontWeight: "600",
    color: "#64748B",
  },
  segmentedTabBtnTextActive: {
    color: Colors.light.primary,
    fontWeight: "800",
  },

  // Section Card & Detail Rows (Screen 6)
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  detailIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F6ED",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  detailLabel: {
    fontSize: fontScale(11),
    color: "#64748B",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
    lineHeight: 20,
  },

  // Locations Tab styles
  addLocationSmallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.md,
    backgroundColor: Colors.light.primaryLight,
  },
  addLocationSmallBtnText: {
    fontSize: fontScale(11),
    fontWeight: "700",
    color: Colors.light.primary,
  },
  savedLocationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  primaryBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  primaryBadgeText: {
    fontSize: fontScale(10),
    fontWeight: "700",
    color: "#15803D",
  },
  mapPinSmallBtn: {
    padding: 8,
    borderRadius: Radii.md,
    backgroundColor: "#F1F5F9",
  },

  // History Tab styles
  historyItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  historyItemDot: {
    fontSize: 20,
    color: Colors.light.primary,
    lineHeight: 20,
  },
  historyItemTitle: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#0F172A",
  },
  historyItemDate: {
    fontSize: fontScale(11),
    color: "#94A3B8",
    marginTop: 1,
  },
  historyItemNotes: {
    fontSize: fontScale(12),
    color: "#475569",
    fontStyle: "italic",
    marginTop: 2,
  },

  // Fixed Bottom Action Bar: Start Visit (Screen 6)
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
  startVisitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.primary, // FieldFlow Emerald Green #00A86B
    height: 52,
    borderRadius: Radii.lg,
    gap: 8,
    ...Shadows.md,
  },
  startVisitButtonIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  startVisitButtonText: {
    fontSize: fontScale(16),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
