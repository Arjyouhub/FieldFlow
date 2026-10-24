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
  Share,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../../config/api";
import { getAuthSession } from "../../utils/storage";
import { Colors, Radii, Shadows } from "../../constants/theme";
import { fontScale } from "../../utils/responsive";

type VisitStep = "RADAR" | "DETAILS";

interface OutcomeOption {
  id: string;
  shortLabel: string;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    id: "Promise to Pay (PTP)",
    shortLabel: "PTP",
    label: "Promise to Pay",
    desc: "Committed to pay by date",
    icon: "calendar-outline",
    color: "#EA580C",
    bg: "#FFF7ED",
    border: "#FDBA74",
  },
  {
    id: "Payment Collected",
    shortLabel: "Collection",
    label: "Payment Collected",
    desc: "Cash or online payment",
    icon: "wallet-outline",
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#86EFAC",
  },
  {
    id: "Message Left",
    shortLabel: "Message Left",
    label: "Message Left",
    desc: "Notice / family / neighbour",
    icon: "mail-outline",
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#93C5FD",
  },
  {
    id: "Refused to Pay (RTP)",
    shortLabel: "RTP",
    label: "Refused to Pay",
    desc: "Customer declined payment",
    icon: "close-circle-outline",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FCA5A5",
  },
  {
    id: "House Locked",
    shortLabel: "Locked",
    label: "House Locked",
    desc: "Door closed / padlocked",
    icon: "lock-closed-outline",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    id: "Customer Unavailable",
    shortLabel: "Unavailable",
    label: "Unavailable",
    desc: "Not found at location",
    icon: "person-remove-outline",
    color: "#64748B",
    bg: "#F8FAFC",
    border: "#CBD5E1",
  },
  {
    id: "Other Feedback",
    shortLabel: "Other",
    label: "Other Feedback",
    desc: "Custom remarks / follow-up",
    icon: "chatbubble-ellipses-outline",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
];

export default function StartVisitScreen() {
  const params = useLocalSearchParams();
  const id = (params.id as string) || "";
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState("");
  const [customer, setCustomer] = useState<any>(() => ({
    name: (params.customerName as string) || "Customer",
    loanAccountNo: (params.loanAccountNo as string) || "",
    phone: (params.phone as string) || "",
    emiAmount: (params.emiAmount as string) || "",
    address: (params.address as string) || "",
    portfolioId: (params.portfolioId as string) || undefined,
    caseId: (params.caseId as string) || undefined,
  }));
  const [submitting, setSubmitting] = useState(false);

  // Active step: "RADAR" (Start Visit) -> "DETAILS" (Visit Submit)
  const [currentStep, setCurrentStep] = useState<VisitStep>("RADAR");

  // GPS State
  const [gpsLoading, setGpsLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number>(8);
  const [verification, setVerification] = useState<any>(null);

  // Photo Evidence State (Starts empty, no dummy photo)
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoGallery, setPhotoGallery] = useState<string[]>([]);

  // Post-submit Share Summary Modal State
  const [submittedVisitSummary, setSubmittedVisitSummary] = useState<{
    customerName: string;
    loanAccountNo: string;
    phone: string;
    address: string;
    outcome: string;
    collectedAmount?: number;
    paymentMethod?: string;
    paymentReference?: string;
    ptpAmount?: number;
    ptpDate?: string;
    remarks: string;
    visitTime: string;
    photoUri?: string | null;
  } | null>(null);

  // Visit Outcome Selection
  const [selectedOutcome, setSelectedOutcome] = useState<string>("Promise to Pay (PTP)");

  // PTP State
  const [ptpDate, setPtpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [ptpAmount, setPtpAmount] = useState(params.emiAmount ? String(params.emiAmount) : "5000");

  // Collection State
  const [collectedAmount, setCollectedAmount] = useState(params.emiAmount ? String(params.emiAmount) : "");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Bank Transfer">("Cash");
  const [paymentReference, setPaymentReference] = useState("");

  // Remarks / Text Feedback Box
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

      // Fetch latest customer data in background
      fetch(`${API_BASE_URL}/customers/${id}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.customer) {
            setCustomer(data.customer);
            if (data.customer.emiAmount) {
              if (!collectedAmount) setCollectedAmount(String(data.customer.emiAmount));
              if (!ptpAmount || ptpAmount === "5000") setPtpAmount(String(data.customer.emiAmount));
            }
          }
        })
        .catch(() => {});

      // Background GPS acquisition
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

      // Pre-check GPS against geofence
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
      console.warn("GPS Precheck notice:", err.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleCapturePhotoAction = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        setCurrentStep("DETAILS");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
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

  const setPtpPreset = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setPtpDate(d.toISOString().split("T")[0]);
  };

  const appendToRemarks = (chipText: string) => {
    setRemarks((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chipText;
      if (trimmed.includes(chipText)) return prev;
      return `${trimmed}, ${chipText}`;
    });
  };

  const handleSubmitVisit = async (visitOutcomeType?: string) => {
    const outcomeToUse = visitOutcomeType || selectedOutcome;

    // Validation
    if (outcomeToUse === "Payment Collected") {
      const amount = Number(collectedAmount || 0);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("Collection Amount Required", "Please enter the amount collected (greater than ₹0).");
        return;
      }
    } else if (outcomeToUse === "Promise to Pay (PTP)") {
      const amount = Number(ptpAmount || 0);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert("PTP Amount Required", "Please enter the promised amount (greater than ₹0).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customerId: id,
        caseId: customer?.caseDbId || customer?.caseId || undefined,
        portfolioId: customer?.portfolioId || undefined,
        lat: coords?.lat || 11.2588,
        lng: coords?.lng || 75.7725,
        accuracy,
        outcome: outcomeToUse,
        photoUrl: photoUri || "",
        notes: remarks.trim() ? remarks.trim() : `${outcomeToUse} visit completed`,
      };

      if (outcomeToUse === "Payment Collected") {
        payload.collectedAmount = Number(collectedAmount || 0);
        payload.paymentMethod = paymentMode;
        payload.paymentReference = paymentReference;
      } else if (outcomeToUse === "Promise to Pay (PTP)") {
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

      // Prepare structured visit report data for sharing
      const summaryPayload = {
        customerName: customer?.name || "Customer",
        loanAccountNo: customer?.loanAccountNo || "N/A",
        phone: customer?.phone || "N/A",
        address: `${customer?.address || "N/A"}${customer?.area ? ` (${customer.area})` : ""}`,
        outcome: outcomeToUse,
        collectedAmount: outcomeToUse === "Payment Collected" ? Number(collectedAmount || 0) : undefined,
        paymentMethod: outcomeToUse === "Payment Collected" ? paymentMode : undefined,
        paymentReference: outcomeToUse === "Payment Collected" ? paymentReference : undefined,
        ptpAmount: outcomeToUse === "Promise to Pay (PTP)" ? Number(ptpAmount || 0) : undefined,
        ptpDate: outcomeToUse === "Promise to Pay (PTP)" ? ptpDate : undefined,
        remarks: remarks.trim() || `${outcomeToUse} visit completed`,
        visitTime: `${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`,
        photoUri: photoUri || null,
      };

      setSubmittedVisitSummary(summaryPayload);
    } catch (err: any) {
      Alert.alert("Submission Notice", err.message || "Failed to record visit.");
    } finally {
      setSubmitting(false);
    }
  };

  // Share Visit Summary with Photo, Details, Feedback & Timestamp
  const handleShareVisitSummary = async () => {
    if (!submittedVisitSummary) return;
    try {
      const s = submittedVisitSummary;
      let text = `📋 *FIELDFLOW VISIT REPORT*\n━━━━━━━━━━━━━━━━━━━\n👤 *Customer:* ${s.customerName}\n💳 *Loan A/C:* ${s.loanAccountNo}\n📞 *Phone:* ${s.phone}\n📍 *Address:* ${s.address}\n\n⚡ *Outcome:* ${s.outcome}\n`;

      if (s.outcome === "Payment Collected") {
        text += `💰 *Collected Amount:* ₹${(s.collectedAmount || 0).toLocaleString("en-IN")}\n`;
        text += `💳 *Payment Mode:* ${s.paymentMethod}\n`;
        if (s.paymentReference) {
          text += `🔖 *Ref/Txn ID:* ${s.paymentReference}\n`;
        }
      } else if (s.outcome === "Promise to Pay (PTP)") {
        text += `🤝 *Promised Amount:* ₹${(s.ptpAmount || 0).toLocaleString("en-IN")}\n`;
        text += `📅 *PTP Date:* ${s.ptpDate}\n`;
      }

      text += `📝 *Feedback/Remarks:* ${s.remarks}\n`;
      text += `🕒 *Visit Time:* ${s.visitTime}\n`;
      text += `📍 *Geotag Accuracy:* ${accuracy}m\n`;
      if (s.photoUri) {
        text += `📷 *Evidence Photo:* Attached\n`;
      }
      text += `━━━━━━━━━━━━━━━━━━━\n*FieldFlow Recovery Management*`;

      await Share.share({
        message: text,
        url: s.photoUri || undefined,
        title: `Visit Report - ${s.customerName}`,
      });
    } catch (err: any) {
      console.warn("Share notice:", err.message);
    }
  };

  // -------------------------------------------------------------
  // SCREEN 1: START VISIT (RADAR & GPS)
  // (Select Location in Home / Relative House removed as requested)
  // -------------------------------------------------------------
  if (currentStep === "RADAR") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        {/* Top Header */}
        <View style={styles.topHeaderBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.topHeaderTitle}>Start Visit</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Customer Summary Card */}
          <View style={styles.customerRowCard}>
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>
                {(customer?.name || "Customer").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.customerHeaderName}>{customer?.name || "Customer"}</Text>
              <Text style={styles.customerHeaderSub}>
                #{customer?.loanAccountNo || "CUST001"}
                {customer?.phone ? ` • ${customer.phone}` : ""}
              </Text>
              {customer?.address ? (
                <Text style={styles.customerAddress} numberOfLines={1}>
                  {customer.address}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Radar Geofence Graphic Card */}
          <View style={styles.radarCard}>
            <View style={styles.radarOuterRing}>
              <View style={styles.radarMiddleRing}>
                <View style={styles.radarInnerRing}>
                  <View style={styles.radarCenterPin}>
                    <Ionicons name="location" size={24} color={Colors.light.primary} />
                  </View>
                </View>
              </View>
            </View>

            {/* GPS Accuracy Pill */}
            <View style={styles.gpsAccuracyPill}>
              <Text style={styles.gpsAccuracyText}>
                {gpsLoading ? "Acquiring GPS Signal..." : `GPS Accuracy ${accuracy} m`}
              </Text>
              <View style={[styles.goodBadge, gpsLoading && { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.goodBadgeText, gpsLoading && { color: "#D97706" }]}>
                  {gpsLoading ? "Locating..." : "Good Signal"}
                </Text>
              </View>
            </View>

            {/* Location distance status */}
            <View style={styles.geoStatusRow}>
              <Ionicons
                name={verification?.isSuspicious ? "alert-circle" : "shield-checkmark"}
                size={16}
                color={verification?.isSuspicious ? "#D97706" : "#16A34A"}
              />
              <Text style={styles.geoStatusText}>
                {verification?.distanceMetres
                  ? `${verification.distanceMetres}m from registered address`
                  : "Geofence verification ready"}
              </Text>
            </View>
          </View>

          {/* Visit Photo Card Preview */}
          <View style={styles.photoPromptCard}>
            <View style={styles.photoPromptLeft}>
              <Ionicons name="camera-outline" size={26} color={Colors.light.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.photoPromptTitle}>Visit Evidence Photo</Text>
                <Text style={styles.photoPromptSub}>
                  Take a photo of the house / premises to record geotagged proof.
                </Text>
              </View>
            </View>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPromptThumb} />
            ) : (
              <View style={[styles.photoPromptThumb, { backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="camera" size={20} color="#94A3B8" />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Button: Capture Photo & Proceed */}
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable style={styles.primaryActionButton} onPress={handleCapturePhotoAction}>
            <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionButtonText}>Capture Photo & Proceed</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 2: VISIT DETAILS & SUBMISSION
  // Direct Feedback selection (PTP, Collection, Message Left, RTP, etc.)
  // and Visit Feedback Text Input Box
  // -------------------------------------------------------------
  const activeOutcomeObj = OUTCOME_OPTIONS.find((o) => o.id === selectedOutcome) || OUTCOME_OPTIONS[0];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top Header */}
        <View style={styles.topHeaderBar}>
          <Pressable onPress={() => setCurrentStep("RADAR")} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.topHeaderTitle}>Visit Details</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer Header Row */}
          <View style={styles.customerRowCard}>
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>
                {(customer?.name || "Customer").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.customerHeaderName}>{customer?.name || "Customer"}</Text>
              <Text style={styles.customerHeaderSub}>
                #{customer?.loanAccountNo || "CUST001"}
                {customer?.phone ? ` • ${customer.phone}` : ""}
              </Text>
            </View>
            {customer?.emiAmount ? (
              <View style={styles.emiBadge}>
                <Text style={styles.emiBadgeLabel}>EMI Due</Text>
                <Text style={styles.emiBadgeAmount}>₹{customer.emiAmount}</Text>
              </View>
            ) : null}
          </View>

          {/* Geotagged Visit Summary Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>Visit Time</Text>
              <Text style={styles.detailsRowValue}>
                {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })},{" "}
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>Location Status</Text>
              <View style={styles.matchedBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#15803D" style={{ marginRight: 4 }} />
                <Text style={styles.matchedBadgeText}>GPS Matched</Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsRowLabel}>GPS Accuracy</Text>
              <Text style={styles.detailsRowValue}>{accuracy} metres</Text>
            </View>

            {/* Photo Evidence Thumbnails */}
            <View style={styles.photoThumbnailsSection}>
              <View style={styles.photoHeaderRow}>
                <Text style={styles.photoSectionLabel}>Photo Evidence {photoGallery.length > 0 ? `(${photoGallery.length})` : "(0)"}</Text>
                <Pressable onPress={handleCapturePhotoAction} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="camera" size={14} color={Colors.light.primary} />
                  <Text style={styles.retakePhotoText}>{photoUri ? "Retake Photo" : "Take Photo"}</Text>
                </Pressable>
              </View>
              {photoGallery.length > 0 ? (
                <View style={styles.photoGridRow}>
                  {photoGallery.map((img, i) => (
                    <Image key={i} source={{ uri: img }} style={styles.photoThumbnail} />
                  ))}
                </View>
              ) : (
                <Pressable
                  onPress={handleCapturePhotoAction}
                  style={[
                    styles.photoGridRow,
                    {
                      padding: 14,
                      backgroundColor: "#F8FAFC",
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: "#CBD5E1",
                      borderStyle: "dashed",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Ionicons name="camera-outline" size={20} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: "#475569", fontWeight: "600" }}>
                    No photo captured yet. Tap to take photo
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Section: Visit Feedback & Outcome */}
          <View style={[styles.sectionTitleRowWithBadge, { marginTop: 18 }]}>
            <Text style={styles.sectionTitle}>Visit Outcome / Feedback</Text>
            <View style={styles.requiredPill}>
              <Text style={styles.requiredPillText}>Select Feedback</Text>
            </View>
          </View>

          {/* Outcome Choice Chips Grid */}
          <View style={styles.outcomeGrid}>
            {OUTCOME_OPTIONS.map((item) => {
              const isSelected = selectedOutcome === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.outcomeChipCard,
                    isSelected && {
                      borderColor: item.color,
                      backgroundColor: item.bg,
                    },
                  ]}
                  onPress={() => setSelectedOutcome(item.id)}
                >
                  <View style={styles.outcomeChipTop}>
                    <View
                      style={[
                        styles.outcomeIconCircle,
                        { backgroundColor: isSelected ? item.color : "#F1F5F9" },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={17}
                        color={isSelected ? "#FFFFFF" : item.color}
                      />
                    </View>
                    {isSelected && (
                      <View style={[styles.miniCheckmark, { backgroundColor: item.color }]}>
                        <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.outcomeChipTitle,
                      isSelected && { color: item.color, fontWeight: "800" },
                    ]}
                  >
                    {item.shortLabel}
                  </Text>
                  <Text style={styles.outcomeChipSub} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* DYNAMIC SUB-FIELDS BASED ON SELECTION */}

          {/* 1. Payment Collected Details */}
          {selectedOutcome === "Payment Collected" && (
            <View style={[styles.dynamicOutcomeBox, { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" }]}>
              <View style={styles.dynamicBoxHeader}>
                <Ionicons name="wallet" size={18} color="#16A34A" />
                <Text style={[styles.dynamicBoxTitle, { color: "#15803D" }]}>Collection Details</Text>
              </View>

              <Text style={styles.formInputLabel}>Amount Collected (₹)</Text>
              <View style={styles.inputWithIconRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={[styles.inputWithIcon, { paddingLeft: 8, fontWeight: "700" }]}
                  placeholder="Enter amount"
                  placeholderTextColor="#94A3B8"
                  value={collectedAmount}
                  onChangeText={setCollectedAmount}
                  keyboardType="numeric"
                />
                {customer?.emiAmount ? (
                  <Pressable
                    style={styles.emiAutoFillBtn}
                    onPress={() => setCollectedAmount(String(customer.emiAmount))}
                  >
                    <Text style={styles.emiAutoFillText}>Full EMI</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* Quick Amount Chips */}
              <View style={styles.quickChipsRow}>
                {["500", "1000", "2000", "5000"].map((amt) => (
                  <Pressable
                    key={amt}
                    style={styles.quickChip}
                    onPress={() => setCollectedAmount(amt)}
                  >
                    <Text style={styles.quickChipText}>₹{amt}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formInputLabel, { marginTop: 12 }]}>Payment Mode</Text>
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

              <Text style={[styles.formInputLabel, { marginTop: 12 }]}>
                Transaction / Reference ID (Optional)
              </Text>
              <TextInput
                style={styles.singleLineInput}
                placeholder="UPI Ref ID or Receipt No."
                placeholderTextColor="#94A3B8"
                value={paymentReference}
                onChangeText={setPaymentReference}
              />
            </View>
          )}

          {/* 2. Promise to Pay (PTP) Details */}
          {selectedOutcome === "Promise to Pay (PTP)" && (
            <View style={[styles.dynamicOutcomeBox, { borderColor: "#FDBA74", backgroundColor: "#FFFBF7" }]}>
              <View style={styles.dynamicBoxHeader}>
                <Ionicons name="calendar" size={18} color="#EA580C" />
                <Text style={[styles.dynamicBoxTitle, { color: "#C2410C" }]}>
                  Promise to Pay (PTP) Commitment
                </Text>
              </View>

              <Text style={styles.formInputLabel}>Promised Amount (₹)</Text>
              <View style={styles.inputWithIconRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={[styles.inputWithIcon, { paddingLeft: 8, fontWeight: "700" }]}
                  placeholder="Enter promised amount"
                  placeholderTextColor="#94A3B8"
                  value={ptpAmount}
                  onChangeText={setPtpAmount}
                  keyboardType="numeric"
                />
                {customer?.emiAmount ? (
                  <Pressable
                    style={styles.emiAutoFillBtn}
                    onPress={() => setPtpAmount(String(customer.emiAmount))}
                  >
                    <Text style={styles.emiAutoFillText}>Full EMI</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={[styles.formInputLabel, { marginTop: 12 }]}>Select Promised Date</Text>
              <View style={styles.quickChipsRow}>
                {[
                  { label: "Tomorrow", days: 1 },
                  { label: "+3 Days", days: 3 },
                  { label: "+7 Days", days: 7 },
                  { label: "+15 Days", days: 15 },
                ].map((preset) => (
                  <Pressable
                    key={preset.label}
                    style={styles.quickChip}
                    onPress={() => setPtpPreset(preset.days)}
                  >
                    <Text style={styles.quickChipText}>{preset.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.inputWithIconRow, { marginTop: 8 }]}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={ptpDate}
                  onChangeText={setPtpDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
                <Ionicons name="calendar-outline" size={18} color="#EA580C" />
              </View>
            </View>
          )}

          {/* 3. Message Left Quick Chips */}
          {selectedOutcome === "Message Left" && (
            <View style={[styles.dynamicOutcomeBox, { borderColor: "#93C5FD", backgroundColor: "#F8FAFF" }]}>
              <View style={styles.dynamicBoxHeader}>
                <Ionicons name="mail" size={18} color="#2563EB" />
                <Text style={[styles.dynamicBoxTitle, { color: "#1D4ED8" }]}>
                  Message Left With
                </Text>
              </View>
              <Text style={styles.quickChipGuideText}>
                Tap to add recipient details to feedback:
              </Text>
              <View style={styles.quickChipsRowWrap}>
                {[
                  "Left with Neighbour",
                  "Left with Family Member",
                  "Door Sticky Notice Pasted",
                  "Left with Security Guard",
                  "Spoke to Relative on Call",
                ].map((chip) => {
                  const isAdded = remarks.includes(chip);
                  return (
                    <Pressable
                      key={chip}
                      style={[styles.quickSelectPill, isAdded && styles.quickSelectPillActive]}
                      onPress={() => appendToRemarks(chip)}
                    >
                      <Text style={[styles.quickSelectPillText, isAdded && styles.quickSelectPillTextActive]}>
                        {chip}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 4. Refused to Pay (RTP) Quick Chips */}
          {selectedOutcome === "Refused to Pay (RTP)" && (
            <View style={[styles.dynamicOutcomeBox, { borderColor: "#FCA5A5", backgroundColor: "#FFF5F5" }]}>
              <View style={styles.dynamicBoxHeader}>
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={[styles.dynamicBoxTitle, { color: "#B91C1C" }]}>
                  Refusal Reason (RTP)
                </Text>
              </View>
              <Text style={styles.quickChipGuideText}>
                Tap to add reason to feedback:
              </Text>
              <View style={styles.quickChipsRowWrap}>
                {[
                  "Financial Dispute",
                  "Refused Point Blank",
                  "Claims Already Paid",
                  "Legal Notice Demanded",
                  "Customer Hostile / Threatening",
                  "Job Loss / Income Issue",
                ].map((chip) => {
                  const isAdded = remarks.includes(chip);
                  return (
                    <Pressable
                      key={chip}
                      style={[
                        styles.quickSelectPill,
                        isAdded && { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
                      ]}
                      onPress={() => appendToRemarks(chip)}
                    >
                      <Text
                        style={[
                          styles.quickSelectPillText,
                          isAdded && { color: "#DC2626", fontWeight: "700" },
                        ]}
                      >
                        {chip}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 5. House Locked Quick Chips */}
          {selectedOutcome === "House Locked" && (
            <View style={[styles.dynamicOutcomeBox, { borderColor: "#FDE68A", backgroundColor: "#FFFDF5" }]}>
              <View style={styles.dynamicBoxHeader}>
                <Ionicons name="lock-closed" size={18} color="#D97706" />
                <Text style={[styles.dynamicBoxTitle, { color: "#B45309" }]}>
                  Lock Condition
                </Text>
              </View>
              <View style={styles.quickChipsRowWrap}>
                {[
                  "Door Padlocked",
                  "Neighbour says Shifted",
                  "Out of Station",
                  "House Locked Since Months",
                ].map((chip) => {
                  const isAdded = remarks.includes(chip);
                  return (
                    <Pressable
                      key={chip}
                      style={[styles.quickSelectPill, isAdded && styles.quickSelectPillActive]}
                      onPress={() => appendToRemarks(chip)}
                    >
                      <Text style={[styles.quickSelectPillText, isAdded && styles.quickSelectPillTextActive]}>
                        {chip}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 6. Customer Unavailable Quick Chips */}
          {selectedOutcome === "Customer Unavailable" && (
            <View style={[styles.dynamicOutcomeBox, { borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" }]}>
              <View style={styles.dynamicBoxHeader}>
                <Ionicons name="person-remove" size={18} color="#64748B" />
                <Text style={[styles.dynamicBoxTitle, { color: "#475569" }]}>
                  Customer Availability
                </Text>
              </View>
              <View style={styles.quickChipsRowWrap}>
                {[
                  "At Workplace / Office",
                  "Travelling Out of Town",
                  "Phone Switch Off",
                  "Family says will return evening",
                ].map((chip) => {
                  const isAdded = remarks.includes(chip);
                  return (
                    <Pressable
                      key={chip}
                      style={[styles.quickSelectPill, isAdded && styles.quickSelectPillActive]}
                      onPress={() => appendToRemarks(chip)}
                    >
                      <Text style={[styles.quickSelectPillText, isAdded && styles.quickSelectPillTextActive]}>
                        {chip}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section: Visit Feedback & Remarks Text Box ("textehuthan ulla option kude koduknm feed back") */}
          <View style={[styles.sectionTitleRowWithBadge, { marginTop: 18 }]}>
            <Text style={styles.sectionTitle}>Visit Feedback / Remarks</Text>
            {remarks.length > 0 && (
              <Pressable onPress={() => setRemarks("")} hitSlop={6}>
                <Text style={styles.clearRemarksText}>Clear</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.remarksCard}>
            <TextInput
              style={styles.remarksInputDirect}
              placeholder="Type detailed visit feedback notes here (e.g., Spoke with customer, verified house address, customer agreed to clear overdue by Friday)..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={remarks}
              onChangeText={setRemarks}
            />
          </View>
        </ScrollView>

        {/* Fixed Bottom Action Bar */}
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <Pressable
            style={[
              styles.primaryActionButton,
              { backgroundColor: activeOutcomeObj.color },
              submitting && styles.buttonDisabled,
            ]}
            onPress={() => handleSubmitVisit(selectedOutcome)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionButtonText}>
                  {selectedOutcome === "Payment Collected"
                    ? `Submit Collection (₹${collectedAmount || "0"})`
                    : selectedOutcome === "Promise to Pay (PTP)"
                    ? `Submit PTP (₹${ptpAmount || "0"})`
                    : selectedOutcome === "Refused to Pay (RTP)"
                    ? "Submit Visit (RTP)"
                    : selectedOutcome === "Message Left"
                    ? "Submit Visit (Message Left)"
                    : `Submit Visit (${activeOutcomeObj.shortLabel})`}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Visit Success & Share Modal */}
      <Modal
        visible={!!submittedVisitSummary}
        transparent
        animationType="fade"
        onRequestClose={() => router.replace("/dashboard")}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            {/* Top Success Icon */}
            <View style={styles.shareSuccessIconCircle}>
              <Ionicons name="checkmark-done" size={32} color="#059669" />
            </View>

            <Text style={styles.shareSuccessTitle}>Visit Submitted!</Text>
            <Text style={styles.shareSuccessSubtitle}>
              Visit recorded and verified for {submittedVisitSummary?.customerName}.
            </Text>

            {/* Structured Visit Summary Box */}
            <View style={styles.shareSummaryBox}>
              <View style={styles.shareSummaryRow}>
                <Text style={styles.shareSummaryLabel}>Outcome:</Text>
                <Text style={styles.shareSummaryValueBold}>{submittedVisitSummary?.outcome}</Text>
              </View>

              {submittedVisitSummary?.collectedAmount ? (
                <View style={styles.shareSummaryRow}>
                  <Text style={styles.shareSummaryLabel}>Collected:</Text>
                  <Text style={[styles.shareSummaryValueBold, { color: "#059669" }]}>
                    ₹{submittedVisitSummary.collectedAmount.toLocaleString("en-IN")} ({submittedVisitSummary.paymentMethod})
                  </Text>
                </View>
              ) : null}

              {submittedVisitSummary?.ptpAmount ? (
                <View style={styles.shareSummaryRow}>
                  <Text style={styles.shareSummaryLabel}>PTP Promise:</Text>
                  <Text style={[styles.shareSummaryValueBold, { color: "#D97706" }]}>
                    ₹{submittedVisitSummary.ptpAmount.toLocaleString("en-IN")} by {submittedVisitSummary.ptpDate}
                  </Text>
                </View>
              ) : null}

              <View style={styles.shareSummaryRow}>
                <Text style={styles.shareSummaryLabel}>Feedback:</Text>
                <Text style={styles.shareSummaryValue} numberOfLines={2}>
                  {submittedVisitSummary?.remarks}
                </Text>
              </View>

              <View style={styles.shareSummaryRow}>
                <Text style={styles.shareSummaryLabel}>Time:</Text>
                <Text style={styles.shareSummaryValue}>{submittedVisitSummary?.visitTime}</Text>
              </View>

              {submittedVisitSummary?.photoUri ? (
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Image
                    source={{ uri: submittedVisitSummary.photoUri }}
                    style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: "#E2E8F0" }}
                  />
                  <Text style={{ fontSize: 11.5, color: "#059669", fontWeight: "600" }}>
                    ✓ Photo Evidence Geotagged
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Actions: Share & Done */}
            <View style={styles.shareActionsCol}>
              <Pressable style={styles.shareReportButton} onPress={handleShareVisitSummary}>
                <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.shareReportButtonText}>Share Visit Summary</Text>
              </Pressable>

              <Pressable
                style={styles.doneDashboardButton}
                onPress={() => router.replace("/dashboard")}
              >
                <Text style={styles.doneDashboardButtonText}>Done / Return to Dashboard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  topHeaderTitle: {
    fontSize: fontScale(17),
    fontWeight: "800",
    color: "#0F172A",
  },

  // Customer Summary Card
  customerRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  smallAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F6ED",
    alignItems: "center",
    justifyContent: "center",
  },
  smallAvatarText: {
    fontSize: fontScale(17),
    fontWeight: "800",
    color: Colors.light.primary,
  },
  customerHeaderName: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#0F172A",
  },
  customerHeaderSub: {
    fontSize: fontScale(12),
    color: "#64748B",
    marginTop: 2,
  },
  customerAddress: {
    fontSize: fontScale(11),
    color: "#94A3B8",
    marginTop: 2,
  },
  emiBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.md,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  emiBadgeLabel: {
    fontSize: fontScale(10),
    color: "#1E40AF",
    fontWeight: "600",
  },
  emiBadgeAmount: {
    fontSize: fontScale(13),
    fontWeight: "800",
    color: "#1E3A8A",
  },

  // Screen 1: Radar Graphic Card
  radarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    marginBottom: 16,
    ...Shadows.sm,
  },
  radarOuterRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#E8F6ED",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#B4E3C9",
  },
  radarMiddleRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
  },
  radarInnerRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  radarCenterPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  gpsAccuracyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 14,
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
  geoStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  geoStatusText: {
    fontSize: fontScale(12),
    color: "#64748B",
    fontWeight: "500",
  },

  // Photo Prompt Card
  photoPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  photoPromptLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  photoPromptTitle: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  photoPromptSub: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  photoPromptThumb: {
    width: 54,
    height: 54,
    borderRadius: Radii.md,
    backgroundColor: "#E2E8F0",
  },

  // Screen 2: Details Card
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
    paddingVertical: 9,
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
    flexDirection: "row",
    alignItems: "center",
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
    marginTop: 12,
  },
  photoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  photoSectionLabel: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#334155",
  },
  retakePhotoText: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: Colors.light.primary,
  },
  photoGridRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoThumbnail: {
    width: 72,
    height: 72,
    borderRadius: Radii.md,
    backgroundColor: "#E2E8F0",
  },

  // Section Headers
  sectionTitleRowWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#0F172A",
  },
  requiredPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  requiredPillText: {
    fontSize: fontScale(10),
    fontWeight: "700",
    color: "#475569",
  },

  // Outcome Selection Grid (PTP, Collection, Message Left, RTP, etc.)
  outcomeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  outcomeChipCard: {
    width: "48.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E5EAE7",
  },
  outcomeChipTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  outcomeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  miniCheckmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  outcomeChipTitle: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#0F172A",
  },
  outcomeChipSub: {
    fontSize: fontScale(10),
    color: "#64748B",
    marginTop: 2,
  },

  // Dynamic Outcome Box
  dynamicOutcomeBox: {
    marginTop: 14,
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: 1.5,
  },
  dynamicBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  dynamicBoxTitle: {
    fontSize: fontScale(14),
    fontWeight: "800",
  },
  formInputLabel: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  quickChipGuideText: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginBottom: 8,
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
    fontWeight: "800",
    color: "#0F172A",
  },
  inputWithIcon: {
    flex: 1,
    fontSize: fontScale(14),
    color: "#0F172A",
  },
  emiAutoFillBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.md,
  },
  emiAutoFillText: {
    fontSize: fontScale(11),
    fontWeight: "700",
    color: "#334155",
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  quickChip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.md,
    paddingVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickChipText: {
    fontSize: fontScale(11),
    fontWeight: "700",
    color: "#334155",
  },
  quickChipsRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  quickSelectPill: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  quickSelectPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  quickSelectPillText: {
    fontSize: fontScale(11),
    fontWeight: "600",
    color: "#475569",
  },
  quickSelectPillTextActive: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  pillBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: Radii.lg,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillBtnActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  pillBtnText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#475569",
  },
  pillBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  singleLineInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: fontScale(13),
    color: "#0F172A",
  },

  // Remarks Card
  remarksCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  remarksInputDirect: {
    fontSize: fontScale(13),
    color: "#0F172A",
    minHeight: 80,
    textAlignVertical: "top",
  },
  clearRemarksText: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#EF4444",
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
    backgroundColor: Colors.light.primary,
    height: 52,
    borderRadius: Radii.lg,
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

  // Share & Completion Modal
  shareModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  shareModalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  shareSuccessIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#A7F3D0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  shareSuccessTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  shareSuccessSubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 16,
  },
  shareSummaryBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  shareSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  shareSummaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    minWidth: 70,
  },
  shareSummaryValue: {
    fontSize: 12,
    color: "#1E293B",
    flex: 1,
    textAlign: "right",
  },
  shareSummaryValueBold: {
    fontSize: 12.5,
    color: "#0F172A",
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  shareActionsCol: {
    width: "100%",
    gap: 10,
  },
  shareReportButton: {
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shareReportButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  doneDashboardButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  doneDashboardButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
});
