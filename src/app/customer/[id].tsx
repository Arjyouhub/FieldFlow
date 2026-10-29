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
  const [planningVisit, setPlanningVisit] = useState(false);

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

  const handleTogglePlanVisit = async () => {
    try {
      setPlanningVisit(true);
      const session = await getAuthSession();
      const nextPlanned = !customer?.isPlanned;
      const res = await fetch(`${API_BASE_URL}/customers/${id}/plan-visit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ isPlanned: nextPlanned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setCustomer((prev: any) => ({ ...prev, isPlanned: nextPlanned }));
      Alert.alert(
        nextPlanned ? "Visit Planned" : "Visit Plan Removed",
        nextPlanned
          ? "Case marked in your planned visit queue."
          : "Case removed from planned visits."
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not update visit plan.");
    } finally {
      setPlanningVisit(false);
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

          {/* 4 FINANCIAL KPI CARDS: POS | TOS | LOAN AMOUNT | DPD */}
          <View style={styles.kpiGrid4}>
            <View style={styles.kpiCard4}>
              <Text style={styles.kpiLabel4}>POS</Text>
              <Text style={styles.kpiValue4}>
                ₹{(customer.pos !== undefined && customer.pos !== null ? customer.pos : (customer.outstandingAmount || 0)).toLocaleString("en-IN")}
              </Text>
            </View>

            <View style={styles.kpiCard4}>
              <Text style={styles.kpiLabel4}>TOS</Text>
              <Text style={styles.kpiValue4}>
                ₹{(customer.tos !== undefined && customer.tos !== null ? customer.tos : (customer.outstandingAmount || 0)).toLocaleString("en-IN")}
              </Text>
            </View>

            <View style={styles.kpiCard4}>
              <Text style={styles.kpiLabel4}>LOAN AMOUNT</Text>
              <Text style={styles.kpiValue4}>
                ₹{(customer.loanAmount || customer.outstandingAmount || 0).toLocaleString("en-IN")}
              </Text>
            </View>

            <View style={[styles.kpiCard4, (customer.dpd ?? 0) > 90 && { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }]}>
              <Text style={[styles.kpiLabel4, (customer.dpd ?? 0) > 90 && { color: "#DC2626" }]}>DPD</Text>
              <Text style={[styles.kpiValue4, (customer.dpd ?? 0) > 90 ? { color: "#DC2626" } : { color: "#D97706" }]}>
                {customer.dpd ?? 0} Days
              </Text>
            </View>
          </View>

          {/* Sub-pill for Due Amount / EMI & Plan Status */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 8, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: fontScale(12), color: "#64748B", fontWeight: "600" }}>
              Due: <Text style={{ color: "#0F172A", fontWeight: "800" }}>₹{(customer.dueAmount || customer.emiAmount || 0).toLocaleString("en-IN")}</Text>
            </Text>
            {customer.isPlanned ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E0F2FE", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Ionicons name="calendar" size={12} color="#0284C7" />
                <Text style={{ fontSize: fontScale(11), color: "#0369A1", fontWeight: "800" }}>PLANNED VISIT</Text>
              </View>
            ) : null}
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
                  {customer.address || "Address not provided"}
                </Text>
                {customer.address ? (
                  <Pressable onPress={handleOpenMaps} style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: fontScale(12), color: Colors.light.primary, fontWeight: "700" }}>
                      Open in Google Maps →
                    </Text>
                  </Pressable>
                ) : null}
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
                  {customer.loanAccountNo || "—"}
                </Text>
              </View>
            </View>

            {/* Portfolio / Loan Type Row */}
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="briefcase-outline" size={18} color={Colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Portfolio Type</Text>
                <Text style={styles.detailValue}>
                  {customer.portfolioName || customer.portfolioCode || "Standard Loan"}
                </Text>
              </View>
            </View>

            {/* Batch Month Row */}
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailIconWrapper}>
                <Ionicons name="calendar-outline" size={18} color={Colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Batch Month</Text>
                <Text style={styles.detailValue}>
                  {customer.batchMonth || "OCT-2026"}
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
                <View key={`loc-${loc._id || 'l'}-${idx}`} style={styles.savedLocationItem}>
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
                <View key={`visit-${v._id || 'v'}-${i}`} style={styles.historyItemRow}>
                  <Text style={styles.historyItemDot}>•</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.historyItemTitle}>{v.outcome || "Field Visit"}</Text>
                      {v.collectedAmount > 0 ? (
                        <Text style={{ fontSize: fontScale(12), fontWeight: '700', color: '#16a34a' }}>
                          ₹{v.collectedAmount.toLocaleString('en-IN')}
                        </Text>
                      ) : v.ptpAmount > 0 ? (
                        <Text style={{ fontSize: fontScale(12), fontWeight: '700', color: '#2563eb' }}>
                          PTP: ₹{v.ptpAmount.toLocaleString('en-IN')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.historyItemDate}>
                      {new Date(v.createdAt).toLocaleDateString()} at {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • By {v.staffId?.name || v.staffName || 'Field Executive'}
                    </Text>
                    {v.coordinates?.lat && v.coordinates?.lng ? (
                      <Text style={{ fontSize: fontScale(11), color: '#64748B', marginTop: 2 }}>
                        📍 {v.coordinates.lat.toFixed(5)}, {v.coordinates.lng.toFixed(5)} {v.verificationStatus === 'LOCATION_MATCHED' ? '(Verified on site)' : ''}
                      </Text>
                    ) : null}
                    {v.notes ? <Text style={styles.historyItemNotes}>"{v.notes}"</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR: START VISIT */}
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

  // 4 Financial KPI Cards (POS, TOS, LOAN AMOUNT, DPD)
  kpiGrid4: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  kpiCard4: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  kpiLabel4: {
    fontSize: fontScale(10),
    color: "#64748B",
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue4: {
    fontSize: fontScale(15),
    fontWeight: "900",
    color: "#0F172A",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Legacy 3 KPI Pill Cards (Screen 6)
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

  // Fixed Bottom Action Bar: Plan Visit & Start Visit
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
  bottomButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  planVisitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    height: 52,
    borderRadius: Radii.lg,
    gap: 6,
  },
  planVisitButtonActive: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  planVisitButtonText: {
    fontSize: fontScale(14),
    fontWeight: "800",
    color: "#0284C7",
  },
  planVisitButtonTextActive: {
    color: "#FFFFFF",
  },
  startVisitButton: {
    width: "100%",
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
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
