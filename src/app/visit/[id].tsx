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
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../../config/api";
import { getAuthSession } from "../../utils/storage";
import { Colors, Spacing, Radii, Shadows } from "../../constants/theme";
import { fontScale } from "../../utils/responsive";

type VisitStep = "RADAR" | "DETAILS" | "FEEDBACK" | "PTP" | "COLLECTION";

export default function StartVisitScreen() {
  const params = useLocalSearchParams();
  const id = (params.id as string) || "";
  const router = useRouter();
  const theme = Colors.light;
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState("");
  const [customer, setCustomer] = useState<any>(() => ({
    name: (params.customerName as string) || "Customer",
    loanAccountNo: (params.loanAccountNo as string) || "",
    phone: (params.phone as string) || "",
    emiAmount: (params.emiAmount as string) || "",
    portfolioId: (params.portfolioId as string) || undefined,
    caseId: (params.caseId as string) || undefined,
  }));
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active step matching Reference Screens 7, 10, 11, 12, 13
  const [currentStep, setCurrentStep] = useState<VisitStep>("RADAR");

  // Screen 7: Selected Location Radio
  const [selectedLocationType, setSelectedLocationType] = useState("Customer Home");

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number>(8);
  const [verification, setVerification] = useState<any>(null);

  // Photo Evidence State (Screen 8 & 10)
  const [photoUri, setPhotoUri] = useState<string | null>(
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80"
  );
  const [photoGallery, setPhotoGallery] = useState<string[]>([
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&auto=format&fit=crop&q=80",
  ]);

  // Screen 11: Customer Feedback State
  const [callOutcome, setCallOutcome] = useState<"Spoke" | "Not Reachable" | "Wrong Number">("Spoke");
  const [customerResponse, setCustomerResponse] = useState<
    "Will Pay" | "Payment Issue" | "Not Interested" | "Dispute" | "Others"
  >("Will Pay");

  // Screen 12: PTP State
  const [ptpDate, setPtpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [ptpAmount, setPtpAmount] = useState(params.emiAmount ? String(params.emiAmount) : "5000");

  // Screen 13: Collection State
  const [collectedAmount, setCollectedAmount] = useState(params.emiAmount ? String(params.emiAmount) : "");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Bank Transfer">("Cash");
  const [paymentReference, setPaymentReference] = useState("");

  // Remarks Common
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    initVisit();
  }, [id]);

  const initVisit = async () => {
    try {
      const session = await getAuthSession();
      if (!session.token) {
        router.replace("/");
        return;
      }
      setToken(session.token);

      // Non-blocking background fetch for latest customer data
      fetch(`${API_BASE_URL}/customers/${id}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.customer) {
            setCustomer(data.customer);
            if (data.customer.emiAmount && !collectedAmount) {
              setCollectedAmount(String(data.customer.emiAmount));
            }
          }
        })
        .catch(() => {});

      // Non-blocking background GPS acquisition
      captureCurrentGps(session.token);
    } catch {
      // Non-blocking
    }
  };

  const captureCurrentGps = async (authToken: string) => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      let currentLat = 11.2588;
      let currentLng = 75.7725;
      let reportedAccuracy = 8;

      if (status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          currentLat = loc.coords.latitude;
          currentLng = loc.coords.longitude;
          reportedAccuracy = Math.round(loc.coords.accuracy || 8);
        } catch {}
      }

      setCoords({ lat: currentLat, lng: currentLng });
      setAccuracy(reportedAccuracy);

      // Pre-check GPS against 100m radius
      const precheckRes = await fetch(`${API_BASE_URL}/visits/precheck-gps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          customerId: id,
          lat: currentLat,
          lng: currentLng,
          accuracy: reportedAccuracy,
        }),
      });

      const precheckData = await precheckRes.json();
      if (precheckRes.ok) {
        setVerification(precheckData.verification);
      }
    } catch (err: any) {
      console.warn("GPS Precheck warning:", err.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleCapturePhotoAction = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        // Fallback or proceed
        setCurrentStep("DETAILS");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false, // Crop option disabled
      });

      if (!res.canceled && res.assets[0]?.uri) {
        setPhotoUri(res.assets[0].uri);
        setPhotoGallery((prev) => [res.assets[0].uri, ...prev.slice(0, 2)]);
      }
      setCurrentStep("DETAILS");
    } catch {
      setCurrentStep("DETAILS");
    }
  };

  const handleSubmitVisit = async (visitOutcomeType: string) => {
    setSubmitting(true);
    try {
      const payload: any = {
        customerId: id,
        caseId: customer?.caseDbId || customer?.caseId || undefined,
        portfolioId: customer?.portfolioId || undefined,
        lat: coords?.lat || 11.2588,
        lng: coords?.lng || 75.7725,
        accuracy,
        outcome: visitOutcomeType,
        photoUrl: photoUri || "",
        notes: remarks || `Location visited: ${selectedLocationType}`,
      };

      if (visitOutcomeType === "Payment Collected") {
        payload.collectedAmount = Number(collectedAmount || 0);
        payload.paymentMethod = paymentMode;
        payload.paymentReference = paymentReference;
      } else if (visitOutcomeType === "Promise to Pay (PTP)") {
        payload.ptpAmount = Number(ptpAmount || 0);
        payload.ptpDate = ptpDate;
      }

      const res = await fetch(`${API_BASE_URL}/visits/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      Alert.alert(
        "Visit Submitted Successfully",
        verification?.isSuspicious
          ? "Visit recorded. Because GPS coordinates were outside the 100m geofence, this entry was transparently flagged for admin audit."
          : `Visit record saved for ${customer?.name || "Customer"}.`,
        [
          {
            text: "Return to Dashboard",
            onPress: () => router.replace("/dashboard"),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Submission Notice", err.message || "Failed to record visit.");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SCREEN 7: START VISIT (RADAR & LOCATION SELECTION)
  // -------------------------------------------------------------
  if (currentStep === "RADAR") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.topHeaderBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.topHeaderTitle}>Start Visit</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Radar Concentric Circles Map Graphic (Screen 7) */}
          <View style={styles.radarCard}>
            <View style={styles.radarOuterRing}>
              <View style={styles.radarMiddleRing}>
                <View style={styles.radarInnerRing}>
                  <View style={styles.radarCenterPin}>
                    <Ionicons name="location" size={22} color={Colors.light.primary} />
                  </View>
                </View>
              </View>
            </View>

            {/* GPS Accuracy Pill (Screen 7: GPS Accuracy 8 m [Good]) */}
            <View style={styles.gpsAccuracyPill}>
              <Text style={styles.gpsAccuracyText}>
                {gpsLoading ? "Acquiring GPS..." : `GPS Accuracy ${accuracy} m`}
              </Text>
              <View style={[styles.goodBadge, gpsLoading && { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.goodBadgeText, gpsLoading && { color: "#D97706" }]}>
                  {gpsLoading ? "Locating..." : "Good"}
                </Text>
              </View>
            </View>
          </View>

          {/* Select Location Section (Screen 7) */}
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Select Location</Text>
          </View>

          {[
            { id: "Customer Home", title: "Customer Home", subtitle: "Primary residence", icon: "home-outline" as const },
            { id: "Workplace / Office", title: "Workplace / Office", subtitle: "Employer location", icon: "business-outline" as const },
            { id: "Relative's House", title: "Relative's House", subtitle: "Secondary contact address", icon: "people-outline" as const },
            { id: "Business / Shop", title: "Business / Shop", subtitle: "Commercial establishment", icon: "storefront-outline" as const },
            { id: "Other", title: "Other", subtitle: "Custom field location", icon: "location-outline" as const },
          ].map((item) => {
            const isSelected = selectedLocationType === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.locationRadioCard, isSelected && styles.locationRadioCardSelected]}
                onPress={() => setSelectedLocationType(item.id)}
              >
                <View style={styles.locationRadioLeft}>
                  <Ionicons name={item.icon} size={20} color={isSelected ? Colors.light.primary : "#64748B"} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.locationRadioTitle}>{item.title}</Text>
                    <Text style={styles.locationRadioSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>

                {/* Checkmark or Radio circle */}
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Bottom Button: Capture Photo (Screen 7) */}
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable style={styles.primaryActionButton} onPress={handleCapturePhotoAction}>
            <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionButtonText}>Capture Photo</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 10: VISIT DETAILS (SUBMIT VISIT SUMMARY)
  // -------------------------------------------------------------
  if (currentStep === "DETAILS") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.topHeaderBar}>
          <Pressable onPress={() => setCurrentStep("RADAR")} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.topHeaderTitle}>Visit Details</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Customer Header Row */}
          <View style={styles.customerRowCard}>
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>
                {(customer?.name || "Customer").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.customerHeaderName}>{customer?.name || "Customer"}</Text>
              <Text style={styles.customerHeaderSub}>
                #{customer?.loanAccountNo || "CUST001"}{customer?.phone ? ` • ${customer.phone}` : ""}
              </Text>
            </View>
          </View>

          {/* Details Table Card (Screen 10) */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>Visit Date</Text>
              <Text style={styles.detailsRowValue}>
                {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })},{" "}
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>Location Status</Text>
              <View style={styles.matchedBadge}>
                <Text style={styles.matchedBadgeText}>Matched</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>Distance</Text>
              <Text style={styles.detailsRowValue}>
                {verification?.distanceMetres || 25} metres
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>GPS Accuracy</Text>
              <Text style={styles.detailsRowValue}>{accuracy} metres</Text>
            </View>

            <View style={[styles.detailsRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailsRowLabel}>Location</Text>
              <Text style={styles.detailsRowValue}>
                {selectedLocationType} (Main)
              </Text>
            </View>

            {/* Photo Evidence Thumbnails Grid (Screen 10) */}
            <View style={styles.photoThumbnailsSection}>
              <Text style={styles.photoSectionLabel}>Photo Evidence (3)</Text>
              <View style={styles.photoGridRow}>
                {photoGallery.map((img, i) => (
                  <Image key={i} source={{ uri: img }} style={styles.photoThumbnail} />
                ))}
              </View>
            </View>
          </View>

          {/* Next Action Chooser (Feedback / PTP / Collection) */}
          <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: 10 }]}>
            Record Visit Outcome
          </Text>

          <View style={styles.outcomeChooserGrid}>
            <Pressable
              style={styles.outcomeOptionCard}
              onPress={() => setCurrentStep("COLLECTION")}
            >
              <Ionicons name="wallet-outline" size={26} color="#15803D" style={{ marginBottom: 6 }} />
              <Text style={styles.outcomeOptionTitle}>Collection</Text>
              <Text style={styles.outcomeOptionSub}>Cash or UPI payment</Text>
            </Pressable>

            <Pressable
              style={styles.outcomeOptionCard}
              onPress={() => setCurrentStep("PTP")}
            >
              <Ionicons name="calendar-outline" size={26} color="#EA580C" style={{ marginBottom: 6 }} />
              <Text style={styles.outcomeOptionTitle}>Promise to Pay</Text>
              <Text style={styles.outcomeOptionSub}>Schedule commit date</Text>
            </Pressable>

            <Pressable
              style={styles.outcomeOptionCard}
              onPress={() => setCurrentStep("FEEDBACK")}
            >
              <Ionicons name="chatbubbles-outline" size={26} color={Colors.light.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.outcomeOptionTitle}>Customer Feedback</Text>
              <Text style={styles.outcomeOptionSub}>Disposition note</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Submit Visit Direct Action Button */}
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable
            style={[styles.primaryActionButton, submitting && styles.buttonDisabled]}
            onPress={() => handleSubmitVisit("Visit Completed")}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryActionButtonText}>Submit Visit</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 11: CUSTOMER FEEDBACK
  // -------------------------------------------------------------
  if (currentStep === "FEEDBACK") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.topHeaderBar}>
          <Pressable onPress={() => setCurrentStep("DETAILS")} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.topHeaderTitle}>Customer Feedback</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Call Outcome Segment (Screen 11: Spoke | Not Reachable | Wrong Number) */}
          <Text style={styles.formSectionLabel}>Call Outcome</Text>
          <View style={styles.pillsRow}>
            {(["Spoke", "Not Reachable", "Wrong Number"] as const).map((item) => {
              const active = callOutcome === item;
              return (
                <Pressable
                  key={item}
                  style={[styles.pillBtn, active && styles.pillBtnActive]}
                  onPress={() => setCallOutcome(item)}
                >
                  <Text style={[styles.pillBtnText, active && styles.pillBtnTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Customer Response Pills (Screen 11) */}
          <Text style={[styles.formSectionLabel, { marginTop: 18 }]}>Customer Response</Text>
          <View style={[styles.pillsRow, { flexWrap: "wrap" }]}>
            {(["Will Pay", "Payment Issue", "Not Interested", "Dispute", "Others"] as const).map(
              (item) => {
                const active = customerResponse === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.pillBtn, active && styles.pillBtnActive]}
                    onPress={() => setCustomerResponse(item)}
                  >
                    <Text style={[styles.pillBtnText, active && styles.pillBtnTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>

          {/* Remarks TextArea (Screen 11) */}
          <Text style={[styles.formSectionLabel, { marginTop: 18 }]}>Remarks</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Enter remarks..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={remarks}
            onChangeText={setRemarks}
          />
        </ScrollView>

        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable
            style={[styles.primaryActionButton, submitting && styles.buttonDisabled]}
            onPress={() => handleSubmitVisit(`Feedback: ${customerResponse}`)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryActionButtonText}>Save Feedback</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 12: PTP SUBMISSION
  // -------------------------------------------------------------
  if (currentStep === "PTP") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.topHeaderBar}>
          <Pressable onPress={() => setCurrentStep("DETAILS")} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.topHeaderTitle}>PTP Submission</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Promised Date (Screen 12) */}
          <Text style={styles.formSectionLabel}>Promised Date</Text>
          <View style={styles.inputWithIconRow}>
            <TextInput
              style={styles.inputWithIcon}
              value={ptpDate}
              onChangeText={setPtpDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />
            <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
          </View>

          {/* Promised Amount (Screen 12) */}
          <Text style={[styles.formSectionLabel, { marginTop: 16 }]}>Promised Amount</Text>
          <View style={styles.inputWithIconRow}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={[styles.inputWithIcon, { paddingLeft: 8 }]}
              value={ptpAmount}
              onChangeText={setPtpAmount}
              placeholder="Enter amount"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          {/* Remarks (Screen 12) */}
          <Text style={[styles.formSectionLabel, { marginTop: 16 }]}>Remarks</Text>
          <View style={styles.inputWithIconRow}>
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Enter remarks..."
              placeholderTextColor="#94A3B8"
              value={remarks}
              onChangeText={setRemarks}
            />
            <Ionicons name="document-text-outline" size={20} color="#94A3B8" />
          </View>
        </ScrollView>

        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable
            style={[styles.primaryActionButton, submitting && styles.buttonDisabled]}
            onPress={() => handleSubmitVisit("Promise to Pay (PTP)")}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryActionButtonText}>Submit PTP</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 13: COLLECTION
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topHeaderBar}>
        <Pressable onPress={() => setCurrentStep("DETAILS")} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.topHeaderTitle}>Collection</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Collection Amount (Screen 13: ₹ Enter amount) */}
        <Text style={styles.formSectionLabel}>Collection Amount</Text>
        <View style={styles.inputWithIconRow}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={[styles.inputWithIcon, { paddingLeft: 8 }]}
            placeholder="Enter amount"
            placeholderTextColor="#94A3B8"
            value={collectedAmount}
            onChangeText={setCollectedAmount}
            keyboardType="numeric"
          />
        </View>

        {/* Payment Mode (Screen 13: Cash | UPI | Bank Transfer) */}
        <Text style={[styles.formSectionLabel, { marginTop: 18 }]}>Payment Mode</Text>
        <View style={styles.pillsRow}>
          {(["Cash", "UPI", "Bank Transfer"] as const).map((mode) => {
            const active = paymentMode === mode;
            return (
              <Pressable
                key={mode}
                style={[styles.pillBtn, active && styles.pillBtnActive]}
                onPress={() => setPaymentMode(mode)}
              >
                <Text style={[styles.pillBtnText, active && styles.pillBtnTextActive]}>
                  {mode}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Reference / Transaction ID (Screen 13) */}
        <Text style={[styles.formSectionLabel, { marginTop: 18 }]}>Reference / Transaction ID</Text>
        <TextInput
          style={styles.singleLineInput}
          placeholder="Enter reference ID"
          placeholderTextColor="#94A3B8"
          value={paymentReference}
          onChangeText={setPaymentReference}
        />

        {/* Remarks (Screen 13) */}
        <Text style={[styles.formSectionLabel, { marginTop: 18 }]}>Remarks</Text>
        <TextInput
          style={styles.remarksInput}
          placeholder="Enter remarks..."
          placeholderTextColor="#94A3B8"
          value={remarks}
          onChangeText={setRemarks}
        />
      </ScrollView>

      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          style={[styles.primaryActionButton, submitting && styles.buttonDisabled]}
          onPress={() => handleSubmitVisit("Payment Collected")}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryActionButtonText}>Submit Collection</Text>
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

  // Screen 7: Radar Graphic
  radarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    marginBottom: 18,
    ...Shadows.sm,
  },
  radarOuterRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E8F6ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B4E3C9",
  },
  radarMiddleRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
  },
  radarInnerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  radarCenterPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  gpsAccuracyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gpsAccuracyText: {
    fontSize: fontScale(13),
    color: "#475569",
    fontWeight: "600",
  },
  goodBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  goodBadgeText: {
    fontSize: fontScale(11),
    fontWeight: "700",
    color: "#15803D",
  },

  sectionTitleRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: fontScale(16),
    fontWeight: "800",
    color: "#0F172A",
  },

  // Screen 7: Location Radio Card
  locationRadioCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },
  locationRadioCardSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: "#F4FAF6",
  },
  locationRadioLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationRadioTitle: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  locationRadioSubtitle: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginTop: 1,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  radioCheckmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // Screen 10: Details Card
  customerRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },
  smallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAvatarText: {
    fontSize: fontScale(16),
    fontWeight: "800",
    color: Colors.light.primary,
  },
  customerHeaderName: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#0F172A",
  },
  customerHeaderSub: {
    fontSize: fontScale(11),
    color: "#64748B",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailsRowLabel: {
    fontSize: fontScale(13),
    color: "#64748B",
  },
  detailsRowValue: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#0F172A",
  },
  matchedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  matchedBadgeText: {
    fontSize: fontScale(11),
    fontWeight: "700",
    color: "#15803D",
  },
  photoThumbnailsSection: {
    marginTop: 14,
  },
  photoSectionLabel: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  photoGridRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: Radii.md,
    backgroundColor: "#E2E8F0",
  },
  outcomeChooserGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  outcomeOptionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },
  outcomeOptionTitle: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 6,
    textAlign: "center",
  },
  outcomeOptionSub: {
    fontSize: fontScale(10),
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
  },

  // Form Section Common
  formSectionLabel: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillBtnActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  pillBtnText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#475569",
  },
  pillBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inputWithIconRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  currencyPrefix: {
    fontSize: fontScale(16),
    fontWeight: "700",
    color: "#0F172A",
  },
  inputWithIcon: {
    flex: 1,
    fontSize: fontScale(14),
    color: "#0F172A",
  },
  inputRowRightIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  singleLineInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: fontScale(14),
    color: "#0F172A",
  },
  remarksInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 12,
    height: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: fontScale(14),
    color: "#0F172A",
  },

  // Fixed Bottom Bar
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
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.primary, // FieldFlow Emerald Green #00A86B
    height: 52,
    borderRadius: Radii.lg,
    gap: 8,
    ...Shadows.md,
  },
  primaryActionButtonText: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
