import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "../config/api";
import { getAuthSession } from "../utils/storage";
import { Colors, Spacing, Radii, Shadows } from "../constants/theme";

export default function ExploreActivityScreen() {
  const router = useRouter();
  const theme = Colors.light;

  const [token, setToken] = useState("");
  const [user, setUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const session = await getAuthSession();
      if (!session.token) {
        router.replace("/");
        return;
      }
      setToken(session.token);
      setUser(session.user);

      const res = await fetch(`${API_BASE_URL}/customers/assigned`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } catch {
      // Ignore network warning
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const visitedCases = customers.filter(
    (c) => c.status === "visited" || c.status === "collected" || c.status === "ptp"
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backBtnText}>← Dashboard</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Field Activity & Audit Feed</Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={theme.primary}
          />
        }
      >
        {/* SUMMARY HERO */}
        <View style={styles.heroCard}>
          <Text style={styles.heroSub}>FIELD EFFICIENCY REPORT</Text>
          <Text style={styles.heroTitle}>{user?.name || "Field Officer"}</Text>
          <Text style={styles.heroArea}>Territory: {user?.assignedArea || "Kozhikode Central"}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{visitedCases.length}</Text>
              <Text style={styles.heroStatLabel}>Visits Done</Text>
            </View>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, { color: "#34D399" }]}>
                {customers.filter((c) => c.status === "collected").length}
              </Text>
              <Text style={styles.heroStatLabel}>Collections</Text>
            </View>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, { color: "#FBBF24" }]}>
                {customers.filter((c) => c.status === "ptp").length}
              </Text>
              <Text style={styles.heroStatLabel}>PTP Logged</Text>
            </View>
          </View>
        </View>

        {/* GUIDELINES & PROTOCOL CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Field Compliance & Geofence Policy</Text>
          <View style={styles.policyRow}>
            <Text style={styles.policyIcon}>🎯</Text>
            <Text style={styles.policyText}>
              <Text style={styles.policyBold}>100-Metre Radius Rule:</Text> Visits must be initiated within 100 metres of verified customer coordinates to pass automated compliance checks.
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyIcon}>📷</Text>
            <Text style={styles.policyText}>
              <Text style={styles.policyBold}>Evidence Timestamping:</Text> Property photos captured in the app are automatically cryptographically signed with satellite latitude and longitude.
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyIcon}>🔒</Text>
            <Text style={styles.policyText}>
              <Text style={styles.policyBold}>Instant Payment Verification:</Text> UPI transaction references are validated by administrative operations before reconciliation.
            </Text>
          </View>
        </View>

        {/* RECENT CASE ACTIONS TIMELINE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Case Activity</Text>
          <Text style={styles.cardSubtitle}>Real-time audit log of your portfolio</Text>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: Spacing.four }} />
          ) : visitedCases.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No customer actions logged in this session yet.</Text>
            </View>
          ) : (
            visitedCases.map((cust, idx) => (
              <Pressable
                key={`exp-cust-${cust._id || 'c'}-${cust.loanAccountNo || idx}-${idx}`}
                style={styles.activityItem}
                onPress={() => router.push({ pathname: "/customer/[id]", params: { id: cust._id } })}
              >
                <View style={styles.actTopRow}>
                  <Text style={styles.actCustName}>{cust.name}</Text>
                  <View style={styles.actBadge}>
                    <Text style={styles.actBadgeText}>{cust.status?.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.actMeta}>
                  A/C: {cust.loanAccountNo} • Outstanding: ₹{cust.outstandingAmount?.toLocaleString("en-IN")}
                </Text>
                <Text style={styles.actAddress} numberOfLines={1}>
                  📍 {cust.address}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    backgroundColor: Colors.light.cardSubtle,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.textSecondary,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.text,
  },
  scrollContent: {
    padding: Spacing.five,
    paddingBottom: Spacing.nine,
  },
  heroCard: {
    backgroundColor: Colors.light.text,
    borderRadius: Radii.xl,
    padding: Spacing.five,
    marginBottom: Spacing.four,
    ...Shadows.md,
  },
  heroSub: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34D399",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 2,
  },
  heroArea: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: Spacing.four,
    marginTop: Spacing.four,
  },
  heroStatItem: {
    alignItems: "center",
    flex: 1,
  },
  heroStatVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: Radii.xl,
    padding: Spacing.five,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: Spacing.four,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.four,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.three,
  },
  policyIcon: {
    fontSize: 16,
    marginRight: Spacing.two,
    marginTop: 1,
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  policyBold: {
    fontWeight: "700",
    color: Colors.light.text,
  },
  activityItem: {
    backgroundColor: Colors.light.cardSubtle,
    borderRadius: Radii.md,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actCustName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.text,
  },
  actBadge: {
    backgroundColor: Colors.light.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  actBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.light.primary,
  },
  actMeta: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 3,
  },
  actAddress: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  emptyBox: {
    padding: Spacing.four,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
});
