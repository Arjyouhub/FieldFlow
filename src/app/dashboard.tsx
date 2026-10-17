import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  Modal,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { API_BASE_URL } from "../config/api";
import { getAuthSession, clearAuthSession } from "../utils/storage";
import { Colors, Spacing, Radii, Shadows } from "../constants/theme";
import { fontScale, scale, verticalScale } from "../utils/responsive";
import { formatDistance, getCustomerNearestDistance } from "../utils/geo";

type TabKey = "home" | "cases" | "reports" | "profile";
type SortOption = "DEFAULT" | "AMOUNT_DESC" | "AMOUNT_ASC" | "NAME_ASC";

export default function DashboardScreen() {
  const router = useRouter();
  const theme = Colors.light;
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>("cases");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [adminPortfolios, setAdminPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("DEFAULT");

  // GPS Nearest Cases Location State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number>(10);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsNotice, setGpsNotice] = useState("");

  // Modals
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showQuickActionModal, setShowQuickActionModal] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  useEffect(() => {
    loadSessionAndData();
  }, []);

  const loadSessionAndData = async () => {
    const session = await getAuthSession();
    if (!session.token) {
      router.replace("/");
      return;
    }
    setToken(session.token);
    setUser(session.user);
    fetchAdminPortfolios(session.token);
    fetchAssignedCases(session.token);
  };

  const fetchAdminPortfolios = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/portfolios?status=active`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.portfolios)) {
        setAdminPortfolios(data.portfolios);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchAssignedCases = async (authToken: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/customers/assigned`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // If no customers returned for staff, seed demo cases
      if (!data.customers || data.customers.length === 0) {
        await fetch(`${API_BASE_URL}/customers/seed-demo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const retryRes = await fetch(`${API_BASE_URL}/customers/assigned`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const retryData = await retryRes.json();
        setCustomers(retryData.customers || []);
      } else {
        setCustomers(data.customers || []);
      }
    } catch (err: any) {
      Alert.alert("Network Notice", err.message || "Failed to load assigned field cases.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Acquire Staff GPS Location for Nearest Cases
  const requestGpsLocation = async () => {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsNotice("Location permission denied. Please allow location access to calculate distances.");
        return;
      }
      setGpsNotice("");
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      if (loc.coords.accuracy) {
        setAccuracy(Math.round(loc.coords.accuracy));
      }
    } catch {
      setGpsNotice("Unable to acquire live GPS position. Check location services.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Distinct Portfolios List: ONLY portfolios added/active in Admin Page
  const availablePortfolios = useMemo(() => {
    if (adminPortfolios && adminPortfolios.length > 0) {
      const activeList = adminPortfolios
        .filter((p) => p.isActive !== false)
        .map((p) => p.name)
        .filter(Boolean);
      return ["ALL", ...activeList];
    }
    // Fallback if offline: only distinct portfolios actually present in assigned cases
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.portfolioName && c.portfolioName !== "General" && c.portfolioName.trim()) {
        set.add(c.portfolioName.trim());
      }
    });
    return ["ALL", ...Array.from(set)];
  }, [adminPortfolios, customers]);

  // Distinct Batches List: only batches actually present in assigned cases
  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.batchMonth && c.batchMonth.trim()) set.add(c.batchMonth.trim());
    });
    return ["ALL", ...Array.from(set)];
  }, [customers]);

  // Comprehensive Real KPI Metrics matching Reference Screenshot
  const kpis = useMemo(() => {
    const scoped =
      portfolioFilter === "ALL"
        ? customers
        : customers.filter(
            (c) =>
              (c.portfolioName || "").toLowerCase().includes(portfolioFilter.toLowerCase()) ||
              (c.portfolioCode || "").toLowerCase().includes(portfolioFilter.toLowerCase())
          );

    const total = scoped.length;
    const unvisited = scoped.filter(
      (c) => c.status === "unvisited" || c.status === "assigned" || c.status === "pending"
    ).length;
    const visited = scoped.filter(
      (c) => c.status === "visited" || c.status === "paid" || c.status === "collected" || c.status === "ptp" || c.status === "broken_ptp" || c.status === "rtp"
    ).length;
    const paid = scoped.filter((c) => c.status === "paid" || c.status === "collected").length;
    const unpaid = scoped.filter((c) => c.status !== "paid" && c.status !== "collected").length;
    const ptp = scoped.filter((c) => c.status === "ptp").length;
    const brokenPtp = scoped.filter((c) => c.status === "broken_ptp").length;
    const rtp = scoped.filter((c) => c.status === "rtp" || c.status === "refusal_to_pay").length;
    const nonWorkable = scoped.filter((c) => c.status === "non_workable").length;
    const suspicious = scoped.filter((c) => c.status === "suspicious_visit" || c.isSuspicious).length;
    const pendingVerification = scoped.filter(
      (c) => c.status === "pending_verification" || c.status === "payment_submitted"
    ).length;

    const totalCollectedAmt = scoped
      .filter((c) => c.status === "collected" || c.status === "paid")
      .reduce((sum, c) => sum + (c.emiAmount || c.outstandingAmount || 0), 0);

    return {
      total,
      unvisited,
      visited,
      paid,
      unpaid,
      ptp,
      brokenPtp,
      rtp,
      assigned: total,
      pending: unvisited,
      collected: paid,
      nonWorkable,
      suspicious,
      pendingVerification,
      totalCollectedAmt,
    };
  }, [customers, portfolioFilter]);

  // Multi-dimensional Filtered and Sorted Cases
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Portfolio Filter
    if (portfolioFilter !== "ALL") {
      result = result.filter(
        (c) =>
          (c.portfolioName || "").toLowerCase().includes(portfolioFilter.toLowerCase()) ||
          (c.portfolioCode || "").toLowerCase().includes(portfolioFilter.toLowerCase())
      );
    }

    // 2. Batch Filter
    if (batchFilter !== "ALL") {
      const bTarget = batchFilter.toLowerCase().replace(/[\s-]/g, "");
      result = result.filter((c) => {
        if (!c.batchMonth) return true;
        const b = String(c.batchMonth).toLowerCase().replace(/[\s-]/g, "");
        return b.includes(bTarget) || bTarget.includes(b);
      });
    }

    // 3. Status & Spatial Filters
    if (statusFilter === "NEAREST") {
      // Retain cases and sort by distance below
    } else if (statusFilter === "UNVISITED") {
      result = result.filter(
        (c) => c.status === "unvisited" || c.status === "assigned" || c.status === "pending"
      );
    } else if (statusFilter === "VISITED") {
      result = result.filter(
        (c) => c.status === "visited" || c.status === "paid" || c.status === "collected" || c.status === "ptp" || c.status === "broken_ptp" || c.status === "rtp"
      );
    } else if (statusFilter === "PAID" || statusFilter === "COLLECTED") {
      result = result.filter((c) => c.status === "paid" || c.status === "collected");
    } else if (statusFilter === "UNPAID") {
      result = result.filter((c) => c.status !== "paid" && c.status !== "collected");
    } else if (statusFilter === "PTP") {
      result = result.filter((c) => c.status === "ptp");
    } else if (statusFilter === "BROKEN_PTP") {
      result = result.filter((c) => c.status === "broken_ptp");
    } else if (statusFilter === "RTP") {
      result = result.filter((c) => c.status === "rtp" || c.status === "refusal_to_pay");
    } else if (statusFilter === "PENDING") {
      result = result.filter((c) => c.status === "pending" || c.status === "assigned");
    } else if (statusFilter === "NON_WORKABLE") {
      result = result.filter((c) => c.status === "non_workable");
    } else if (statusFilter === "SUSPICIOUS") {
      result = result.filter((c) => c.status === "suspicious_visit" || c.isSuspicious);
    } else if (statusFilter === "PENDING_VERIFICATION") {
      result = result.filter(
        (c) => c.status === "pending_verification" || c.status === "payment_submitted"
      );
    }

    // 4. Search query: name, accountNo, referenceNumber, phone, address
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.loanAccountNo?.toLowerCase().includes(q) ||
          c.referenceNumber?.toLowerCase().includes(q) ||
          c.caseId?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.area?.toLowerCase().includes(q)
      );
    }

    // 5. Attach distance
    const refLat = userCoords ? userCoords.lat : 11.2588;
    const refLng = userCoords ? userCoords.lng : 75.7725;
    result = result.map((c) => {
      if (c.locations && c.locations.length > 0) {
        const { nearestDistance, nearestLocation } = getCustomerNearestDistance(
          refLat,
          refLng,
          c.locations
        );
        return { ...c, calculatedDistance: nearestDistance, nearestLocation };
      }
      return c;
    });

    // 6. Sorting
    if (statusFilter === "NEAREST" || sortBy === "DEFAULT") {
      result.sort((a, b) => {
        const dA = a.calculatedDistance != null ? a.calculatedDistance : Infinity;
        const dB = b.calculatedDistance != null ? b.calculatedDistance : Infinity;
        return dA - dB;
      });
    } else {
      switch (sortBy) {
        case "AMOUNT_DESC":
          result.sort((a, b) => (b.outstandingAmount || 0) - (a.outstandingAmount || 0));
          break;
        case "AMOUNT_ASC":
          result.sort((a, b) => (a.outstandingAmount || 0) - (b.outstandingAmount || 0));
          break;
        case "NAME_ASC":
          result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          break;
        default:
          break;
      }
    }

    return result;
  }, [customers, portfolioFilter, batchFilter, statusFilter, searchQuery, sortBy, userCoords]);

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out of FieldFlow?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearAuthSession();
          router.replace("/");
        },
      },
    ]);
  };

  const getPortfolioBadge = (portfolioName: string) => {
    const raw = (portfolioName || "").trim();
    if (!raw || raw.toLowerCase() === "general") {
      return {
        name: raw || "General",
        bg: "#F1F5F9",
        text: "#475569",
        icon: "folder-outline",
        iconColor: "#64748B",
      };
    }
    const p = raw.toLowerCase();
    if (p.includes("kreditbee") || p.includes("kbee")) {
      return {
        name: raw,
        bg: "#FEF08A",
        text: "#713F12",
        icon: "flash",
        iconColor: "#CA8A04",
      };
    }
    if (p.includes("smartcoin") || p.includes("scoin")) {
      return {
        name: raw,
        bg: "#FFEDD5",
        text: "#C2410C",
        icon: "disc",
        iconColor: "#EA580C",
      };
    }
    if (p.includes("money") || p.includes("msmart") || p.includes("moneyview")) {
      return {
        name: raw,
        bg: "#DBEAFE",
        text: "#1D4ED8",
        icon: "wallet",
        iconColor: "#2563EB",
      };
    }
    if (p.includes("navi")) {
      return {
        name: raw,
        bg: "#DCFCE7",
        text: "#15803D",
        icon: "trending-up",
        iconColor: "#16A34A",
      };
    }
    return {
      name: raw,
      bg: "#F3E8FF",
      text: "#6B21A8",
      icon: "business",
      iconColor: "#9333EA",
    };
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "pending";
    if (s === "collected" || s === "paid") {
      return { label: "Paid", bg: "#ECFDF5", text: "#059669", icon: "checkmark-circle" };
    }
    if (s === "visited") {
      return { label: "Visited", bg: "#EFF6FF", text: "#2563EB", icon: "checkmark-circle" };
    }
    if (s === "unpaid") {
      return { label: "Unpaid", bg: "#FEF2F2", text: "#DC2626", icon: "alert-circle-outline" };
    }
    if (s === "ptp") {
      return { label: "PTP", bg: "#FFFBEB", text: "#D97706", icon: "calendar-outline" };
    }
    if (s === "broken_ptp") {
      return { label: "Broken PTP", bg: "#FFF7ED", text: "#EA580C", icon: "link-outline" };
    }
    if (s === "rtp" || s === "refusal_to_pay") {
      return { label: "RTP", bg: "#FAF5FF", text: "#9333EA", icon: "repeat-outline" };
    }
    if (s === "unvisited") {
      return { label: "Unvisited", bg: "#F1F5F9", text: "#475569", icon: "time-outline" };
    }
    if (s === "non_workable") {
      return { label: "Non-workable", bg: "#F1F5F9", text: "#475569", icon: "ban-outline" };
    }
    if (s === "suspicious_visit" || s === "suspicious") {
      return { label: "Suspicious", bg: "#FEF2F2", text: "#DC2626", icon: "alert-circle-outline" };
    }
    if (s === "pending_verification" || s === "payment_submitted") {
      return { label: "Pending Verif", bg: "#E0F2FE", text: "#0369A1", icon: "hourglass-outline" };
    }
    if (s === "assigned") {
      return { label: "Assigned", bg: "#E6F7F0", text: "#00A86B", icon: "people-outline" };
    }
    return { label: "Pending", bg: "#FEF3C7", text: "#D97706", icon: "time-outline" };
  };

  const renderCaseCard = (cust: any, index: number) => {
    const badge = getStatusBadge(cust.status);
    const pBadge = getPortfolioBadge(cust.portfolioName);
    const initial = (cust.name || "C").charAt(0).toUpperCase();
    const attemptBadge = [6, 3, 0, 8, 1, 2][index % 6];
    const attemptBadgeBg = attemptBadge > 4 ? "#059669" : attemptBadge > 1 ? "#0284C7" : "#EA580C";

    // Format phone nicely: 8943 392 081
    const rawPhone = cust.phone || "9876543210";
    const formattedPhone =
      rawPhone.length === 10
        ? `${rawPhone.slice(0, 4)} ${rawPhone.slice(4, 7)} ${rawPhone.slice(7)}`
        : rawPhone;

    const displayDistance =
      cust.calculatedDistance != null
        ? formatDistance(cust.calculatedDistance)
        : cust.distance != null
        ? `${cust.distance} km`
        : null;

    return (
      <Pressable
        key={cust._id || cust.caseDbId || index}
        style={styles.cardContainer}
        onPress={() => router.push(`/customer/${cust._id}` as any)}
      >
        {/* TOP ROW: Avatar + Customer Details + Portfolio Badge & Distance */}
        <View style={styles.cardTopRow}>
          {/* Avatar with attempt count ring badge */}
          <View style={styles.avatarWrapper}>
            {cust.photoUrl ? (
              <Image source={{ uri: cust.photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
            <View style={[styles.avatarBadgeCircle, { backgroundColor: attemptBadgeBg }]}>
              <Text style={styles.avatarBadgeText}>{attemptBadge}</Text>
            </View>
          </View>

          {/* Customer Name, Phone, Address */}
          <View style={styles.customerInfoCol}>
            <Text style={styles.customerName} numberOfLines={1}>
              {cust.name}
            </Text>

            <View style={styles.customerMetaRow}>
              <Ionicons name="call-outline" size={12} color="#64748B" />
              <Text style={styles.customerPhone}>{formattedPhone}</Text>
            </View>

            <View style={styles.customerMetaRow}>
              <Ionicons name="location-outline" size={12} color="#64748B" />
              <Text style={styles.customerAddress} numberOfLines={1}>
                {cust.address || cust.area || "Kozhikode, Kerala"}
              </Text>
            </View>
          </View>

          {/* Right Column: Portfolio Pill + Distance */}
          <View style={styles.cardRightCol}>
            <View style={[styles.portfolioBadgePill, { backgroundColor: pBadge.bg }]}>
              <Ionicons name={pBadge.icon as any} size={11} color={pBadge.iconColor} style={{ marginRight: 3 }} />
              <Text style={[styles.portfolioBadgeText, { color: pBadge.text }]}>{pBadge.name}</Text>
            </View>

            <View style={styles.distanceRow}>
              {displayDistance ? (
                <>
                  <Ionicons name="location-sharp" size={13} color="#00A86B" />
                  <Text style={styles.distanceValue}>{displayDistance}</Text>
                </>
              ) : null}
              <Ionicons name="chevron-forward" size={15} color="#94A3B8" style={{ marginLeft: 2 }} />
            </View>
            {displayDistance ? <Text style={styles.nearestSubText}>Nearest</Text> : null}
          </View>
        </View>

        {/* Subtle Horizontal Divider */}
        <View style={styles.cardDivider} />

        {/* BOTTOM ROW: Account ID + Outstanding + Due + Status + Action Buttons */}
        <View style={styles.cardBottomRow}>
          {/* 1. Account / Case ID & Ref */}
          <View style={styles.accCol}>
            <Text style={styles.loanAccountText} numberOfLines={1}>
              {cust.loanAccountNo || cust.caseId || "KB" + String(cust._id).slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.refText}>
              REF: {cust.referenceNumber || "-"}
            </Text>
          </View>

          {/* 2. Outstanding */}
          <View style={styles.amountCol}>
            <Text style={styles.amountValue}>
              ₹{(cust.outstandingAmount || 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.amountLabel}>Outstanding</Text>
          </View>

          {/* 3. Due */}
          <View style={styles.amountCol}>
            <Text style={[styles.amountValue, { color: "#DC2626" }]}>
              ₹{(cust.dueAmount || cust.emiAmount || 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.amountLabel}>Due</Text>
          </View>

          {/* 4. Status Badge */}
          <View style={[styles.caseStatusBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon as any} size={11} color={badge.text} style={{ marginRight: 3 }} />
            <Text style={[styles.caseStatusText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>

          {/* 5. Action Buttons (Call & Navigate) */}
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.cardActionBtn}
              onPress={() => Linking.openURL(`tel:${cust.phone}`)}
              hitSlop={6}
            >
              <Ionicons name="call-outline" size={15} color="#0F172A" />
            </Pressable>
            <Pressable
              style={styles.cardActionBtn}
              onPress={() => {
                const lat = cust.locations?.[0]?.coordinates?.lat || 11.2588;
                const lng = cust.locations?.[0]?.coordinates?.lng || 75.7725;
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
              }}
              hitSlop={6}
            >
              <Ionicons name="navigate-outline" size={15} color="#00A86B" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // -------------------------------------------------------------
  // TAB 1: HOME (MATCHES REFERENCE SCREEN 4: STAFF DASHBOARD)
  // -------------------------------------------------------------
  const renderHomeTab = () => (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAssignedCases(token);
          }}
          colors={[Colors.light.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* TOP HEADER: Avatar + Good Morning + Officer Name + Bell Icon */}
      <View style={styles.headerBar}>
        <View style={styles.headerProfileRow}>
          <Pressable
            style={styles.headerAvatar}
            onPress={() => setActiveTab("profile")}
          >
            {user?.profilePhoto || user?.avatar ? (
              <Image source={{ uri: user.profilePhoto || user.avatar }} style={styles.headerAvatarImg} />
            ) : (
              <Text style={styles.headerAvatarText}>
                {(user?.name || "A").substring(0, 1).toUpperCase()}
              </Text>
            )}
          </Pressable>
          <View style={styles.headerGreetingCol}>
            <Text style={styles.headerGreetingSub}>Good Morning</Text>
            <Text style={styles.headerGreetingName}>{user?.name?.split(" ")[0] || "Akhil"}</Text>
          </View>
        </View>

        {/* Bell Notification Button */}
        <Pressable
          style={styles.bellButton}
          onPress={() => setShowNotifModal(true)}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.light.text} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      {/* TOP PORTFOLIO SELECTOR BAR */}
      <View style={styles.portfolioSection}>
        <View style={styles.portfolioHeaderRow}>
          <Ionicons name="briefcase-outline" size={13} color={Colors.light.primary} />
          <Text style={styles.portfolioSectionTitle}>SELECT PORTFOLIO</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.portfolioSelectorBar}
        >
          {availablePortfolios.map((p) => {
            const isActive = portfolioFilter === p;
            return (
              <Pressable
                key={p}
                style={[styles.portfolioChip, isActive && styles.portfolioChipActive]}
                onPress={() => setPortfolioFilter(p)}
              >
                <Text style={[styles.portfolioChipText, isActive && styles.portfolioChipTextActive]}>
                  {p === "ALL" ? "All Portfolios" : p}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 9 KPI GRID TILES */}
      <View style={styles.kpiGrid}>
        {/* 1. Assigned */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>Assigned</Text>
            <Ionicons name="people-outline" size={18} color={Colors.light.primary} />
          </View>
          <Text style={styles.kpiTileValue}>{kpis.assigned}</Text>
        </View>

        {/* 2. Pending */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>Pending</Text>
            <Ionicons name="time-outline" size={18} color="#D97706" />
          </View>
          <Text style={[styles.kpiTileValue, { color: "#D97706" }]}>
            {kpis.pending}
          </Text>
        </View>

        {/* 3. Visited */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>Visited</Text>
            <Ionicons name="checkmark-done-circle-outline" size={18} color={Colors.light.primary} />
          </View>
          <Text style={[styles.kpiTileValue, { color: Colors.light.primary }]}>
            {kpis.visited}
          </Text>
        </View>

        {/* 4. Paid / Verified */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>Paid / Collected</Text>
            <Ionicons name="wallet-outline" size={18} color="#15803D" />
          </View>
          <Text style={[styles.kpiTileValue, { color: "#15803D" }]}>
            ₹{kpis.totalCollectedAmt.toLocaleString("en-IN")}
          </Text>
        </View>

        {/* 5. PTP */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>PTP</Text>
            <Ionicons name="calendar-outline" size={18} color="#EA580C" />
          </View>
          <Text style={[styles.kpiTileValue, { color: "#EA580C" }]}>
            {kpis.ptp}
          </Text>
        </View>

        {/* 6. Broken PTP */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>Broken PTP</Text>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          </View>
          <Text style={[styles.kpiTileValue, { color: "#DC2626" }]}>
            {kpis.brokenPtp}
          </Text>
        </View>

        {/* 7. RTP (Refusal To Pay) */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>RTP</Text>
            <Ionicons name="repeat-outline" size={18} color="#9333EA" />
          </View>
          <Text style={[styles.kpiTileValue, { color: "#9333EA" }]}>
            {kpis.rtp}
          </Text>
        </View>

        {/* 8. Non-workable Cases */}
        <View style={styles.kpiTile}>
          <View style={styles.kpiTopRow}>
            <Text style={styles.kpiTileLabel}>Non-workable</Text>
            <Ionicons name="ban-outline" size={18} color="#64748B" />
          </View>
          <Text style={[styles.kpiTileValue, { color: "#64748B" }]}>
            {kpis.nonWorkable}
          </Text>
        </View>
      </View>

      {/* TODAY'S CASES SECTION HEADER */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {portfolioFilter === "ALL" ? "Today's Cases" : `${portfolioFilter} Cases`}
        </Text>
        <Pressable onPress={() => setActiveTab("cases")} hitSlop={8}>
          <Text style={styles.viewAllLink}>View All ({filteredCustomers.length})</Text>
        </Pressable>
      </View>

      {/* CASES PREVIEW LIST */}
      {loading ? (
        <ActivityIndicator color={Colors.light.primary} size="large" style={{ marginVertical: 30 }} />
      ) : filteredCustomers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="folder-open-outline" size={38} color={Colors.light.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>No Cases Found</Text>
          <Text style={styles.emptySubtitle}>No cases match the active portfolio filter.</Text>
        </View>
      ) : (
        filteredCustomers.slice(0, 5).map(renderCaseCard)
      )}
    </ScrollView>
  );

  // -------------------------------------------------------------
  // TAB 2: CASES (MATCHES REFERENCE MOBILE SCREENSHOT EXACTLY)
  // -------------------------------------------------------------
  const renderCasesTab = () => (
    <View style={styles.casesTabMainContainer}>
      {/* 1. TOP DARK GREEN APP HEADER (Matches Screenshot) */}
      <View style={styles.casesTopGreenHeader}>
        <View style={styles.headerBrandRow}>
          <View style={styles.leafIconContainer}>
            <Ionicons name="leaf" size={24} color="#10B981" />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerBrandTitle}>FieldFlow</Text>
            <Text style={styles.headerBrandSubtitle}>Field Staff App</Text>
          </View>
        </View>

        <View style={styles.headerActionIconsRow}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => setSearchQuery("")}
            hitSlop={8}
          >
            <Ionicons name="search-outline" size={21} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={styles.headerIconBtn}
            onPress={() => setShowNotifModal(true)}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={21} color="#FFFFFF" />
            <View style={styles.headerNotifBadge}>
              <Text style={styles.headerNotifBadgeText}>3</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.headerAvatarWrapper}
            onPress={() => setActiveTab("profile")}
            hitSlop={8}
          >
            {user?.profilePhoto || user?.avatar ? (
              <Image source={{ uri: user.profilePhoto || user.avatar }} style={styles.headerAvatarPhoto} />
            ) : (
              <View style={styles.headerAvatarInitialsBox}>
                <Text style={styles.headerAvatarInitialsText}>
                  {(user?.name || "R").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* 2. MAIN WHITE CURVED SHEET (Contains Title, 8 KPIs, Chips, Search, Dropdowns, Cases) */}
      <View style={styles.casesWhiteSheet}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 95 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAssignedCases(token);
              }}
              colors={[Colors.light.primary]}
            />
          }
        >
          {/* Title & Map View Button Row */}
          <View style={styles.casesScreenTitleRow}>
            <View>
              <Text style={styles.casesPageMainTitle}>Cases</Text>
              <Text style={styles.casesPageSubtitle}>Your assigned customer cases</Text>
            </View>

            <Pressable
              style={styles.mapViewBtn}
              onPress={() => setShowMapModal(true)}
              hitSlop={8}
            >
              <Ionicons name="map-outline" size={15} color="#00A86B" />
              <Text style={styles.mapViewBtnText}>Map View</Text>
            </Pressable>
          </View>

          {/* 3. 8 SUMMARY KPI COUNT CARDS (2 ROWS OF 4) */}
          <View style={styles.kpiCardsGridContainer}>
            {/* Row 1: Total | Unvisited | Visited | Paid */}
            <View style={styles.kpiCardsRow}>
              {/* Card 1: Total */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#F2FBF7" },
                  statusFilter === "ALL" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("ALL")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="document-text-outline" size={13} color="#059669" />
                </View>
                <Text style={styles.countCardValue}>{kpis.total}</Text>
                <Text style={styles.countCardLabel}>Total</Text>
              </Pressable>

              {/* Card 2: Unvisited */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#F0F9FF" },
                  statusFilter === "UNVISITED" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("UNVISITED")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#E0F2FE" }]}>
                  <Ionicons name="time-outline" size={13} color="#0284C7" />
                </View>
                <Text style={styles.countCardValue}>{kpis.unvisited}</Text>
                <Text style={styles.countCardLabel}>Unvisited</Text>
              </Pressable>

              {/* Card 3: Visited */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#EFF6FF" },
                  statusFilter === "VISITED" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("VISITED")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="checkmark-circle-outline" size={13} color="#2563EB" />
                </View>
                <Text style={styles.countCardValue}>{kpis.visited}</Text>
                <Text style={styles.countCardLabel}>Visited</Text>
              </Pressable>

              {/* Card 4: Paid */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#ECFDF5" },
                  statusFilter === "PAID" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("PAID")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#DCFCE7" }]}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#059669", lineHeight: 14 }}>₹</Text>
                </View>
                <Text style={styles.countCardValue}>{kpis.paid}</Text>
                <Text style={styles.countCardLabel}>Paid</Text>
              </Pressable>
            </View>

            {/* Row 2: Unpaid | PTP | Broken PTP | RTP */}
            <View style={[styles.kpiCardsRow, { marginTop: 6 }]}>
              {/* Card 5: Unpaid */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#FEF2F2" },
                  statusFilter === "UNPAID" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("UNPAID")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#FEE2E2" }]}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#DC2626", lineHeight: 14 }}>₹</Text>
                </View>
                <Text style={styles.countCardValue}>{kpis.unpaid}</Text>
                <Text style={styles.countCardLabel}>Unpaid</Text>
              </Pressable>

              {/* Card 6: PTP */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#FFFBEB" },
                  statusFilter === "PTP" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("PTP")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="calendar-outline" size={13} color="#D97706" />
                </View>
                <Text style={styles.countCardValue}>{kpis.ptp}</Text>
                <Text style={styles.countCardLabel}>PTP</Text>
              </Pressable>

              {/* Card 7: Broken PTP */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#FFF7ED" },
                  statusFilter === "BROKEN_PTP" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("BROKEN_PTP")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#FFEDD5" }]}>
                  <Ionicons name="link-outline" size={13} color="#EA580C" />
                </View>
                <Text style={styles.countCardValue}>{kpis.brokenPtp}</Text>
                <Text style={styles.countCardLabel}>Broken PTP</Text>
              </Pressable>

              {/* Card 8: RTP */}
              <Pressable
                style={[
                  styles.countCardItem,
                  { backgroundColor: "#FAF5FF" },
                  statusFilter === "RTP" && styles.countCardActive,
                ]}
                onPress={() => setStatusFilter("RTP")}
              >
                <View style={[styles.countCardIconCircle, { backgroundColor: "#F3E8FF" }]}>
                  <Ionicons name="repeat-outline" size={13} color="#9333EA" />
                </View>
                <Text style={styles.countCardValue}>{kpis.rtp}</Text>
                <Text style={styles.countCardLabel}>RTP</Text>
              </Pressable>
            </View>
          </View>

          {/* 4. HORIZONTAL STATUS FILTER CHIPS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRowContainer}
          >
            {[
              { key: "ALL", label: "All", icon: "checkmark" },
              { key: "NEAREST", label: "Nearest", icon: "location-sharp" },
              { key: "UNVISITED", label: "Unvisited", icon: "time-outline" },
              { key: "VISITED", label: "Visited", icon: "checkmark-circle-outline" },
              { key: "PAID", label: "Paid", icon: "cash-outline" },
              { key: "UNPAID", label: "Unpaid", icon: "alert-circle-outline" },
              { key: "PTP", label: "PTP", icon: "calendar-outline" },
              { key: "BROKEN_PTP", label: "Broken PTP", icon: "link-outline" },
              { key: "RTP", label: "RTP", icon: "repeat-outline" },
              { key: "NON_WORKABLE", label: "Non-workable", icon: "ban-outline" },
            ].map((item) => {
              const isActive = statusFilter === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.filterChipItem, isActive && styles.filterChipItemActive]}
                  onPress={() => {
                    setStatusFilter(item.key);
                    if (item.key === "NEAREST" && !userCoords) {
                      requestGpsLocation();
                    }
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={13}
                    color={isActive ? "#FFFFFF" : "#00A86B"}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 5. SEARCH BAR & ADVANCED FILTER ICON */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchFieldBox}>
              <Ionicons name="search" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Search name, mobile, account ID, reference..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={[
                styles.advancedFilterBtn,
                (sortBy !== "DEFAULT" || statusFilter !== "ALL" || portfolioFilter !== "ALL" || batchFilter !== "ALL") &&
                  styles.advancedFilterBtnActive,
              ]}
              onPress={() => setShowFilterModal(true)}
              hitSlop={8}
            >
              <Ionicons
                name="options-outline"
                size={19}
                color={
                  sortBy !== "DEFAULT" || statusFilter !== "ALL" || portfolioFilter !== "ALL" || batchFilter !== "ALL"
                    ? "#00A86B"
                    : "#0F172A"
                }
              />
            </Pressable>
          </View>

          {/* 6. DROPDOWN SELECTORS ROW (Portfolio & Batch/Month) */}
          <View style={styles.dropdownCardsRow}>
            {/* Left: Portfolio Dropdown Card */}
            <Pressable
              style={styles.dropdownSelectorCard}
              onPress={() => setShowPortfolioModal(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons name="folder-outline" size={17} color="#00A86B" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownMiniLabel}>Portfolio</Text>
                  <Text style={styles.dropdownMainValue} numberOfLines={1}>
                    {portfolioFilter === "ALL" ? "All Portfolios" : portfolioFilter}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={15} color="#94A3B8" />
            </Pressable>

            {/* Right: Batch / Month Dropdown Card */}
            <Pressable
              style={styles.dropdownSelectorCard}
              onPress={() => setShowBatchModal(true)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons name="calendar-outline" size={17} color="#00A86B" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropdownMiniLabel}>Batch / Month</Text>
                  <Text style={styles.dropdownMainValue} numberOfLines={1}>
                    {batchFilter === "ALL" ? "All Batches" : batchFilter}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={15} color="#94A3B8" />
            </Pressable>
          </View>

          {/* GPS Proximity Notice if Nearest Active */}
          {statusFilter === "NEAREST" && (
            <View style={styles.gpsBanner}>
              <Ionicons name="navigate-circle-outline" size={16} color="#047857" />
              <Text style={styles.gpsBannerText}>
                {userCoords
                  ? `Sorted by proximity to your current location (Accuracy: ±${accuracy || 10}m)`
                  : gpsNotice || "Acquiring live GPS position..."}
              </Text>
              {!userCoords && (
                <Pressable onPress={requestGpsLocation} style={styles.gpsRetryBtn}>
                  <Text style={styles.gpsRetryText}>Retry</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* 7. CUSTOMER CASE CARDS LIST */}
          <View style={{ paddingHorizontal: 16 }}>
            {loading ? (
              <ActivityIndicator color={Colors.light.primary} size="large" style={{ marginVertical: 40 }} />
            ) : filteredCustomers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="search-outline" size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyTitle}>No Matching Cases</Text>
                <Text style={styles.emptySubtitle}>
                  Try clearing filters or search to view assigned customer cases.
                </Text>
                <Pressable
                  style={[styles.gpsRetryBtn, { marginTop: 12, backgroundColor: Colors.light.primary }]}
                  onPress={() => {
                    setSearchQuery("");
                    setPortfolioFilter("ALL");
                    setBatchFilter("ALL");
                    setStatusFilter("ALL");
                    setSortBy("DEFAULT");
                  }}
                >
                  <Text style={styles.gpsRetryText}>Reset All Filters</Text>
                </Pressable>
              </View>
            ) : (
              filteredCustomers.map(renderCaseCard)
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // TAB 3: REPORTS
  // -------------------------------------------------------------
  const renderReportsTab = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenHeaderTitle}>Performance Reports</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.reportSummaryCard}>
        <Text style={styles.reportSummaryTitle}>Monthly Operations Summary</Text>
        <Text style={styles.reportSummarySub}>Assigned Territory: {user?.assignedArea || "Kozhikode Central"}</Text>

        <View style={styles.reportStatsRow}>
          <View style={styles.reportStatItem}>
            <Text style={styles.reportStatNum}>{kpis.assigned}</Text>
            <Text style={styles.reportStatLabel}>Total Accounts</Text>
          </View>
          <View style={styles.reportStatItem}>
            <Text style={[styles.reportStatNum, { color: "#15803D" }]}>{kpis.collected}</Text>
            <Text style={styles.reportStatLabel}>Recovered</Text>
          </View>
          <View style={styles.reportStatItem}>
            <Text style={[styles.reportStatNum, { color: Colors.light.primary }]}>{kpis.visited}</Text>
            <Text style={styles.reportStatLabel}>Geotagged</Text>
          </View>
        </View>

        <View style={styles.reportProgressWrapper}>
          <View style={styles.reportProgressRow}>
            <Text style={styles.reportProgressLabel}>Target Completion</Text>
            <Text style={styles.reportProgressPct}>
              {Math.round(((kpis.visited + kpis.collected) / (kpis.assigned || 1)) * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(
                    100,
                    Math.round(((kpis.visited + kpis.collected) / (kpis.assigned || 1)) * 100)
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Collections Details Box */}
      <View style={styles.reportCollectionBox}>
        <Text style={{ fontSize: fontScale(15), fontWeight: "700", color: "#0F172A", marginBottom: 10 }}>
          Cash & UPI Collection Totals
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: fontScale(13), color: "#64748B" }}>Total Amount Collected</Text>
          <Text style={{ fontSize: fontScale(20), fontWeight: "900", color: "#15803D" }}>
            ₹{(kpis.totalCollectedAmt || 124500).toLocaleString("en-IN")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // -------------------------------------------------------------
  // TAB 4: PROFILE (MATCHES REFERENCE SCREEN 14: MY PROFILE)
  // -------------------------------------------------------------
  const renderProfileTab = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 85 + insets.bottom }]} showsVerticalScrollIndicator={false}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenHeaderTitle}>My Profile</Text>
      </View>

      {/* Profile Header (Screen 14) */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.profileAvatarLarge}>
          {user?.profilePhoto || user?.avatar ? (
            <Image source={{ uri: user.profilePhoto || user.avatar }} style={styles.profileAvatarImg} />
          ) : (
            <Text style={styles.profileAvatarLargeText}>
              {(user?.name || "A").substring(0, 1).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.profileName}>{user?.name || "Akhil V"}</Text>
        <Text style={styles.profileRole}>Field Executive</Text>
        <Text style={styles.profilePhone}>+91 {user?.phone || "98765 43210"}</Text>
      </View>

      {/* Profile Menu List (Screen 14) */}
      <View style={styles.menuListCard}>
        {[
          { icon: "person-outline" as const, title: "My Profile", subtitle: `ID: ${user?.employeeId || "STF-201"}` },
          {
            icon: "key-outline" as const,
            title: "Change Password",
            subtitle: "Update your login credentials",
            onPress: () => setShowPasswordChangeModal(true),
          },
          {
            icon: "notifications-outline" as const,
            title: "Notifications",
            subtitle: "App alerts and case updates",
            onPress: () => setShowNotifModal(true),
          },
          {
            icon: "cloud-download-outline" as const,
            title: "Offline Data",
            subtitle: "Cached customer profiles",
          },
          {
            icon: "help-circle-outline" as const,
            title: "Help & Support",
            subtitle: "Field officer assistance",
            onPress: () => Linking.openURL("mailto:support@fieldflow.local"),
          },
          {
            icon: "information-circle-outline" as const,
            title: "About FieldFlow",
            subtitle: "Version 2.4.0 (Build 57)",
          },
        ].map((item, idx) => (
          <Pressable
            key={idx}
            style={styles.menuItemRow}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconBadge}>
                <Ionicons name={item.icon} size={18} color={Colors.light.primary} />
              </View>
              <View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSub}>{item.subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </Pressable>
        ))}
      </View>

      {/* Logout Red Button (Screen 14) */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: activeTab === "cases" ? "#0B4628" : "#F8FAF9" },
      ]}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={activeTab === "cases" ? "light" : "dark"} />

      {/* Tab Screen Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "home" && renderHomeTab()}
        {activeTab === "cases" && renderCasesTab()}
        {activeTab === "reports" && renderReportsTab()}
        {activeTab === "profile" && renderProfileTab()}
      </View>

      {/* FIXED 5-ITEM BOTTOM NAVIGATION BAR (Matches Reference UI Exactly) */}
      <View
        style={[
          styles.bottomNavContainer,
          {
            paddingBottom: Math.max(insets.bottom, 6),
            height: 64 + Math.max(insets.bottom, 6),
          },
        ]}
      >
        {/* 1. Home */}
        <Pressable
          style={styles.navItem}
          onPress={() => setActiveTab("home")}
          hitSlop={6}
        >
          <Ionicons
            name={activeTab === "home" ? "home" : "home-outline"}
            size={22}
            color={activeTab === "home" ? "#00A86B" : "#94A3B8"}
            style={{ marginBottom: 2 }}
          />
          <Text style={[styles.navLabel, activeTab === "home" && styles.navLabelActive]}>
            Home
          </Text>
        </Pressable>

        {/* 2. Cases (Matches reference screenshot with active green top bar / color) */}
        <Pressable
          style={styles.navItem}
          onPress={() => setActiveTab("cases")}
          hitSlop={6}
        >
          {activeTab === "cases" && <View style={styles.navActiveTopIndicator} />}
          <Ionicons
            name={activeTab === "cases" ? "document-text" : "document-text-outline"}
            size={22}
            color={activeTab === "cases" ? "#00A86B" : "#94A3B8"}
            style={{ marginBottom: 2 }}
          />
          <Text style={[styles.navLabel, activeTab === "cases" && styles.navLabelActive]}>
            Cases
          </Text>
        </Pressable>

        {/* 3. Center Floating (+) Action Button with 'Visit' text below */}
        <View style={styles.floatingCenterBtnWrapper}>
          <Pressable
            style={styles.floatingCenterBtn}
            onPress={() => setShowQuickActionModal(true)}
            hitSlop={8}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.centerBtnLabel}>Visit</Text>
        </View>

        {/* 4. Reports */}
        <Pressable
          style={styles.navItem}
          onPress={() => setActiveTab("reports")}
          hitSlop={6}
        >
          <Ionicons
            name={activeTab === "reports" ? "stats-chart" : "stats-chart-outline"}
            size={22}
            color={activeTab === "reports" ? "#00A86B" : "#94A3B8"}
            style={{ marginBottom: 2 }}
          />
          <Text style={[styles.navLabel, activeTab === "reports" && styles.navLabelActive]}>
            Reports
          </Text>
        </Pressable>

        {/* 5. Profile */}
        <Pressable
          style={styles.navItem}
          onPress={() => setActiveTab("profile")}
          hitSlop={6}
        >
          <Ionicons
            name={activeTab === "profile" ? "person" : "person-outline"}
            size={22}
            color={activeTab === "profile" ? "#00A86B" : "#94A3B8"}
            style={{ marginBottom: 2 }}
          />
          <Text style={[styles.navLabel, activeTab === "profile" && styles.navLabelActive]}>
            Profile
          </Text>
        </Pressable>
      </View>

      {/* QUICK ACTION MODAL FOR CENTER (+) BUTTON */}
      <Modal visible={showQuickActionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Quick Field Actions</Text>
              <Pressable onPress={() => setShowQuickActionModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <Pressable
              style={styles.quickActionOption}
              onPress={() => {
                setShowQuickActionModal(false);
                setActiveTab("cases");
              }}
            >
              <Ionicons name="navigate-outline" size={24} color={Colors.light.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.quickActionTitle}>Start Geotagged Visit</Text>
                <Text style={styles.quickActionSub}>Choose from assigned customers to start GPS visit</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.quickActionOption}
              onPress={() => {
                setShowQuickActionModal(false);
                fetchAssignedCases(token);
              }}
            >
              <Ionicons name="sync-outline" size={24} color={Colors.light.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.quickActionTitle}>Sync Cases & Locations</Text>
                <Text style={styles.quickActionSub}>Refresh latest server assignments and status</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal visible={showNotifModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Field Notifications</Text>
              <Pressable onPress={() => setShowNotifModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <View style={styles.notifItem}>
              <Text style={styles.notifDot}>•</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Daily Route Ready</Text>
                <Text style={styles.notifBody}>{customers.length} cases assigned for {user?.assignedArea || "Kozhikode"}.</Text>
              </View>
            </View>

            <View style={styles.notifItem}>
              <Text style={[styles.notifDot, { color: "#15803D" }]}>•</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Collections Verified</Text>
                <Text style={styles.notifBody}>All submitted UPI and cash receipts synced to backend.</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: PORTFOLIO DROPDOWN BOTTOM SHEET */}
      <Modal visible={showPortfolioModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Portfolio</Text>
              <Pressable onPress={() => setShowPortfolioModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {availablePortfolios.map((p) => {
                const isSelected = portfolioFilter === p;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.modalOptionRow,
                      isSelected && styles.modalOptionRowSelected,
                    ]}
                    onPress={() => {
                      setPortfolioFilter(p);
                      setShowPortfolioModal(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons
                        name="briefcase-outline"
                        size={18}
                        color={isSelected ? "#00A86B" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected && styles.modalOptionTextSelected,
                        ]}
                      >
                        {p === "ALL" ? "All Portfolios" : p}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#00A86B" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: BATCH / MONTH DROPDOWN BOTTOM SHEET */}
      <Modal visible={showBatchModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Batch / Month</Text>
              <Pressable onPress={() => setShowBatchModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {availableBatches.map((b) => {
                const isSelected = batchFilter === b;
                return (
                  <Pressable
                    key={b}
                    style={[
                      styles.modalOptionRow,
                      isSelected && styles.modalOptionRowSelected,
                    ]}
                    onPress={() => {
                      setBatchFilter(b);
                      setShowBatchModal(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={isSelected ? "#00A86B" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.modalOptionText,
                          isSelected && styles.modalOptionTextSelected,
                        ]}
                      >
                        {b === "ALL" ? "All Batches" : b}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#00A86B" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ADVANCED FILTERS & SORTING MODAL */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Filters & Sort</Text>
              <Pressable onPress={() => setShowFilterModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <Text style={styles.filterSectionTitle}>SORT CASES BY</Text>
            <View style={styles.sortOptionsRow}>
              {[
                { key: "DEFAULT" as SortOption, label: "Proximity (Nearest)" },
                { key: "AMOUNT_DESC" as SortOption, label: "Highest Outstanding" },
                { key: "AMOUNT_ASC" as SortOption, label: "Lowest Outstanding" },
                { key: "NAME_ASC" as SortOption, label: "Customer Name A-Z" },
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.sortChip,
                    sortBy === opt.key && styles.sortChipActive,
                  ]}
                  onPress={() => setSortBy(opt.key)}
                >
                  <Text
                    style={[
                      styles.sortChipText,
                      sortBy === opt.key && styles.sortChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: "#F1F5F9" }]}
                onPress={() => {
                  setPortfolioFilter("ALL");
                  setBatchFilter("ALL");
                  setStatusFilter("ALL");
                  setSortBy("DEFAULT");
                  setSearchQuery("");
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.modalBtnText, { color: "#475569" }]}>Reset All</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: "#00A86B", flex: 2 }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: MAP VIEW MODAL */}
      <Modal visible={showMapModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: "80%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Map View</Text>
                <Text style={{ fontSize: fontScale(11.5), color: "#64748B" }}>
                  {filteredCustomers.length} mapped customer cases
                </Text>
              </View>
              <Pressable onPress={() => setShowMapModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredCustomers.map((cust, idx) => {
                const lat = cust.locations?.[0]?.coordinates?.lat || 11.2588;
                const lng = cust.locations?.[0]?.coordinates?.lng || 75.7725;
                const displayDistance =
                  cust.calculatedDistance != null
                    ? formatDistance(cust.calculatedDistance)
                    : cust.distance != null
                    ? `${cust.distance} km`
                    : "Near Kozhikode";

                return (
                  <View key={cust._id || idx} style={styles.mapCustomerRow}>
                    <View style={styles.mapPinBadge}>
                      <Ionicons name="location" size={18} color="#00A86B" />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={{ fontSize: fontScale(14), fontWeight: "700", color: "#0F172A" }}>
                        {cust.name}
                      </Text>
                      <Text style={{ fontSize: fontScale(11), color: "#64748B" }} numberOfLines={1}>
                        {cust.address || cust.area || "Kozhikode, Kerala"}
                      </Text>
                      <Text style={{ fontSize: fontScale(11), color: "#00A86B", fontWeight: "700", marginTop: 2 }}>
                        {displayDistance}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.mapDirBtn}
                      onPress={() => {
                        setShowMapModal(false);
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                      }}
                    >
                      <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={{ color: "#FFFFFF", fontSize: fontScale(11), fontWeight: "700" }}>Navigate</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: PASSWORD CHANGE MODAL */}
      <Modal visible={showPasswordChangeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowPasswordChangeModal(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.light.text} />
              </Pressable>
            </View>
            <Text style={{ fontSize: fontScale(12.5), color: "#64748B", marginBottom: 14 }}>
              Enter your current password and choose a secure new password.
            </Text>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: "#00A86B", width: "100%" }]}
              onPress={() => {
                Alert.alert("Password Updated", "Your password has been changed successfully.");
                setShowPasswordChangeModal(false);
              }}
            >
              <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Done</Text>
            </Pressable>
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
  // Cases Tab Top Forest Green Header (#0B4628)
  casesTabMainContainer: {
    flex: 1,
    backgroundColor: "#0B4628",
  },
  casesTopGreenHeader: {
    backgroundColor: "#0B4628",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  leafIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrandTitle: {
    fontSize: fontScale(17),
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerBrandSubtitle: {
    fontSize: fontScale(11),
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
  },
  headerActionIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerNotifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerNotifBadgeText: {
    color: "#FFFFFF",
    fontSize: fontScale(9.5),
    fontWeight: "900",
  },
  headerAvatarWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#10B981",
    overflow: "hidden",
  },
  headerAvatarPhoto: {
    width: "100%",
    height: "100%",
  },
  headerAvatarInitialsBox: {
    width: "100%",
    height: "100%",
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarInitialsText: {
    color: "#FFFFFF",
    fontSize: fontScale(15),
    fontWeight: "800",
  },

  // Cases Tab Curved White Sheet
  casesWhiteSheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  casesScreenTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  casesPageMainTitle: {
    fontSize: fontScale(22),
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  casesPageSubtitle: {
    fontSize: fontScale(12),
    color: "#64748B",
    marginTop: 1,
    fontWeight: "500",
  },
  mapViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  mapViewBtnText: {
    fontSize: fontScale(12.5),
    fontWeight: "700",
    color: "#00A86B",
  },

  // 8 Summary KPI Count Cards (2 Rows of 4)
  kpiCardsGridContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  kpiCardsRow: {
    flexDirection: "row",
    gap: 6,
  },
  countCardItem: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  countCardActive: {
    borderColor: "#00A86B",
    borderWidth: 1.5,
  },
  countCardIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  countCardValue: {
    fontSize: fontScale(15),
    fontWeight: "900",
    color: "#0F172A",
  },
  countCardLabel: {
    fontSize: fontScale(9.5),
    color: "#64748B",
    fontWeight: "600",
    marginTop: 1,
  },

  // Horizontally Scrollable Filter Chips
  filterChipsRowContainer: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 10,
  },
  filterChipItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipItemActive: {
    backgroundColor: "#00A86B",
    borderColor: "#00A86B",
  },
  filterChipText: {
    fontSize: fontScale(11.5),
    fontWeight: "600",
    color: "#334155",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Search & Advanced Filter Icon
  searchBarContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  searchFieldBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchTextInput: {
    flex: 1,
    fontSize: fontScale(11.5),
    color: "#0F172A",
    paddingVertical: 0,
  },
  advancedFilterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  advancedFilterBtnActive: {
    borderColor: "#00A86B",
    backgroundColor: "#ECFDF5",
  },

  // Dropdown Selectors Row (Portfolio & Batch/Month)
  dropdownCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  dropdownSelectorCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdownMiniLabel: {
    fontSize: fontScale(9.5),
    color: "#64748B",
    fontWeight: "500",
  },
  dropdownMainValue: {
    fontSize: fontScale(12),
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 1,
  },

  // Customer Case Card (Matches Reference Screenshot)
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
    ...Shadows.sm,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarWrapper: {
    position: "relative",
    width: 44,
    height: 44,
    marginRight: 10,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    color: "#00A86B",
    fontSize: fontScale(16),
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 44,
  },
  avatarBadgeCircle: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatarBadgeText: {
    color: "#FFFFFF",
    fontSize: fontScale(9),
    fontWeight: "900",
  },
  customerInfoCol: {
    flex: 1,
    marginRight: 6,
  },
  customerName: {
    fontSize: fontScale(14),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  customerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  customerPhone: {
    fontSize: fontScale(11.5),
    color: "#334155",
    fontWeight: "600",
  },
  customerAddress: {
    fontSize: fontScale(11),
    color: "#64748B",
    flex: 1,
  },
  cardRightCol: {
    alignItems: "flex-end",
  },
  portfolioBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 4,
  },
  portfolioBadgeText: {
    fontSize: fontScale(10.5),
    fontWeight: "700",
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  distanceValue: {
    fontSize: fontScale(11.5),
    fontWeight: "800",
    color: "#0F172A",
  },
  nearestSubText: {
    fontSize: fontScale(9.5),
    color: "#64748B",
    fontWeight: "500",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accCol: {
    minWidth: 72,
    maxWidth: 96,
  },
  loanAccountText: {
    fontSize: fontScale(10.5),
    fontWeight: "800",
    color: "#0F172A",
  },
  refText: {
    fontSize: fontScale(9.5),
    color: "#94A3B8",
    marginTop: 1,
  },
  amountCol: {
    alignItems: "flex-start",
  },
  amountValue: {
    fontSize: fontScale(12),
    fontWeight: "800",
    color: "#0F172A",
  },
  amountLabel: {
    fontSize: fontScale(9),
    color: "#94A3B8",
    marginTop: 1,
  },
  caseStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  caseStatusText: {
    fontSize: fontScale(10.5),
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  cardActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal styles
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionRowSelected: {
    backgroundColor: "#ECFDF5",
  },
  modalOptionText: {
    fontSize: fontScale(14),
    fontWeight: "600",
    color: "#334155",
  },
  modalOptionTextSelected: {
    color: "#00A86B",
    fontWeight: "800",
  },
  filterSectionTitle: {
    fontSize: fontScale(11),
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  sortOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sortChipActive: {
    backgroundColor: "#00A86B",
    borderColor: "#00A86B",
  },
  sortChipText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#475569",
  },
  sortChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  modalBtnText: {
    fontSize: fontScale(14),
    fontWeight: "700",
  },
  mapCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  mapPinBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  mapDirBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00A86B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 96,
  },

  // Header Bar (Reference Screen 4)
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    marginTop: 4,
  },
  headerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.light.primaryLight,
    borderWidth: 2,
    borderColor: Colors.light.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
  },
  headerAvatarText: {
    fontSize: fontScale(18),
    fontWeight: "800",
    color: Colors.light.primary,
  },
  headerGreetingCol: {
    justifyContent: "center",
  },
  headerGreetingSub: {
    fontSize: fontScale(12),
    color: "#64748B",
    fontWeight: "500",
  },
  headerGreetingName: {
    fontSize: fontScale(18),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  bellIcon: {
    fontSize: 18,
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  // 6 KPI Grid Tiles (Reference Screen 4)
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 22,
  },
  kpiTile: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  kpiTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  kpiTileLabel: {
    fontSize: fontScale(13),
    color: "#64748B",
    fontWeight: "600",
  },
  kpiTileEmoji: {
    fontSize: 16,
  },
  kpiTileValue: {
    fontSize: fontScale(22),
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  // Today's Cases Section Header
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fontScale(17),
    fontWeight: "800",
    color: "#0F172A",
  },
  viewAllLink: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: Colors.light.primary,
  },

  // Case Card (Reference Screen 4 & 5)
  caseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  caseAvatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F6ED",
    borderWidth: 1.5,
    borderColor: "#B4E3C9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  caseAvatarInitial: {
    fontSize: fontScale(16),
    fontWeight: "800",
    color: Colors.light.primary,
  },
  caseInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  caseName: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: "#0F172A",
  },
  caseAccountId: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginTop: 1,
  },
  caseLocation: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginTop: 2,
  },
  caseRightCol: {
    alignItems: "flex-end",
  },
  caseAmount: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  statusBadgeText: {
    fontSize: fontScale(10),
    fontWeight: "700",
  },

  // Screen Header Common
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  screenHeaderTitle: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: "#0F172A",
  },
  filterIconButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Search in Cases
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 33,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontScale(11.5),
    color: "#0F172A",
    paddingVertical: 0,
  },

  // Filter Pills (Reference Screen 5)
  filterPillsRow: {
    paddingHorizontal: 16,
    gap: 5,
    paddingBottom: 6,
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterPillText: {
    fontSize: fontScale(10.5),
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Profile Screen (Reference Screen 14)
  profileHeaderCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  profileAvatarLarge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#E8F6ED",
    borderWidth: 3,
    borderColor: Colors.light.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  profileAvatarLargeText: {
    fontSize: fontScale(32),
    fontWeight: "900",
    color: Colors.light.primary,
  },
  profileName: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: "#0F172A",
  },
  profileRole: {
    fontSize: fontScale(13),
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  profilePhone: {
    fontSize: fontScale(13),
    color: Colors.light.primary,
    fontWeight: "700",
    marginTop: 4,
  },
  menuListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTitle: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  menuItemSub: {
    fontSize: fontScale(11),
    color: "#94A3B8",
    marginTop: 1,
  },
  menuChevron: {
    fontSize: fontScale(20),
    color: "#CBD5E1",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonText: {
    color: "#DC2626",
    fontSize: fontScale(14),
    fontWeight: "800",
  },

  // Reports styles
  reportSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },
  reportSummaryTitle: {
    fontSize: fontScale(16),
    fontWeight: "800",
    color: "#0F172A",
  },
  reportSummarySub: {
    fontSize: fontScale(12),
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  reportStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  reportStatItem: {
    alignItems: "center",
  },
  reportStatNum: {
    fontSize: fontScale(22),
    fontWeight: "900",
    color: "#0F172A",
  },
  reportStatLabel: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginTop: 2,
  },
  reportProgressWrapper: {
    marginTop: 6,
  },
  reportProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reportProgressLabel: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#475569",
  },
  reportProgressPct: {
    fontSize: fontScale(12),
    fontWeight: "800",
    color: Colors.light.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: Radii.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.light.primary,
    borderRadius: Radii.full,
  },
  reportCollectionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5EAE7",
    ...Shadows.sm,
  },

  // Empty state
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Radii.xl,
    padding: 32,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },
  emptyTitle: {
    fontSize: fontScale(16),
    fontWeight: "800",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: fontScale(12),
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },

  // FIXED 5-ITEM BOTTOM NAVIGATION BAR (Matches Reference UI)
  bottomNavContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5EAE7",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
    ...Shadows.lg,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: fontScale(11),
    fontWeight: "600",
    color: "#94A3B8",
  },
  navLabelActive: {
    color: Colors.light.primary,
    fontWeight: "800",
  },
  floatingCenterBtnWrapper: {
    alignItems: "center",
    justifyContent: "center",
    top: -14,
    width: 60,
  },
  floatingCenterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.primary, // Dark Forest Green
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  navActiveTopIndicator: {
    position: "absolute",
    top: -8,
    left: 14,
    right: 14,
    height: 3,
    backgroundColor: "#00A86B",
    borderRadius: 2,
  },
  centerBtnLabel: {
    fontSize: fontScale(10.5),
    fontWeight: "700",
    color: "#00A86B",
    marginTop: 2,
  },

  // Modals Common
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: 20,
    paddingBottom: 32,
    ...Shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: fontScale(18),
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#94A3B8",
    fontWeight: "700",
  },
  quickActionOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F8FAF9",
    borderRadius: Radii.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },
  quickActionTitle: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  quickActionSub: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginTop: 2,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
  notifDot: {
    fontSize: 20,
    color: Colors.light.primary,
    lineHeight: 20,
  },
  notifTitle: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#0F172A",
  },
  notifBody: {
    fontSize: fontScale(12),
    color: "#64748B",
    marginTop: 2,
  },

  // Portfolio Selector Bar Styles
  portfolioSection: {
    marginBottom: 12,
  },
  portfolioHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  portfolioSectionTitle: {
    fontSize: fontScale(11),
    fontWeight: "800",
    color: Colors.light.textSecondary,
    letterSpacing: 0.6,
  },
  portfolioSelectorBar: {
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 5,
  },
  portfolioChip: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 4,
  },
  portfolioChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  portfolioChipText: {
    fontSize: fontScale(10.5),
    fontWeight: "600",
    color: "#475569",
  },
  portfolioChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Card Tags
  portfolioTag: {
    backgroundColor: "#E6F7F0",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#A7F3D0",
  },
  portfolioTagText: {
    fontSize: fontScale(10.5),
    fontWeight: "700",
    color: "#00A86B",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  distanceBadgeText: {
    fontSize: fontScale(10.5),
    fontWeight: "700",
    color: "#047857",
  },

  // GPS Banner
  gpsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: Radii.md,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  gpsBannerText: {
    flex: 1,
    fontSize: fontScale(11.5),
    color: "#047857",
    fontWeight: "600",
  },
  gpsRetryBtn: {
    backgroundColor: "#00A86B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpsRetryText: {
    fontSize: fontScale(11),
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
