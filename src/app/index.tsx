import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { API_BASE_URL } from "../config/api";
import { saveAuthSession, getAuthSession } from "../utils/storage";
import { Colors, Spacing, Radii, Shadows } from "../constants/theme";
import { fontScale, scale, verticalScale } from "../utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Primary dark forest green matching reference
const BRAND_DARK_GREEN = "#0D5D37";
const BRAND_EMERALD = "#10B981";
const BRAND_MINT_BG = "#E8F6ED";
const BRAND_MINT_BORDER = "#B4E3C9";

// -------------------------------------------------------------
// DUAL-LEAF FIELDFLOW LOGO (Matches Reference Geometry)
// -------------------------------------------------------------
function DualLeafLogo({ size = 38, light = false }: { size?: number; light?: boolean }) {
  const leafW = size * 0.7;
  const leafH = size * 0.7;

  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      {/* Under/Darker Forest Leaf */}
      <View
        style={{
          position: "absolute",
          width: leafW,
          height: leafH,
          backgroundColor: light ? "#A7F3D0" : BRAND_DARK_GREEN,
          borderTopLeftRadius: leafW,
          borderBottomRightRadius: leafW,
          borderTopRightRadius: 4,
          borderBottomLeftRadius: 4,
          transform: [
            { rotate: "-40deg" },
            { translateX: -leafW * 0.12 },
            { translateY: leafH * 0.08 },
          ],
        }}
      />
      {/* Upper/Vibrant Emerald Leaf */}
      <View
        style={{
          position: "absolute",
          width: leafW * 0.92,
          height: leafH * 0.92,
          backgroundColor: light ? "#FFFFFF" : BRAND_EMERALD,
          borderTopLeftRadius: leafW * 0.92,
          borderBottomRightRadius: leafW * 0.92,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: 3,
          transform: [
            { rotate: "-15deg" },
            { translateX: leafW * 0.1 },
            { translateY: -leafH * 0.04 },
          ],
          opacity: 0.95,
        }}
      />
    </View>
  );
}

// -------------------------------------------------------------
// VERIFY OTP PHONE + SHIELD ILLUSTRATION (Reference Screen 3)
// -------------------------------------------------------------
function OtpPhoneIllustration() {
  return (
    <View style={styles.phoneIllustrationContainer}>
      <View style={styles.phoneGraphicFrame}>
        {/* Top Speaker Notch */}
        <View style={styles.phoneSpeaker} />
        {/* Screen Area */}
        <View style={styles.phoneScreenArea} />
        {/* Bottom Home Indicator */}
        <View style={styles.phoneHomeBar} />
      </View>
      {/* Shield Checkmark Badge overlapping top right */}
      <View style={styles.phoneShieldBadge}>
        <Ionicons name="shield-checkmark" size={30} color={BRAND_EMERALD} />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors.light;

  // View state: 'splash' | 'login' | 'otp'
  const [currentView, setCurrentView] = useState<"login" | "splash" | "otp">("login");
  const [rememberMe, setRememberMe] = useState(true);

  // Login form state
  const [phone, setPhone] = useState("9876543211");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // OTP State (Screen 3: 6 individual boxes)
  const [otpPhone, setOtpPhone] = useState("9876543211");
  const [otpMode, setOtpMode] = useState<"login" | "forgot_password">("login");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [otpMsg, setOtpMsg] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(28);

  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  // Field Staff Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regArea, setRegArea] = useState("Kozhikode Central");
  const [regEmployeeId, setRegEmployeeId] = useState("");
  const [regSelfieUri, setRegSelfieUri] = useState<string | null>(null);
  const [regSelfieBase64, setRegSelfieBase64] = useState<string | null>(null);
  const [regLocation, setRegLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccessMsg, setRegSuccessMsg] = useState("");

  // Check existing session
  useEffect(() => {
    (async () => {
      const { token } = await getAuthSession();
      if (token) {
        router.replace("/dashboard");
      }
    })();
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0 && currentView === "otp") {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer, currentView]);

  // -------------------------------------------------------------
  // LOGIN WITH MOBILE & PASSWORD
  // -------------------------------------------------------------
  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      setErrorText("Please enter your mobile number and password.");
      return;
    }

    setLoading(true);
    setErrorText("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneOrEmail: phone.trim(),
          password,
          deviceType: "Field Staff Android App",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          res.status === 504 || res.status === 502
            ? "FieldFlow backend server is offline. Please ensure backend is running on port 5000."
            : `Server returned HTTP ${res.status}.`
        );
      }

      if (!res.ok) {
        throw new Error(data.message || "Invalid mobile number or password.");
      }

      await saveAuthSession(data.token, data.user);
      router.replace("/dashboard");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorText("Connection timed out. Please check that FieldFlow backend is running on port 5000.");
      } else {
        setErrorText(err.message || "Unable to reach FieldFlow server. Please check network.");
      }
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // INITIATE OTP (For Login or Forgot Password)
  // -------------------------------------------------------------
  const handleRequestOtp = async (targetPhone = otpPhone, mode: "login" | "forgot_password" = otpMode) => {
    const cleanPhone = targetPhone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorText("Please enter a valid 10-digit mobile number.");
      return;
    }

    setOtpLoading(true);
    setErrorText("");
    setOtpMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate OTP.");

      setOtpPhone(cleanPhone);
      setOtpMode(mode);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendTimer(28);

      if (data.devOtp) {
        setOtpMsg(`OTP Sent! (Development Code: ${data.devOtp})`);
      } else {
        setOtpMsg(`Verification 6-digit code sent to +91 ${cleanPhone}`);
      }

      setCurrentView("otp");
    } catch (err: any) {
      setErrorText(err.message || "Failed to send OTP code.");
      Alert.alert("OTP Request Failed", err.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const updated = [...otpDigits];
    // Keep only last typed character
    updated[index] = val.slice(-1);
    setOtpDigits(updated);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // -------------------------------------------------------------
  // VERIFY OTP (Login or Password Reset)
  // -------------------------------------------------------------
  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) {
      setOtpMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setOtpLoading(true);
    setOtpMsg("");

    try {
      if (otpMode === "login") {
        // Direct OTP login using dedicated backend route
        const res = await fetch(`${API_BASE_URL}/auth/verify-otp-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: otpPhone.trim(),
            otp: code,
            deviceType: "Field Staff Android App",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Incorrect verification code.");

        await saveAuthSession(data.token, data.user);
        router.replace("/dashboard");
      } else {
        // Forgot password / reset flow
        const res = await fetch(`${API_BASE_URL}/auth/verify-otp-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: otpPhone.trim(),
            otp: code,
            newPassword: newPassword || "password123",
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Incorrect verification code.");

        Alert.alert(
          "Password Updated",
          "Your password has been verified and updated. Please sign in with your credentials.",
          [{ text: "OK", onPress: () => setCurrentView("login") }]
        );
      }
    } catch (err: any) {
      setOtpMsg(err.message || "Failed to verify code.");
    } finally {
      setOtpLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STAFF REGISTRATION HANDLERS
  // -------------------------------------------------------------
  const handleCaptureSelfie = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera Permission Required", "Please allow camera access to take verification selfie.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setRegSelfieUri(result.assets[0].uri);
        if (result.assets[0].base64) {
          setRegSelfieBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
      }
    } catch (err: any) {
      Alert.alert("Camera Error", err.message || "Failed to open camera.");
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setRegSelfieUri(result.assets[0].uri);
        if (result.assets[0].base64) {
          setRegSelfieBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
      }
    } catch (err: any) {
      Alert.alert("Gallery Error", err.message || "Failed to select photo.");
    }
  };

  const handleCaptureLocation = async () => {
    try {
      setCapturingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setRegLocation({ lat: 11.2588, lng: 75.7804, address: regArea || "Kozhikode, Kerala" });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let addressStr = `${regArea || "Kozhikode"}, Kerala`;

      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (reverse && reverse[0]) {
          const r = reverse[0];
          addressStr = [r.name || r.street, r.district || r.subregion, r.city || r.region].filter(Boolean).join(", ");
        }
      } catch {}

      setRegLocation({
        lat: Number(loc.coords.latitude.toFixed(6)),
        lng: Number(loc.coords.longitude.toFixed(6)),
        address: addressStr || "Current GPS Location",
      });
    } catch {
      setRegLocation({ lat: 11.2588, lng: 75.7804, address: "Kozhikode Central, Kerala" });
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleSubmitRegistration = async () => {
    if (!regName.trim()) {
      setRegError("Please enter your full name.");
      return;
    }
    if (!regPhone.trim() || regPhone.trim().length < 10) {
      setRegError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setRegError("Password must be at least 6 characters.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      return;
    }
    if (!regSelfieBase64 && !regSelfieUri) {
      setRegError("Please take a verification selfie photo.");
      return;
    }

    setSubmittingReg(true);
    setRegError("");
    setRegSuccessMsg("");

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          phone: regPhone.trim(),
          password: regPassword,
          assignedArea: regArea.trim(),
          employeeId: regEmployeeId.trim() || undefined,
          profilePhoto: regSelfieBase64 || regSelfieUri || "",
          location: regLocation || { lat: 11.2588, lng: 75.7804, address: regArea || "Kozhikode" },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit registration.");
      }

      setRegSuccessMsg(
        data.message ||
          "Registration submitted! Your account is pending Administrator Approval. Once reviewed and approved by the admin, you can log in with this password."
      );
      setPhone(regPhone.trim());
      setPassword(regPassword);
    } catch (err: any) {
      setRegError(err.message || "Failed to register. Please check network connection.");
    } finally {
      setSubmittingReg(false);
    }
  };

  // =============================================================
  // SCREEN 1: SPLASH / ONBOARDING VIEW (Reference Screen 1)
  // =============================================================
  if (currentView === "splash") {
    return (
      <View style={styles.splashContainer}>
        {/* Decorative corner leaves */}
        <View style={styles.splashTopLeafDeco} pointerEvents="none" />
        <View style={styles.splashBottomLeafDeco} pointerEvents="none" />

        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          {/* Top Branding Section */}
          <View style={styles.splashCenterSection}>
            {/* Dual Leaf Logo Icon */}
            <View style={styles.splashLogoWrapper}>
              <DualLeafLogo size={68} light />
            </View>
            <Text style={styles.splashBrandTitle}>FieldFlow</Text>
            <Text style={styles.splashTagline}>Collect  •  Track  •  Grow</Text>

            {/* 3 Translucent Feature Badges */}
            <View style={styles.splashBadgesRow}>
              {/* Badge 1: Field Collection */}
              <View style={styles.splashBadgeItem}>
                <View style={styles.splashBadgeCircle}>
                  <Ionicons name="people-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.splashBadgeLabel}>Field{"\n"}Collection</Text>
              </View>

              {/* Badge 2: Real-time Tracking */}
              <View style={styles.splashBadgeItem}>
                <View style={styles.splashBadgeCircle}>
                  <Ionicons name="stats-chart-outline" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.splashBadgeLabel}>Real-time{"\n"}Tracking</Text>
              </View>

              {/* Badge 3: Secure & Reliable */}
              <View style={styles.splashBadgeItem}>
                <View style={styles.splashBadgeCircle}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.splashBadgeLabel}>Secure{"\n"}& Reliable</Text>
              </View>
            </View>
          </View>

          {/* Bottom Curved White Card */}
          <View style={styles.splashBottomCard}>
            <Text style={styles.splashCardHeading}>
              Your Field Collection{"\n"}Management Partner
            </Text>
            <Text style={styles.splashCardSubtitle}>
              Smarter Visits. Stronger Collections.{"\n"}Better Tomorrow.
            </Text>

            {/* Carousel Indicator: [ pill , dot , dot ] */}
            <View style={styles.splashCarouselRow}>
              <View style={styles.splashCarouselActivePill} />
              <View style={styles.splashCarouselDot} />
              <View style={styles.splashCarouselDot} />
            </View>

            {/* Interactive button to proceed to login */}
            <Pressable
              style={({ pressed }) => [
                styles.splashStartBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => setCurrentView("login")}
            >
              <Text style={styles.splashStartBtnText}>Sign In to Account →</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // =============================================================
  // SCREEN 3: VERIFY OTP VIEW (Reference Screen 3)
  // =============================================================
  if (currentView === "otp") {
    return (
      <View style={styles.screenContainer}>
        {/* Decorative corner leaves */}
        <View style={styles.cornerLeafDecoTopRight} pointerEvents="none" />
        <View style={styles.cornerLeafDecoBottom} pointerEvents="none" />

        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.otpScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Top Back Chevron Arrow */}
              <Pressable
                onPress={() => setCurrentView("login")}
                style={styles.otpBackBtn}
                hitSlop={12}
              >
                <Ionicons name="chevron-back" size={24} color="#0F172A" />
              </Pressable>

              {/* Phone with Shield Checkmark Badge Graphic */}
              <OtpPhoneIllustration />

              {/* Screen Title & Subtitle */}
              <View style={styles.otpHeader}>
                <Text style={styles.otpTitle}>Verify OTP</Text>
                <Text style={styles.otpSubtitle}>Enter the 6-digit code sent to</Text>
                <Text style={styles.otpPhoneText}>+91 {otpPhone}</Text>
              </View>

              {/* OTP Message Banner */}
              {otpMsg ? (
                <View
                  style={[
                    styles.msgBanner,
                    otpMsg.includes("Sent") || otpMsg.includes("sent") || otpMsg.includes("Verified")
                      ? styles.msgSuccess
                      : styles.msgError,
                  ]}
                >
                  <Ionicons
                    name={
                      otpMsg.includes("Sent") || otpMsg.includes("sent") || otpMsg.includes("Verified")
                        ? "checkmark-circle"
                        : "alert-circle"
                    }
                    size={16}
                    color={
                      otpMsg.includes("Sent") || otpMsg.includes("sent") || otpMsg.includes("Verified")
                        ? "#047857"
                        : "#DC2626"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.msgText,
                      otpMsg.includes("Sent") || otpMsg.includes("sent") || otpMsg.includes("Verified")
                        ? styles.msgSuccessText
                        : styles.msgErrorText,
                    ]}
                  >
                    {otpMsg}
                  </Text>
                </View>
              ) : null}

              {/* 6 Individual Square Rounded OTP Boxes */}
              <View style={styles.otpBoxesRow}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(ref) => {
                      otpInputRefs.current[idx] = ref;
                    }}
                    style={[
                      styles.otpBoxInput,
                      digit ? styles.otpBoxInputFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(val) => handleOtpDigitChange(idx, val)}
                    onKeyPress={(e) => handleOtpKeyPress(idx, e)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Resend OTP Row */}
              <View style={styles.resendCenterRow}>
                {resendTimer > 0 ? (
                  <Text style={styles.resendTimerText}>
                    Resend OTP in{" "}
                    <Text style={styles.resendTimerHighlight}>
                      00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                    </Text>
                  </Text>
                ) : (
                  <Pressable onPress={() => handleRequestOtp(otpPhone, otpMode)} hitSlop={8}>
                    <Text style={styles.resendActiveLink}>Resend OTP</Text>
                  </Pressable>
                )}
              </View>

              {/* Verify Primary Button: "Verify →" */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  otpLoading && styles.buttonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnRowContent}>
                    <Text style={styles.primaryButtonText}>Verify</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </Pressable>

              {/* Security Notice Card (Reference Screen 3) */}
              <View style={styles.securityCard}>
                <Ionicons
                  name="shield-checkmark"
                  size={26}
                  color={BRAND_EMERALD}
                  style={styles.securityCardIcon}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.securityCardTitle}>For your security</Text>
                  <Text style={styles.securityCardSubtitle}>
                    Please do not share this OTP with anyone. It will expire shortly.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // =============================================================
  // SCREEN 2: LOGIN SCREEN VIEW (Reference Screen 2)
  // =============================================================
  return (
    <View style={styles.screenContainer}>
      {/* Decorative leaf shapes */}
      <View style={styles.cornerLeafDecoTopLeft} pointerEvents="none" />
      <View style={styles.cornerLeafDecoBottom} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Row: Language Pill top-right & optional Splash trigger */}
            <View style={styles.topBarRow}>
              <Pressable
                style={styles.splashPreviewLink}
                onPress={() => setCurrentView("splash")}
                hitSlop={8}
              >
                <Text style={styles.splashPreviewLinkText}>About App</Text>
              </Pressable>

              <Pressable style={styles.languagePill} hitSlop={8}>
                <Ionicons name="globe-outline" size={15} color={BRAND_DARK_GREEN} />
                <Text style={styles.languagePillText}>English</Text>
                <Ionicons name="chevron-down" size={14} color={BRAND_DARK_GREEN} />
              </Pressable>
            </View>

            {/* FieldFlow Logo (Dual-tone Leaf + Bold Title) */}
            <View style={styles.brandContainer}>
              <DualLeafLogo size={36} />
              <Text style={styles.brandTitleText}>FieldFlow</Text>
            </View>

            {/* Welcome Back & Subtitle */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
            </View>

            {/* Error Message Banner */}
            {errorText ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorBoxText}>{errorText}</Text>
              </View>
            ) : null}

            {/* Input Card Container */}
            <View style={styles.cardContainer}>
              {/* Field 1: Mobile Number */}
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={styles.inputFieldWrapper}>
                <Ionicons
                  name="call-outline"
                  size={19}
                  color="#64748B"
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInputField}
                  placeholder="Enter your mobile number"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    if (errorText) setErrorText("");
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Field 2: Password */}
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputFieldWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color="#64748B"
                  style={styles.inputPrefixIcon}
                />
                <TextInput
                  style={styles.textInputField}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorText) setErrorText("");
                  }}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeToggleBtn}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#64748B"
                  />
                </Pressable>
              </View>

              {/* Options Row: Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <Pressable
                  style={styles.rememberMeRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  hitSlop={6}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleRequestOtp(phone, "forgot_password")}
                  hitSlop={6}
                >
                  <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                </Pressable>
              </View>

              {/* Primary Green Login Button: "Login →" */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnRowContent}>
                    <Text style={styles.primaryButtonText}>Login</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </Pressable>

              {/* "OR" Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Outlined Button: "Login with OTP" */}
              <Pressable
                style={({ pressed }) => [
                  styles.outlineOtpBtn,
                  pressed && { backgroundColor: "#F0FDF4" },
                ]}
                onPress={() => handleRequestOtp(phone, "login")}
                disabled={otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator color={BRAND_DARK_GREEN} size="small" />
                ) : (
                  <View style={styles.btnRowContent}>
                    <Ionicons name="call" size={18} color={BRAND_DARK_GREEN} style={{ marginRight: 8 }} />
                    <Text style={styles.outlineOtpBtnText}>Login with OTP</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Quick Demo Fill Pill (convenient for testing officer 9876543211) */}
            <Pressable
              style={styles.demoFillPill}
              onPress={() => {
                setPhone("9876543211");
                setPassword("password123");
                setErrorText("");
              }}
            >
              <Text style={styles.demoFillPillText}>⚡ Fill Demo Officer (9876543211)</Text>
            </Pressable>

            {/* Bottom Footer: Activate Account */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New to FieldFlow? </Text>
              <Pressable
                onPress={() => {
                  setShowRegisterModal(true);
                  if (!regLocation) handleCaptureLocation();
                }}
                hitSlop={8}
              >
                <Text style={styles.footerHighlightLink}>Activate Account</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ============================================================= */}
      {/* STAFF SELF-REGISTRATION MODAL */}
      {/* ============================================================= */}
      <Modal visible={showRegisterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboardWrapper}
          >
            <View style={[styles.modalCard, { maxHeight: "90%" }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Field Staff Registration</Text>
                  <Text style={styles.modalSubtitle}>
                    Capture verification selfie, territory & login credentials
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowRegisterModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {regError ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.errorBoxText}>{regError}</Text>
                  </View>
                ) : null}

                {regSuccessMsg ? (
                  <View style={styles.regSuccessCard}>
                    <Text style={styles.regSuccessIcon}>⏳</Text>
                    <Text style={styles.regSuccessTitle}>Application Under Admin Review</Text>
                    <Text style={styles.regSuccessText}>{regSuccessMsg}</Text>
                    <Pressable
                      style={[styles.primaryButton, { alignSelf: "center", marginTop: 12, paddingHorizontal: 24 }]}
                      onPress={() => {
                        setShowRegisterModal(false);
                        setRegSuccessMsg("");
                      }}
                    >
                      <Text style={styles.primaryButtonText}>Proceed to Sign In</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {/* 1. SELFIE CAPTURE */}
                    <View style={styles.regSectionBox}>
                      <Text style={styles.regSectionTitle}>1. Officer Verification Selfie *</Text>
                      <Text style={styles.regSectionSub}>
                        Take a clear front-facing portrait photo for identification.
                      </Text>

                      {regSelfieUri ? (
                        <View style={styles.selfiePreviewContainer}>
                          <Image source={{ uri: regSelfieUri }} style={styles.selfieImage} />
                          <View style={styles.selfieBadge}>
                            <Text style={styles.selfieBadgeText}>✓ Selfie Captured</Text>
                          </View>
                          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                            <Pressable style={styles.retakeBtn} onPress={handleCaptureSelfie}>
                              <Text style={styles.retakeBtnText}>📷 Retake Selfie</Text>
                            </Pressable>
                            <Pressable style={styles.galleryBtn} onPress={handlePickFromGallery}>
                              <Text style={styles.galleryBtnText}>Gallery</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                          <Pressable style={[styles.captureSelfieBtn, { flex: 1 }]} onPress={handleCaptureSelfie}>
                            <Ionicons name="camera-outline" size={20} color={BRAND_DARK_GREEN} />
                            <Text style={styles.captureSelfieBtnTitle}>Take Front Selfie</Text>
                            <Text style={styles.captureSelfieBtnSub}>Opens Camera</Text>
                          </Pressable>
                          <Pressable style={styles.gallerySmallBtn} onPress={handlePickFromGallery}>
                            <Ionicons name="images-outline" size={18} color={BRAND_DARK_GREEN} />
                            <Text style={styles.galleryBtnText}>Gallery</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {/* 2. GPS LOCATION CAPTURE */}
                    <View style={styles.regSectionBox}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={styles.regSectionTitle}>2. Location & Territory *</Text>
                        <Pressable onPress={handleCaptureLocation} hitSlop={6}>
                          <Text style={{ fontSize: fontScale(12), fontWeight: "600", color: BRAND_DARK_GREEN }}>
                            {capturingLocation ? "Locating..." : "↻ Refresh GPS"}
                          </Text>
                        </Pressable>
                      </View>

                      {regLocation ? (
                        <View style={styles.locationPillContainer}>
                          <Text style={{ fontSize: 16 }}>📍</Text>
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.locationPillText}>
                              GPS: {regLocation.lat}, {regLocation.lng}
                            </Text>
                            <Text style={styles.locationAddressText}>
                              {regLocation.address || "Kozhikode, Kerala"}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Pressable style={styles.captureLocationBtn} onPress={handleCaptureLocation}>
                          <Text style={{ color: BRAND_DARK_GREEN, fontWeight: "600", fontSize: fontScale(13) }}>
                            {capturingLocation ? "Capturing coordinates..." : "📍 Tag My Current Location"}
                          </Text>
                        </Pressable>
                      )}

                      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Assigned Operational Area / Territory *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Kozhikode Central, Vadakara, Koyilandy"
                        placeholderTextColor={theme.textMuted}
                        value={regArea}
                        onChangeText={setRegArea}
                      />
                    </View>

                    {/* 3. AGENT DETAILS */}
                    <View style={styles.regSectionBox}>
                      <Text style={styles.regSectionTitle}>3. Personal & Login Details *</Text>

                      <Text style={styles.fieldLabel}>Full Legal Name *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. Akhil V"
                        placeholderTextColor={theme.textMuted}
                        value={regName}
                        onChangeText={setRegName}
                      />

                      <Text style={styles.fieldLabel}>Mobile Number *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={theme.textMuted}
                        value={regPhone}
                        onChangeText={setRegPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />

                      <Text style={styles.fieldLabel}>Employee / Agent ID (Optional)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. STF-201"
                        placeholderTextColor={theme.textMuted}
                        value={regEmployeeId}
                        onChangeText={setRegEmployeeId}
                      />

                      <Text style={styles.fieldLabel}>Password *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Minimum 6 characters"
                        placeholderTextColor={theme.textMuted}
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry
                      />

                      <Text style={styles.fieldLabel}>Confirm Password *</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Re-enter password"
                        placeholderTextColor={theme.textMuted}
                        value={regConfirmPassword}
                        onChangeText={setRegConfirmPassword}
                        secureTextEntry
                      />
                    </View>

                    {/* SUBMIT BUTTON */}
                    <View style={{ marginTop: 12 }}>
                      <Pressable
                        style={[styles.primaryButton, submittingReg && styles.buttonDisabled]}
                        onPress={handleSubmitRegistration}
                        disabled={submittingReg}
                      >
                        {submittingReg ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Submit Registration for Approval</Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    justifyContent: "center",
  },

  // Corner leaf silhouettes for subtle aesthetic
  cornerLeafDecoTopLeft: {
    position: "absolute",
    top: -20,
    left: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    transform: [{ rotate: "25deg" }],
  },
  cornerLeafDecoTopRight: {
    position: "absolute",
    top: -15,
    right: -25,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    transform: [{ rotate: "-30deg" }],
  },
  cornerLeafDecoBottom: {
    position: "absolute",
    bottom: -30,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(13, 93, 55, 0.07)",
    transform: [{ rotate: "15deg" }],
  },

  // Top Bar Row
  topBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  splashPreviewLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  splashPreviewLinkText: {
    fontSize: fontScale(12),
    color: "#94A3B8",
    fontWeight: "600",
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  languagePillText: {
    fontSize: fontScale(13),
    fontWeight: "600",
    color: BRAND_DARK_GREEN,
  },

  // FieldFlow Branding (Centered Leaf + Bold Title)
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  brandTitleText: {
    fontSize: fontScale(26),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },

  // Welcome Header
  welcomeContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: fontScale(24),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: fontScale(14),
    color: "#64748B",
    marginTop: 4,
    fontWeight: "400",
  },

  // Form Card Container
  cardContainer: {
    width: "100%",
  },
  inputLabel: {
    fontSize: fontScale(13),
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  inputFieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  inputPrefixIcon: {
    marginRight: 10,
  },
  textInputField: {
    flex: 1,
    fontSize: fontScale(14),
    color: "#0F172A",
    fontWeight: "500",
  },
  eyeToggleBtn: {
    padding: 6,
  },

  // Remember Me & Forgot Password Row
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 2,
  },
  rememberMeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxActive: {
    backgroundColor: BRAND_DARK_GREEN,
    borderColor: BRAND_DARK_GREEN,
  },
  rememberMeText: {
    fontSize: fontScale(13),
    color: "#475569",
    fontWeight: "500",
  },
  forgotPasswordLink: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },

  // Buttons
  primaryButton: {
    backgroundColor: BRAND_DARK_GREEN,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: fontScale(15),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  btnRowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    paddingHorizontal: 14,
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#94A3B8",
  },

  // Secondary Outlined OTP Button
  outlineOtpBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND_DARK_GREEN,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineOtpBtnText: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },

  // Demo fill shortcut
  demoFillPill: {
    alignSelf: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.full,
    marginTop: 20,
  },
  demoFillPillText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: BRAND_DARK_GREEN,
  },

  // Footer Row
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 26,
  },
  footerText: {
    fontSize: fontScale(13),
    color: "#64748B",
  },
  footerHighlightLink: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },

  // Error Banner
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 14,
  },
  errorBoxText: {
    flex: 1,
    fontSize: fontScale(12),
    color: "#DC2626",
    fontWeight: "600",
  },

  // -------------------------------------------------------------
  // SCREEN 1: SPLASH STYLES
  // -------------------------------------------------------------
  splashContainer: {
    flex: 1,
    backgroundColor: "#0B4A2B", // Deep forest green
  },
  splashTopLeafDeco: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  splashBottomLeafDeco: {
    position: "absolute",
    top: 140,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  splashCenterSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  splashLogoWrapper: {
    marginBottom: 12,
  },
  splashBrandTitle: {
    fontSize: fontScale(34),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  splashTagline: {
    fontSize: fontScale(14),
    fontWeight: "500",
    color: "#A7F3D0",
    letterSpacing: 2,
    marginTop: 6,
    marginBottom: 36,
  },
  splashBadgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 320,
    paddingHorizontal: 8,
  },
  splashBadgeItem: {
    alignItems: "center",
    width: 86,
  },
  splashBadgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  splashBadgeLabel: {
    fontSize: fontScale(11),
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 15,
  },
  splashBottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  splashCardHeading: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: "#0F2F1D",
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  splashCardSubtitle: {
    fontSize: fontScale(13),
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  splashCarouselRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 22,
    marginBottom: 22,
  },
  splashCarouselActivePill: {
    width: 28,
    height: 5,
    borderRadius: 3,
    backgroundColor: BRAND_DARK_GREEN,
  },
  splashCarouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  splashStartBtn: {
    backgroundColor: BRAND_DARK_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    ...Shadows.sm,
  },
  splashStartBtnText: {
    color: "#FFFFFF",
    fontSize: fontScale(15),
    fontWeight: "700",
  },

  // -------------------------------------------------------------
  // SCREEN 3: VERIFY OTP STYLES
  // -------------------------------------------------------------
  otpScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  otpBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  phoneIllustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  phoneGraphicFrame: {
    width: 50,
    height: 80,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: BRAND_EMERALD,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  phoneSpeaker: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND_EMERALD,
  },
  phoneScreenArea: {
    flex: 1,
    width: "75%",
    marginVertical: 4,
    backgroundColor: "#F0FDF4",
    borderRadius: 4,
  },
  phoneHomeBar: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND_EMERALD,
  },
  phoneShieldBadge: {
    position: "absolute",
    top: -6,
    right: SCREEN_WIDTH / 2 - 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
  },
  otpHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  otpTitle: {
    fontSize: fontScale(24),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  otpSubtitle: {
    fontSize: fontScale(13),
    color: "#64748B",
    marginTop: 6,
  },
  otpPhoneText: {
    fontSize: fontScale(15),
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  otpBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 18,
    gap: 6,
  },
  otpBoxInput: {
    width: (SCREEN_WIDTH - 80) / 6,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontSize: fontScale(20),
    fontWeight: "700",
    color: "#0F172A",
  },
  otpBoxInputFilled: {
    borderColor: BRAND_DARK_GREEN,
    backgroundColor: "#FFFFFF",
  },
  resendCenterRow: {
    alignItems: "center",
    marginBottom: 22,
  },
  resendTimerText: {
    fontSize: fontScale(13),
    color: "#64748B",
    fontWeight: "500",
  },
  resendTimerHighlight: {
    color: BRAND_DARK_GREEN,
    fontWeight: "700",
  },
  resendActiveLink: {
    fontSize: fontScale(13),
    color: BRAND_DARK_GREEN,
    fontWeight: "700",
  },
  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND_MINT_BG,
    borderWidth: 1,
    borderColor: BRAND_MINT_BORDER,
    borderRadius: 14,
    padding: 14,
    marginTop: 28,
  },
  securityCardIcon: {
    marginRight: 12,
  },
  securityCardTitle: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: "#073B22",
  },
  securityCardSubtitle: {
    fontSize: fontScale(11),
    color: "#335C49",
    marginTop: 2,
    lineHeight: 16,
  },
  msgBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  msgSuccess: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  msgError: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  msgText: {
    flex: 1,
    fontSize: fontScale(12),
    fontWeight: "600",
  },
  msgSuccessText: {
    color: "#047857",
  },
  msgErrorText: {
    color: "#DC2626",
  },

  // -------------------------------------------------------------
  // REGISTRATION MODAL STYLES
  // -------------------------------------------------------------
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modalKeyboardWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: fontScale(18),
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: fontScale(12),
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  regSectionBox: {
    backgroundColor: "#F8FAF9",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  regSectionTitle: {
    fontSize: fontScale(14),
    fontWeight: "700",
    color: "#0F172A",
  },
  regSectionSub: {
    fontSize: fontScale(11),
    color: "#64748B",
    marginTop: 2,
    marginBottom: 8,
  },
  captureSelfieBtn: {
    backgroundColor: "#E8F6ED",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BRAND_DARK_GREEN,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  captureSelfieBtnTitle: {
    fontSize: fontScale(13),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
    marginTop: 4,
  },
  captureSelfieBtnSub: {
    fontSize: fontScale(10),
    color: "#475569",
    marginTop: 2,
  },
  gallerySmallBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryBtnText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: BRAND_DARK_GREEN,
    marginTop: 2,
  },
  selfiePreviewContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  selfieImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: BRAND_EMERALD,
  },
  selfieBadge: {
    position: "absolute",
    bottom: 34,
    backgroundColor: BRAND_DARK_GREEN,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  selfieBadgeText: {
    color: "#FFFFFF",
    fontSize: fontScale(10),
    fontWeight: "700",
  },
  retakeBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeBtnText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#334155",
  },
  galleryBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  locationPillContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 6,
  },
  locationPillText: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },
  locationAddressText: {
    fontSize: fontScale(11),
    color: "#475569",
    marginTop: 2,
  },
  captureLocationBtn: {
    backgroundColor: "#E8F6ED",
    borderWidth: 1,
    borderColor: BRAND_MINT_BORDER,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  fieldLabel: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#334155",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: fontScale(13),
    color: "#0F172A",
  },
  regSuccessCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginVertical: 14,
  },
  regSuccessIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  regSuccessTitle: {
    fontSize: fontScale(16),
    fontWeight: "800",
    color: "#065F46",
    textAlign: "center",
  },
  regSuccessText: {
    fontSize: fontScale(12),
    color: "#047857",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
