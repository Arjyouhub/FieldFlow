import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config/api";
import { saveAuthSession } from "../utils/storage";
import { fontScale, scale, verticalScale } from "../utils/responsive";

const BRAND_DARK_GREEN = "#0D5D37";
const BRAND_EMERALD = "#10B981";
const BRAND_MINT_BG = "#E8F7ED";
const BRAND_MINT_BORDER = "#B4E3C9";

export default function AccountActivationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Multi-step: 1 = Enter Phone, 2 = Enter OTP, 3 = Set Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [phone, setPhone] = useState("9876543211");
  const [staffInfo, setStaffInfo] = useState<{
    name?: string;
    employeeId?: string;
    phone?: string;
    assignedArea?: string;
  } | null>(null);

  // OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [activationToken, setActivationToken] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [devOtpNotice, setDevOtpNotice] = useState("");
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  // Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [missingIntegrationNotice, setMissingIntegrationNotice] = useState("");
  const [successData, setSuccessData] = useState<{ user: any; token: string } | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: any;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) {
            setCanResend(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // --------------------------------------------------------------------------
  // STEP 1: Request Activation OTP
  // --------------------------------------------------------------------------
  const handleRequestActivationOtp = async () => {
    const cleanPhone = phone.trim().replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit registered mobile number.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setMissingIntegrationNotice("");
    setDevOtpNotice("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/activate/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "SMS_GATEWAY_UNAVAILABLE" || data.missingIntegration) {
          setMissingIntegrationNotice(
            data.missingIntegration || "SMS Telephony Gateway (Twilio / MSG91 / Fast2SMS)"
          );
        }
        throw new Error(data.message || "Failed to initiate account activation.");
      }

      setStaffInfo(data.staff);
      setResendTimer(30);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);

      if (data.devOtp) {
        setDevOtpNotice(`Development OTP: ${data.devOtp}`);
      }

      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to reach server. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STEP 2: Verify OTP
  // --------------------------------------------------------------------------
  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      setErrorMessage("Please enter all 6 digits of your verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/activate/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim().replace(/[^\d]/g, ""),
          otp: code,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Verification code is incorrect or expired.");
      }

      setActivationToken(data.activationToken);
      if (data.staff) {
        setStaffInfo((prev) => ({ ...prev, ...data.staff }));
      }
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const updated = [...otpDigits];
    updated[index] = val.slice(-1);
    setOtpDigits(updated);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // --------------------------------------------------------------------------
  // STEP 3: Complete Activation & Set Password
  // --------------------------------------------------------------------------
  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/activate/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim().replace(/[^\d]/g, ""),
          activationToken,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to set password.");
      }

      setSuccessData({ user: data.user, token: data.token });
      if (data.token && data.user) {
        await saveAuthSession(data.token, data.user);
      }
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || "Error activating account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top ? 10 : 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Arrow */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </Pressable>
            <View style={styles.topBarCenter}>
              <Text style={styles.topBarTitle}>FieldFlow Portal</Text>
              <Text style={styles.topBarSub}>Staff Account Activation • by GETLUX</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Step Progress Indicator */}
          <View style={styles.stepProgressRow}>
            {[
              { num: 1, label: "Mobile" },
              { num: 2, label: "Verify OTP" },
              { num: 3, label: "Password" },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      step >= s.num && styles.stepCircleActive,
                      step > s.num && styles.stepCircleCompleted,
                    ]}
                  >
                    {step > s.num ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepCircleText,
                          step >= s.num && styles.stepCircleTextActive,
                        ]}
                      >
                        {s.num}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      step >= s.num && styles.stepLabelActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
                {idx < 2 && (
                  <View
                    style={[
                      styles.stepLine,
                      step > s.num && styles.stepLineActive,
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Missing SMS Integration Banner (Explicit requirement) */}
          {missingIntegrationNotice ? (
            <View style={styles.integrationNoticeCard}>
              <View style={styles.integrationNoticeIconBox}>
                <Ionicons name="cloud-offline-outline" size={22} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.integrationNoticeTitle}>Missing Provider Integration</Text>
                <Text style={styles.integrationNoticeBody}>
                  {missingIntegrationNotice} is currently not configured on the FieldFlow backend.
                </Text>
                <Text style={styles.integrationNoticeFooter}>
                  Contact system administrator to configure SMS telephony API credentials.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Dev OTP Notice if available */}
          {devOtpNotice ? (
            <View style={styles.devOtpCard}>
              <Ionicons name="code-slash" size={18} color="#059669" style={{ marginRight: 8 }} />
              <Text style={styles.devOtpText}>{devOtpNotice}</Text>
            </View>
          ) : null}

          {/* Error Message Box */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* STEP 1: MOBILE NUMBER ENTRY */}
          {/* ========================================================= */}
          {step === 1 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person-add" size={24} color={BRAND_DARK_GREEN} />
                </View>
                <Text style={styles.cardTitle}>Activate Your Account</Text>
                <Text style={styles.cardSubtitle}>
                  Enter the official 10-digit mobile number registered by your FieldFlow administrator.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Registered Mobile Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryFlag}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      if (errorMessage) setErrorMessage("");
                    }}
                  />
                </View>
              </View>

              {/* Quick Fill for Demo Officers */}
              <View style={styles.demoFillContainer}>
                <Text style={styles.demoFillLabel}>Existing Staff Records:</Text>
                <View style={styles.demoPillRow}>
                  <Pressable
                    style={styles.demoPill}
                    onPress={() => {
                      setPhone("9876543211");
                      if (errorMessage) setErrorMessage("");
                    }}
                  >
                    <Ionicons name="flash" size={12} color="#059669" />
                    <Text style={styles.demoPillText}>Rahul Kumar (9876543211)</Text>
                  </Pressable>
                  <Pressable
                    style={styles.demoPill}
                    onPress={() => {
                      setPhone("9876543213");
                      if (errorMessage) setErrorMessage("");
                    }}
                  >
                    <Ionicons name="flash" size={12} color="#059669" />
                    <Text style={styles.demoPillText}>Priya Sharma (9876543213)</Text>
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  loading && styles.btnDisabled,
                ]}
                onPress={handleRequestActivationOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.primaryBtnText}>Send Activation Code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </Pressable>

              <View style={styles.securityNoteRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#64748B" />
                <Text style={styles.securityNoteText}>
                  Activation links to existing staff records. Admin approval is required.
                </Text>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* STEP 2: OTP VERIFICATION */}
          {/* ========================================================= */}
          {step === 2 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="key-outline" size={24} color={BRAND_DARK_GREEN} />
                </View>
                <Text style={styles.cardTitle}>Verify Security Code</Text>
                <Text style={styles.cardSubtitle}>
                  Enter the 6-digit activation code sent to +91 {phone.slice(-10)}.
                </Text>
                {staffInfo?.name && (
                  <View style={styles.staffBadge}>
                    <Text style={styles.staffBadgeText}>
                      Officer: <Text style={{ fontWeight: "700" }}>{staffInfo.name}</Text> ({staffInfo.employeeId || "Staff"})
                    </Text>
                  </View>
                )}
              </View>

              {/* 6 Digit Input Boxes */}
              <View style={styles.otpRow}>
                {otpDigits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => {
                      otpInputRefs.current[i] = r;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleDigitChange(i, val)}
                    onKeyPress={(e) => handleDigitKeyPress(i, e)}
                  />
                ))}
              </View>

              {/* Resend Timer & Action */}
              <View style={styles.resendRow}>
                {resendTimer > 0 ? (
                  <Text style={styles.resendTimerText}>
                    Resend code in <Text style={{ fontWeight: "700", color: BRAND_DARK_GREEN }}>{resendTimer}s</Text>
                  </Text>
                ) : (
                  <Pressable
                    onPress={handleRequestActivationOtp}
                    disabled={loading}
                    hitSlop={8}
                  >
                    <Text style={styles.resendActiveText}>Resend Activation Code</Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  loading && styles.btnDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.primaryBtnText}>Verify & Proceed</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={styles.changePhoneBtn}
                onPress={() => {
                  setStep(1);
                  setErrorMessage("");
                }}
              >
                <Text style={styles.changePhoneText}>← Use different phone number</Text>
              </Pressable>
            </View>
          )}

          {/* ========================================================= */}
          {/* STEP 3: SET PASSWORD */}
          {/* ========================================================= */}
          {step === 3 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="lock-closed" size={24} color={BRAND_DARK_GREEN} />
                </View>
                <Text style={styles.cardTitle}>Create Your Password</Text>
                <Text style={styles.cardSubtitle}>
                  Set a secure password for your FieldFlow officer account.
                </Text>
              </View>

              {/* Verified Staff Card */}
              <View style={styles.verifiedStaffCard}>
                <View style={styles.verifiedStaffAvatar}>
                  <Text style={{ fontSize: 18, color: "#FFFFFF", fontWeight: "700" }}>
                    {staffInfo?.name ? staffInfo.name[0] : "O"}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.verifiedStaffName}>{staffInfo?.name || "Field Officer"}</Text>
                  <Text style={styles.verifiedStaffMeta}>
                    ID: {staffInfo?.employeeId || "STF-Active"} • {staffInfo?.assignedArea || "Field Operations"}
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              </View>

              {/* New Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password (min 6 characters)</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (errorMessage) setErrorMessage("");
                    }}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (errorMessage) setErrorMessage("");
                    }}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  loading && styles.btnDisabled,
                ]}
                onPress={handleSetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.primaryBtnText}>Activate & Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* ========================================================= */}
          {/* STEP 4: SUCCESS STATE */}
          {/* ========================================================= */}
          {step === 4 && (
            <View style={styles.card}>
              <View style={styles.successIconWrapper}>
                <View style={styles.successPulseCircle}>
                  <Ionicons name="checkmark-done" size={42} color="#FFFFFF" />
                </View>
              </View>

              <Text style={styles.successHeading}>Account Activated!</Text>
              <Text style={styles.successBody}>
                Welcome to FieldFlow,{" "}
                <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                  {successData?.user?.name || "Officer"}
                </Text>
                . Your password has been configured and your profile is fully verified for field collections.
              </Text>

              <View style={styles.successDetailsBox}>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Employee ID</Text>
                  <Text style={styles.successDetailVal}>
                    {successData?.user?.employeeId || "STF-Active"}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Territory</Text>
                  <Text style={styles.successDetailVal}>
                    {successData?.user?.assignedArea || "Field Operations"}
                  </Text>
                </View>
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Role</Text>
                  <Text style={styles.successDetailVal}>Field Staff</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                ]}
                onPress={() => router.replace("/dashboard")}
              >
                <View style={styles.btnContentRow}>
                  <Text style={styles.primaryBtnText}>Go to Field Dashboard</Text>
                  <Ionicons name="speedometer-outline" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              </Pressable>
            </View>
          )}

          {/* Bottom Back to Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already activated your account? </Text>
            <Pressable onPress={() => router.replace("/")} hitSlop={8}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(36),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  topBarCenter: {
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: fontScale(16),
    fontWeight: "700",
    color: "#0F172A",
  },
  topBarSub: {
    fontSize: fontScale(12),
    color: "#64748B",
    marginTop: 1,
  },
  stepProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(10),
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleActive: {
    backgroundColor: BRAND_DARK_GREEN,
  },
  stepCircleCompleted: {
    backgroundColor: BRAND_EMERALD,
  },
  stepCircleText: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#64748B",
  },
  stepCircleTextActive: {
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: fontScale(11),
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "500",
  },
  stepLabelActive: {
    color: BRAND_DARK_GREEN,
    fontWeight: "700",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: scale(8),
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: BRAND_EMERALD,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: scale(22),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_MINT_BG,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: fontScale(13),
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: scale(8),
  },
  staffBadge: {
    marginTop: 10,
    backgroundColor: BRAND_MINT_BG,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND_MINT_BORDER,
  },
  staffBadgeText: {
    fontSize: fontScale(12),
    color: BRAND_DARK_GREEN,
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  countryCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#EDF2F7",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  countryFlag: {
    fontSize: fontScale(16),
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#1E293B",
  },
  phoneInput: {
    flex: 1,
    fontSize: fontScale(15),
    fontWeight: "600",
    color: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: fontScale(15),
    color: "#0F172A",
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  demoFillContainer: {
    marginBottom: verticalScale(18),
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
  },
  demoFillLabel: {
    fontSize: fontScale(11),
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  demoPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  demoPillText: {
    fontSize: fontScale(11),
    fontWeight: "600",
    color: "#334155",
  },
  primaryBtn: {
    backgroundColor: BRAND_DARK_GREEN,
    borderRadius: 14,
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND_DARK_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  securityNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 6,
  },
  securityNoteText: {
    fontSize: fontScale(11),
    color: "#64748B",
    textAlign: "center",
    flex: 1,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(4),
  },
  otpBox: {
    width: scale(44),
    height: scale(52),
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    textAlign: "center",
    fontSize: fontScale(22),
    fontWeight: "700",
    color: "#0F172A",
  },
  otpBoxFilled: {
    borderColor: BRAND_DARK_GREEN,
    backgroundColor: "#F0FDF4",
  },
  resendRow: {
    alignItems: "center",
    marginBottom: verticalScale(18),
  },
  resendTimerText: {
    fontSize: fontScale(13),
    color: "#64748B",
  },
  resendActiveText: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
    textDecorationLine: "underline",
  },
  changePhoneBtn: {
    alignItems: "center",
    marginTop: 16,
  },
  changePhoneText: {
    fontSize: fontScale(13),
    color: "#64748B",
    fontWeight: "600",
  },
  verifiedStaffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND_MINT_BG,
    borderRadius: 14,
    padding: 12,
    marginBottom: verticalScale(18),
    borderWidth: 1,
    borderColor: BRAND_MINT_BORDER,
  },
  verifiedStaffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_DARK_GREEN,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedStaffName: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  verifiedStaffMeta: {
    fontSize: fontScale(11),
    color: "#475569",
    marginTop: 2,
  },
  successIconWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  successPulseCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: BRAND_EMERALD,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: BRAND_EMERALD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  successHeading: {
    fontSize: fontScale(22),
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  successBody: {
    fontSize: fontScale(13),
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(18),
  },
  successDetailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  successDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  successDetailLabel: {
    fontSize: fontScale(12),
    color: "#64748B",
  },
  successDetailVal: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#1E293B",
  },
  integrationNoticeCard: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 14,
    padding: 12,
    marginBottom: verticalScale(14),
  },
  integrationNoticeIconBox: {
    marginRight: 10,
    marginTop: 2,
  },
  integrationNoticeTitle: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#92400E",
  },
  integrationNoticeBody: {
    fontSize: fontScale(11),
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15,
  },
  integrationNoticeFooter: {
    fontSize: fontScale(10),
    color: "#78350F",
    marginTop: 4,
    fontStyle: "italic",
  },
  devOtpCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 10,
    marginBottom: verticalScale(12),
  },
  devOtpText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 10,
    marginBottom: verticalScale(12),
  },
  errorText: {
    fontSize: fontScale(12),
    color: "#B91C1C",
    flex: 1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(20),
  },
  footerText: {
    fontSize: fontScale(13),
    color: "#64748B",
  },
  footerLink: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },
});
