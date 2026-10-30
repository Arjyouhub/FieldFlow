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
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { API_BASE_URL } from "../config/api";
import { saveAuthSession, getAuthSession, clearAuthSession } from "../utils/storage";
import { Colors, Spacing, Radii, Shadows } from "../constants/theme";
import { fontScale, scale, verticalScale } from "../utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Primary dark forest green matching reference
const BRAND_DARK_GREEN = "#0D5D37";
const BRAND_EMERALD = "#10B981";
const BRAND_MINT_BG = "#E8F6ED";
const BRAND_MINT_BORDER = "#B4E3C9";

// Local image assets matching the design reference
const FieldWorkerHero = require("../../assets/images/field-worker-hero-blended.png");
const GoogleLogo = require("../../assets/images/google.png");
const BottomLeaves = require("../../assets/images/login-bottom-leaves.png");

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

  // View state: 'splash' | 'login' | 'otp' | 'register'
  const [currentView, setCurrentView] = useState<"login" | "splash" | "otp" | "register">("login");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // Login form state
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  // OTP State (Screen 3: 6 individual boxes)
  const [otpPhone, setOtpPhone] = useState("");
  const [otpMode, setOtpMode] = useState<"login" | "forgot_password">("login");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [otpMsg, setOtpMsg] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(28);

  const otpInputRefs = useRef<Array<any>>([]);
  const regScrollRef = useRef<any>(null);
  const loginScrollRef = useRef<any>(null);

  // Field Staff Registration State
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regArea, setRegArea] = useState("");
  const [regEmployeeId, setRegEmployeeId] = useState("");
  const [regSelfieUri, setRegSelfieUri] = useState<string | null>(null);
  const [regSelfieBase64, setRegSelfieBase64] = useState<string | null>(null);
  const [regLocation, setRegLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccessMsg, setRegSuccessMsg] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Track keyboard show/hide to eliminate permanent bottom blank white space
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Check existing session on startup
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { token, user } = await getAuthSession();
        if (!token) {
          if (isMounted) setIsCheckingAuth(false);
          return;
        }

        // Validate active token with backend
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${API_BASE_URL}/customers/assigned`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          if (isMounted) {
            router.replace("/dashboard");
          }
          return;
        }

        // Token expired, invalid or account inactive/deleted (401 / 403)
        console.warn(`[FieldFlow Auth] Saved session invalid (HTTP ${res.status}). Clearing local auth.`);
        await clearAuthSession();
        if (isMounted) setIsCheckingAuth(false);
      } catch (err: any) {
        // If network timed out or unverified on startup, do not auto-login to prevent stale session bypass
        console.warn("[FieldFlow Auth] Active session verification check failed:", err.message);
        if (isMounted) setIsCheckingAuth(false);
      }
    })();

    return () => {
      isMounted = false;
    };
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
    const cleanPhone = phone.trim();
    if (!cleanPhone || !password) {
      setErrorText("Please enter your mobile number or email ID and password.");
      Alert.alert("Required Fields", "Please enter your mobile number or email ID and password.");
      return;
    }

    setLoading(true);
    setErrorText("");

    // Step 1: Wipe any existing session before attempting fresh authentication
    await clearAuthSession();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneOrEmail: cleanPhone,
          password: password,
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
            ? "FieldFlow server is temporarily unavailable. Please try again shortly."
            : `Server returned HTTP ${res.status}.`
        );
      }

      // Step 2: Strictly verify HTTP status, success flag, token, and user payload
      if (!res.ok || data.success === false || !data.token || !data.user) {
        throw new Error(data.message || "Invalid mobile number or password.");
      }

      // Step 3: Verify staff status
      if (data.user.status && data.user.status !== "active") {
        throw new Error(`Account is ${data.user.status}. Please contact administrator.`);
      }

      await saveAuthSession(data.token, data.user);
      router.replace("/dashboard");
    } catch (err: any) {
      // Step 4: Ensure no residual token exists on login failure
      await clearAuthSession();
      const msg =
        err.name === "AbortError"
          ? "Connection timed out. Please check your internet connection and try again."
          : (err.message || "Unable to reach FieldFlow server. Please check network.");
      setErrorText(msg);
      Alert.alert("Login Failed", msg);
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
        if (!res.ok || !data.token || !data.user) throw new Error(data.message || "Incorrect verification code.");

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
        allowsEditing: false,
        quality: 0.7,
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

  const handleCaptureLocation = async (showAlert = true) => {
    try {
      setCapturingLocation(true);

      // 1. Verify device GPS/Location service is enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        if (showAlert) {
          Alert.alert(
            "GPS Turned Off",
            "Please turn ON GPS/Location in your phone settings to detect your coordinates."
          );
        }
        return;
      }

      // 2. Verify foreground permission
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        if (showAlert) {
          Alert.alert(
            "Location Permission Required",
            "Please allow Location permission so FieldFlow can verify your operational location."
          );
        }
        return;
      }

      // 3. Fast lock with last known position, then high accuracy current position
      let loc = await Location.getLastKnownPositionAsync({});
      try {
        const freshLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (freshLoc && freshLoc.coords) {
          loc = freshLoc;
        }
      } catch {
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
      }

      if (!loc || !loc.coords) {
        throw new Error("Unable to obtain GPS fix. Please ensure you have network & GPS signal.");
      }

      const lat = Number(loc.coords.latitude.toFixed(6));
      const lng = Number(loc.coords.longitude.toFixed(6));

      let addressStr = "";
      let detectedArea = "";

      // 4A. Native Expo reverse geocoding
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        if (reverse && reverse.length > 0) {
          const r = reverse[0];
          detectedArea = r.district || r.subregion || r.city || r.name || "";
          const parts = [
            r.name && r.name !== r.street ? r.name : null,
            r.street,
            r.subregion || r.district,
            r.city || r.region,
          ].filter(Boolean);
          if (parts.length > 0) {
            addressStr = parts.join(", ");
          }
        }
      } catch (geocodeErr) {
        console.warn("Expo reverse geocode error:", geocodeErr);
      }

      // 4B. OpenStreetMap Nominatim reverse geocoding fallback
      if (!addressStr) {
        try {
          const controller = new AbortController();
          const tId = setTimeout(() => controller.abort(), 3500);
          const osmRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            {
              headers: { "User-Agent": "FieldFlowStaffApp/1.0" },
              signal: controller.signal,
            }
          );
          clearTimeout(tId);
          if (osmRes.ok) {
            const osmData = await osmRes.json();
            if (osmData && osmData.address) {
              const a = osmData.address;
              detectedArea = a.city || a.town || a.suburb || a.village || a.county || a.state_district || "";
              const parts = [
                a.road || a.pedestrian || a.suburb,
                a.city || a.town || a.village || a.county,
                a.state_district || a.state,
              ].filter(Boolean);
              if (parts.length > 0) {
                addressStr = parts.join(", ");
              } else if (osmData.display_name) {
                addressStr = osmData.display_name.split(",").slice(0, 3).join(",").trim();
              }
            }
          }
        } catch (osmErr) {
          console.warn("OSM reverse geocode error:", osmErr);
        }
      }

      if (!addressStr) {
        addressStr = `GPS Verified (${lat}, ${lng})`;
      }

      setRegLocation({
        lat,
        lng,
        address: addressStr,
      });

      // Auto-fill Operating Area if not manually typed
      if (detectedArea && (!regArea || regArea.trim() === "Kozhikode Central")) {
        setRegArea(detectedArea);
      }
    } catch (err: any) {
      if (showAlert) {
        Alert.alert(
          "GPS Location Detection",
          err.message || "Failed to detect current location. Please verify device GPS is active and tap Refresh."
        );
      }
    } finally {
      setCapturingLocation(false);
    }
  };

  // Automatically capture device GPS coordinates when opening Create Account
  useEffect(() => {
    if (currentView === "register" && !regLocation && !capturingLocation) {
      handleCaptureLocation(false);
    }
  }, [currentView]);

  const handleSubmitRegistration = async () => {
    if (!regName.trim()) {
      setRegError("Please enter your full name.");
      return;
    }
    const trimmedId = regPhone.trim();
    const isEmail = trimmedId.includes("@");
    if (!trimmedId || (!isEmail && trimmedId.replace(/\D/g, "").length < 10) || (isEmail && !trimmedId.includes("."))) {
      setRegError("Please enter a valid 10-digit mobile number or email ID.");
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
          phone: trimmedId,
          email: isEmail ? trimmedId.toLowerCase() : undefined,
          password: regPassword,
          assignedArea: regArea.trim(),
          employeeId: regEmployeeId.trim() || undefined,
          profilePhoto: regSelfieBase64 || regSelfieUri || "",
          location: regLocation || undefined,
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
  // SCREEN 0: SECURE AUTH VERIFICATION SPLASH
  // =============================================================
  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND_DARK_GREEN, justifyContent: "center", alignItems: "center" }}>
        <DualLeafLogo size={56} light />
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#FFFFFF", marginTop: 16, letterSpacing: 0.5 }}>
          FieldFlow
        </Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 4 }}>
          Field Operations Platform
        </Text>
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 28 }} />
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 12 }}>
          Verifying secure session...
        </Text>
      </View>
    );
  }

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
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4 }}>
              Powered by GETLUX
            </Text>

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
        {/* Ambient background glows */}
        <View style={styles.ambientGlowTop} pointerEvents="none" />
        <View style={styles.ambientGlowBottom} pointerEvents="none" />

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
  // SCREEN: FULL-PAGE CREATE STAFF ACCOUNT (Self-Registration)
  // =============================================================
  if (currentView === "register") {
    return (
      <View style={styles.registerFullScreenContainer}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          {/* Top Modern App Bar */}
          <View style={styles.modernRegTopBar}>
            <Pressable
              onPress={() => {
                setCurrentView("login");
                setRegError("");
              }}
              style={styles.modernRegBackBtn}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.modernRegTitle}>Create Account</Text>
                <View style={styles.modernRegStaffBadge}>
                  <Text style={styles.modernRegStaffBadgeText}>Staff</Text>
                </View>
              </View>
              <Text style={styles.modernRegSubtitle}>
                Enter details & credentials for admin approval
              </Text>
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              ref={regScrollRef}
              contentContainerStyle={[
                styles.modernRegScrollContent,
                isKeyboardVisible && { paddingBottom: 140 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {regError ? (
                <View style={styles.modernRegErrorBox}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={styles.modernRegErrorText}>{regError}</Text>
                </View>
              ) : null}

              {regSuccessMsg ? (
                <View style={styles.modernRegSuccessCard}>
                  <View style={styles.modernRegSuccessIconCircle}>
                    <Ionicons name="shield-checkmark" size={38} color="#059669" />
                  </View>
                  <Text style={styles.modernRegSuccessTitle}>Application Submitted</Text>
                  <View style={styles.modernRegPendingPill}>
                    <Ionicons name="time-outline" size={14} color="#D97706" />
                    <Text style={styles.modernRegPendingPillText}>Awaiting Admin Approval</Text>
                  </View>
                  <Text style={styles.modernRegSuccessText}>{regSuccessMsg}</Text>
                  <Pressable
                    style={styles.modernRegSuccessBtn}
                    onPress={() => {
                      setCurrentView("login");
                      setRegSuccessMsg("");
                    }}
                  >
                    <Text style={styles.modernRegSuccessBtnText}>Proceed to Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Step Progress Indicator Bar */}
                  {/* Step Progress Indicator Bar */}
                  <View style={styles.modernStepPillsRow}>
                    <View style={[styles.modernStepPill, regSelfieUri ? styles.modernStepPillActive : null]}>
                      <Ionicons name={regSelfieUri ? "checkmark-circle" : "camera-outline"} size={14} color={regSelfieUri ? "#059669" : "#64748B"} />
                      <Text style={[styles.modernStepPillText, regSelfieUri ? styles.modernStepPillTextActive : null]}>Photo</Text>
                    </View>
                    <View style={styles.modernStepPillDivider} />
                    <View style={[styles.modernStepPill, regLocation ? styles.modernStepPillActive : null]}>
                      <Ionicons name={regLocation ? "checkmark-circle" : "location-outline"} size={14} color={regLocation ? "#059669" : "#64748B"} />
                      <Text style={[styles.modernStepPillText, regLocation ? styles.modernStepPillTextActive : null]}>Location</Text>
                    </View>
                    <View style={styles.modernStepPillDivider} />
                    <View style={[styles.modernStepPill, regPhone && regPassword ? styles.modernStepPillActive : null]}>
                      <Ionicons name={regPhone && regPassword ? "checkmark-circle" : "lock-closed-outline"} size={14} color={regPhone && regPassword ? "#059669" : "#64748B"} />
                      <Text style={[styles.modernStepPillText, regPhone && regPassword ? styles.modernStepPillTextActive : null]}>Login</Text>
                    </View>
                  </View>

                  {/* 1. STAFF VERIFICATION PHOTO */}
                  <View style={styles.modernRegCard}>
                    <View style={styles.modernCardHeaderRow}>
                      <View style={[styles.modernCardIconBox, { backgroundColor: "#DCFCE7" }]}>
                        <Ionicons name="camera" size={18} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modernCardTitle}>Staff Verification Photo</Text>
                        <Text style={styles.modernCardSub}>Front-facing portrait for identity check</Text>
                      </View>
                    </View>

                    {regSelfieUri ? (
                      <View style={styles.modernRoundSelfieWrap}>
                        {/* Round selfie with verified ring */}
                        <View style={styles.modernRoundRing}>
                          <Image source={{ uri: regSelfieUri }} style={styles.modernRoundImg} />
                          <View style={styles.modernRoundBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                            <Text style={styles.modernRoundBadgeText}>Verified</Text>
                          </View>
                        </View>
                        <Text style={styles.modernRoundTitle}>Selfie Captured</Text>
                        <Pressable
                          style={({ pressed }) => [
                            styles.modernRoundRetakeBtn,
                            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                          ]}
                          onPress={handleCaptureSelfie}
                        >
                          <Ionicons name="camera-reverse" size={15} color="#059669" />
                          <Text style={styles.modernRoundRetakeText}>Retake Selfie</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.modernRoundSelfieWrap}>
                        {/* Round selfie button */}
                        <Pressable
                          style={({ pressed }) => [
                            styles.modernRoundBtn,
                            pressed && styles.modernRoundBtnPressed,
                          ]}
                          onPress={handleCaptureSelfie}
                        >
                          <View style={styles.modernRoundInnerCircle}>
                            <Ionicons name="camera" size={32} color="#059669" />
                          </View>
                          <View style={styles.modernRoundPlusBadge}>
                            <Ionicons name="add" size={14} color="#FFFFFF" />
                          </View>
                        </Pressable>
                        <Text style={styles.modernRoundTitle}>Take Front Selfie</Text>
                        <Text style={styles.modernRoundSub}>Tap circle to open device camera</Text>
                      </View>
                    )}
                  </View>

                  {/* 2. OPERATIONAL LOCATION & GPS */}
                  <View style={styles.modernRegCard}>
                    <View style={styles.modernCardHeaderRow}>
                      <View style={[styles.modernCardIconBox, { backgroundColor: "#E0F2FE" }]}>
                        <Ionicons name="location" size={18} color="#0284C7" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modernCardTitle}>Operating Location & GPS</Text>
                        <Text style={styles.modernCardSub}>Tag sign-up coordinates & recovery location</Text>
                      </View>
                    </View>

                    {/* GPS Coordinates Box */}
                    {regLocation ? (
                      <View style={styles.modernGpsBox}>
                        <View style={styles.modernGpsDot} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name="navigate-circle" size={14} color="#059669" />
                            <Text style={styles.modernGpsCoords}>
                              {regLocation.lat}, {regLocation.lng}
                            </Text>
                          </View>
                          <Text style={styles.modernGpsAddress}>
                            {regLocation.address}
                          </Text>
                        </View>
                        <Pressable onPress={() => handleCaptureLocation(true)} hitSlop={6} style={styles.modernGpsRefreshBtn}>
                          <Ionicons name="refresh" size={14} color={BRAND_DARK_GREEN} />
                          <Text style={styles.modernGpsRefreshText}>
                            {capturingLocation ? "..." : "Refresh"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable style={styles.modernGpsTagBtn} onPress={() => handleCaptureLocation(true)}>
                        <Ionicons name="navigate-circle-outline" size={20} color={BRAND_DARK_GREEN} />
                        <Text style={styles.modernGpsTagText}>
                          {capturingLocation ? "Detecting high-precision GPS..." : "Tap to Tag My Current Location"}
                        </Text>
                      </Pressable>
                    )}

                    {/* Operating Area Input with Icon Prefix */}
                    <Text style={styles.modernInputLabel}>Assigned Operational Area / Location *</Text>
                    <View style={styles.regModernInputWrapper}>
                      <Ionicons name="map-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.modernInputFlex}
                        placeholder="e.g. Kozhikode, Ernakulam, Thrissur"
                        placeholderTextColor={theme.textMuted}
                        value={regArea}
                        onChangeText={setRegArea}
                      />
                    </View>
                  </View>

                  {/* 3. PERSONAL & LOGIN CREDENTIALS */}
                  <View style={styles.modernRegCard}>
                    <View style={styles.modernCardHeaderRow}>
                      <View style={[styles.modernCardIconBox, { backgroundColor: "#FEF3C7" }]}>
                        <Ionicons name="shield-checkmark" size={18} color="#D97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modernCardTitle}>Personal & Login Credentials</Text>
                        <Text style={styles.modernCardSub}>Mobile number will be your sign-in username</Text>
                      </View>
                    </View>

                    {/* Full Name */}
                    <Text style={styles.modernInputLabel}>Full Legal Name *</Text>
                    <View style={styles.regModernInputWrapper}>
                      <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.modernInputFlex}
                        placeholder="e.g. Akhil V"
                        placeholderTextColor={theme.textMuted}
                        value={regName}
                        onChangeText={setRegName}
                      />
                    </View>

                    {/* Mobile Number or Email ID */}
                    <Text style={styles.modernInputLabel}>Mobile Number or Email ID *</Text>
                    <View style={styles.regModernInputWrapper}>
                      <Ionicons name="mail-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.modernInputFlex}
                        placeholder="e.g. 9876543210 or user@fieldflow.com"
                        placeholderTextColor={theme.textMuted}
                        value={regPhone}
                        onChangeText={setRegPhone}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    {/* Employee / Agent ID */}
                    <Text style={styles.modernInputLabel}>Employee / Staff ID (Optional)</Text>
                    <View style={styles.regModernInputWrapper}>
                      <Ionicons name="id-card-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.modernInputFlex}
                        placeholder="e.g. STF-201"
                        placeholderTextColor={theme.textMuted}
                        value={regEmployeeId}
                        onChangeText={setRegEmployeeId}
                      />
                    </View>

                    {/* Password */}
                    <Text style={styles.modernInputLabel}>Login Password *</Text>
                    <View style={styles.regModernInputWrapper}>
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.modernInputFlex}
                        placeholder="Create a strong password"
                        placeholderTextColor={theme.textMuted}
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry={!showRegPassword}
                        onFocus={() => {
                          setTimeout(() => {
                            regScrollRef.current?.scrollToEnd({ animated: true });
                          }, 150);
                        }}
                      />
                      <Pressable
                        onPress={() => setShowRegPassword(!showRegPassword)}
                        style={styles.modernEyeBtn}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={showRegPassword ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color="#64748B"
                        />
                      </Pressable>
                    </View>

                    {/* Confirm Password */}
                    <Text style={styles.modernInputLabel}>Confirm Password *</Text>
                    <View style={styles.regModernInputWrapper}>
                      <Ionicons name="shield-checkmark-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.modernInputFlex}
                        placeholder="Re-enter password to confirm"
                        placeholderTextColor={theme.textMuted}
                        value={regConfirmPassword}
                        onChangeText={setRegConfirmPassword}
                        secureTextEntry={!showRegConfirmPassword}
                        onFocus={() => {
                          setTimeout(() => {
                            regScrollRef.current?.scrollToEnd({ animated: true });
                          }, 150);
                        }}
                      />
                      <Pressable
                        onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        style={styles.modernEyeBtn}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={showRegConfirmPassword ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color="#64748B"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* SUBMIT BUTTON */}
                  <View style={{ marginTop: 10, marginBottom: 10 }}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modernSubmitBtn,
                        pressed && styles.modernSubmitBtnPressed,
                        submittingReg && styles.buttonDisabled,
                      ]}
                      onPress={handleSubmitRegistration}
                      disabled={submittingReg}
                    >
                      {submittingReg ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.modernSubmitBtnText}>Submit Registration for Approval</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // =============================================================
  // SCREEN 2: LOGIN SCREEN VIEW (Matches Reference Design)
  // =============================================================
  return (
    <SafeAreaView style={styles.exactScreenContainer} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={loginScrollRef}
          contentContainerStyle={[
            styles.exactScrollContent,
            isKeyboardVisible && { paddingBottom: 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ========================================================= */}
          {/* TOP SECTION: DARK GREEN + FIELD WORKER HERO + BRANDING */}
          {/* ========================================================= */}
          <View style={[styles.exactHeaderSection, { paddingTop: 12 }]}>
            {/* Field Worker Photo on Right (Clean green polo, no logos) */}
            <Image
              source={FieldWorkerHero}
              style={styles.exactWorkerImage}
              resizeMode="cover"
            />

            {/* Left Content Column */}
            <View style={styles.exactHeaderLeftCol}>
              {/* Logo + App Title Row */}
              <View style={styles.exactLogoRow}>
                <DualLeafLogo size={36} light />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.exactBrandTitle}>FieldFlow</Text>
                  <Text style={styles.exactBrandSubtitle}>Field Staff App</Text>
                  <Text style={{ fontSize: 9.5, color: "rgba(255,255,255,0.75)", fontWeight: "700", letterSpacing: 0.6, marginTop: 1, textTransform: "uppercase" }}>
                    Powered by GETLUX
                  </Text>
                </View>
              </View>

              {/* Tagline */}
              <View style={styles.exactTaglineBox}>
                <Text style={styles.exactTaglineMain}>Smarter Collection</Text>
                <Text style={styles.exactTaglineMain}>
                  Stronger <Text style={styles.exactTaglineMint}>Tomorrow</Text>
                </Text>
              </View>

              {/* 3 Circular Feature Badges */}
              <View style={styles.exactFeaturesRow}>
                {/* Feature 1: Visit Track */}
                <View style={styles.exactFeatureItem}>
                  <View style={styles.exactFeatureCircle}>
                    <Ionicons name="location" size={17} color="#FFFFFF" />
                  </View>
                  <Text style={styles.exactFeatureLabel}>Visit{"\n"}Track</Text>
                </View>

                {/* Feature 2: Manage Cases */}
                <View style={styles.exactFeatureItem}>
                  <View style={styles.exactFeatureCircle}>
                    <Ionicons name="people" size={17} color="#FFFFFF" />
                  </View>
                  <Text style={styles.exactFeatureLabel}>Manage{"\n"}Cases</Text>
                </View>

                {/* Feature 3: Better Results */}
                <View style={styles.exactFeatureItem}>
                  <View style={styles.exactFeatureCircle}>
                    <Ionicons name="stats-chart" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.exactFeatureLabel}>Better{"\n"}Results</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ========================================================= */}
          {/* BOTTOM WHITE SHEET: LOGIN FORM & ACTION BUTTONS */}
          {/* ========================================================= */}
          <View style={styles.exactWhiteCard}>
            <Text style={styles.exactWelcomeTitle}>Welcome Back</Text>
            <Text style={styles.exactWelcomeSub}>Login to continue to FieldFlow</Text>

            {/* Error Message Box */}
            {errorText ? (
              <View style={styles.exactErrorBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.exactErrorText}>{errorText}</Text>
              </View>
            ) : null}

            {/* Input 1: Mobile Number or Email ID */}
            <View style={styles.exactInputContainer}>
              <Ionicons
                name="person-outline"
                size={19}
                color="#64748B"
                style={{ marginRight: scale(10) }}
              />
              <TextInput
                style={styles.exactTextInput}
                placeholder="Enter mobile or email ID"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (errorText) setErrorText("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                keyboardType="email-address"
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
              />
            </View>

            {/* Input 2: Password */}
            <View style={[styles.exactInputContainer, { marginTop: verticalScale(12) }]}>
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color="#64748B"
                style={{ marginRight: scale(10) }}
              />
              <TextInput
                style={styles.exactTextInput}
                placeholder="Enter password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorText) setErrorText("");
                }}
                onFocus={() => {
                  setTimeout(() => {
                    loginScrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                autoCorrect={false}
                spellCheck={false}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.exactEyeBtn}
                hitSlop={10}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>

            {/* Forgot Password Link (Right Aligned) */}
            <View style={styles.exactForgotRow}>
              <Pressable
                onPress={() => handleRequestOtp(phone, "forgot_password")}
                hitSlop={8}
              >
                <Text style={styles.exactForgotLink}>Forgot Password?</Text>
              </Pressable>
            </View>

            {/* Primary Action Button: "Login ->" */}
            <Pressable
              style={({ pressed }) => [
                styles.exactLoginBtn,
                pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.exactBtnContentRow}>
                  <Text style={styles.exactLoginBtnText}>Login</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </View>
              )}
            </Pressable>

            {/* "OR" Divider */}
            <View style={styles.exactDividerRow}>
              <View style={styles.exactDividerLine} />
              <Text style={styles.exactDividerText}>OR</Text>
              <View style={styles.exactDividerLine} />
            </View>

            {/* "Continue with Google" Button */}
            <Pressable
              style={({ pressed }) => [
                styles.exactGoogleBtn,
                pressed && { backgroundColor: "#F8FAFC" },
              ]}
              onPress={() => {
                Alert.alert(
                  "Google Sign-In",
                  "Google Workspace authentication is enabled for registered staff. Use your staff credentials to sign in directly.",
                  [{ text: "OK" }]
                );
              }}
            >
              <Image source={GoogleLogo} style={styles.exactGoogleIcon} resizeMode="contain" />
              <Text style={styles.exactGoogleBtnText}>Continue with Google</Text>
            </Pressable>

            {/* "Create Account" Button */}
            <Pressable
              style={({ pressed }) => [
                styles.exactCreateAccountBtn,
                pressed && { backgroundColor: "#DCFCE7", transform: [{ scale: 0.99 }] },
              ]}
              onPress={() => {
                setCurrentView("register");
                setRegError("");
                setRegSuccessMsg("");
              }}
            >
              <Ionicons name="person-add-outline" size={18} color={BRAND_DARK_GREEN} />
              <Text style={styles.exactCreateAccountBtnText}>Create Account</Text>
            </Pressable>

            {/* Footer Contact Admin */}
            <View style={styles.exactFooterRow}>
              <Text style={styles.exactFooterText}>Need help? </Text>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Contact FieldFlow Admin",
                    "For account assistance, location changes, or supervisor approvals:\n\nEmail: admin@fieldflow.local\nSupport: +91 9876543210"
                  );
                }}
                hitSlop={8}
              >
                <Text style={styles.exactFooterLink}>Contact Admin</Text>
              </Pressable>
            </View>

            <View style={{ alignItems: "center", marginTop: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>
                Powered by <Text style={{ color: "#00A86B", fontWeight: "800" }}>GETLUX</Text>
              </Text>
            </View>

            {/* Soft decorative leaves at bottom corners */}
            <View pointerEvents="none" style={styles.exactBottomLeaves}>
              <Image
                source={BottomLeaves}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 36,
    justifyContent: "center",
  },

  // Soft ambient background glows
  ambientGlowTop: {
    position: "absolute",
    top: -80,
    alignSelf: "center",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  ambientGlowBottom: {
    position: "absolute",
    bottom: -60,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(13, 93, 55, 0.05)",
  },

  // Ultra-Modern Header Bar
  modernTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  securityStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    gap: 7,
  },
  pulseLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  securityStatusText: {
    fontSize: fontScale(11.5),
    fontWeight: "700",
    color: "#065F46",
    letterSpacing: 0.3,
  },
  encryptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    gap: 5,
  },
  encryptedText: {
    fontSize: fontScale(11.5),
    fontWeight: "600",
    color: "#64748B",
  },

  // Modern Hero Branding
  brandHeroSection: {
    alignItems: "center",
    marginBottom: 26,
  },
  logoTileWrapper: {
    padding: 8,
    borderRadius: 26,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    marginBottom: 14,
    shadowColor: BRAND_EMERALD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 2,
  },
  logoTile: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    ...Shadows.sm,
  },
  brandHeroTitle: {
    fontSize: fontScale(28),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  brandHeroSubtitle: {
    fontSize: fontScale(13),
    color: "#64748B",
    marginTop: 5,
    fontWeight: "500",
  },

  // Modern Elevated Card
  modernCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  cardHeaderBox: {
    marginBottom: 18,
  },
  cardHeaderTitle: {
    fontSize: fontScale(18),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  cardHeaderSub: {
    fontSize: fontScale(12.5),
    color: "#64748B",
    marginTop: 3,
  },

  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: fontScale(12.5),
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  modernInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: BRAND_DARK_GREEN,
    backgroundColor: "#FFFFFF",
    shadowColor: BRAND_DARK_GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  inputIconBox: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modernTextInput: {
    flex: 1,
    fontSize: fontScale(14),
    color: "#0F172A",
    fontWeight: "500",
    paddingHorizontal: 8,
  },
  eyeToggleBtn: {
    padding: 6,
  },

  // Options Row
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
    borderRadius: 6,
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

  // Primary Button
  primaryButton: {
    backgroundColor: BRAND_DARK_GREEN,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BRAND_DARK_GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: fontScale(15),
    fontWeight: "700",
    letterSpacing: 0.3,
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
    backgroundColor: "#F1F5F9",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: fontScale(11.5),
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },

  // Outlined OTP Button
  outlineOtpBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineOtpBtnText: {
    fontSize: fontScale(14.5),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },

  // Demo shortcut pill
  demoFillPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    marginTop: 20,
    gap: 8,
    ...Shadows.sm,
  },
  demoFillIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
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

  // =========================================================
  // EXACT REFERENCE STYLES (Screen 2)
  // =========================================================
  exactScreenContainer: {
    flex: 1,
    backgroundColor: "#073B22",
  },
  exactScrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  exactHeaderSection: {
    backgroundColor: "#073B22",
    minHeight: verticalScale(250),
    position: "relative",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
    overflow: "hidden",
  },
  exactWorkerImage: {
    position: "absolute",
    right: -10,
    top: 20,
    width: scale(190),
    height: verticalScale(240),
    opacity: 0.95,
  },
  exactHeaderLeftCol: {
    width: "65%",
    zIndex: 2,
  },
  exactLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(14),
  },
  exactBrandTitle: {
    fontSize: fontScale(22),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  exactBrandSubtitle: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#A7F3D0",
    marginTop: -2,
  },
  exactTaglineBox: {
    marginBottom: verticalScale(16),
  },
  exactTaglineMain: {
    fontSize: fontScale(17),
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 23,
    letterSpacing: -0.3,
  },
  exactTaglineMint: {
    color: "#34D399",
  },
  exactFeaturesRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  exactFeatureItem: {
    alignItems: "center",
  },
  exactFeatureCircle: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  exactFeatureLabel: {
    fontSize: fontScale(10),
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 13,
  },
  exactWhiteCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: scale(22),
    paddingTop: verticalScale(26),
    paddingBottom: verticalScale(28),
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  exactWelcomeTitle: {
    fontSize: fontScale(24),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  exactWelcomeSub: {
    fontSize: fontScale(13),
    color: "#64748B",
    marginTop: 4,
    marginBottom: verticalScale(18),
  },
  exactErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 10,
    marginBottom: verticalScale(14),
  },
  exactErrorText: {
    fontSize: fontScale(12),
    color: "#DC2626",
    flex: 1,
  },
  exactInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: scale(14),
    height: verticalScale(48),
  },
  exactInputContainerFocused: {
    borderColor: BRAND_DARK_GREEN,
    backgroundColor: "#FFFFFF",
    shadowColor: BRAND_DARK_GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  exactTextInput: {
    flex: 1,
    fontSize: fontScale(14.5),
    fontWeight: "600",
    color: "#0F172A",
    paddingVertical: 0,
    height: "100%",
  },
  exactEyeBtn: {
    padding: 6,
    marginLeft: scale(4),
  },
  exactForgotRow: {
    alignItems: "flex-end",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(18),
  },
  exactForgotLink: {
    fontSize: fontScale(12.5),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },
  exactLoginBtn: {
    backgroundColor: "#0A6038",
    borderRadius: 16,
    height: verticalScale(52),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0A6038",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exactBtnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  exactLoginBtnText: {
    fontSize: fontScale(16),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  exactDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: verticalScale(16),
  },
  exactDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  exactDividerText: {
    marginHorizontal: 12,
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#94A3B8",
  },
  exactGoogleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: verticalScale(50),
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: verticalScale(12),
  },
  exactGoogleIcon: {
    width: 20,
    height: 20,
  },
  exactGoogleBtnText: {
    fontSize: fontScale(14.5),
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 10,
  },
  exactActivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E8F7ED",
    borderRadius: 16,
    height: verticalScale(52),
    borderWidth: 1,
    borderColor: "#B4E3C9",
    paddingHorizontal: scale(16),
  },
  exactActivateBtnText: {
    fontSize: fontScale(14.5),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
    marginLeft: 10,
  },
  exactActivateHelperText: {
    fontSize: fontScale(12),
    color: "#64748B",
    textAlign: "center",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(12),
  },
  exactDemoPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "center",
    marginBottom: verticalScale(14),
    gap: 6,
  },
  exactDemoPillText: {
    fontSize: fontScale(11),
    fontWeight: "600",
    color: "#475569",
  },
  exactFooterRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  exactFooterText: {
    fontSize: fontScale(12.5),
    color: "#64748B",
  },
  exactFooterLink: {
    fontSize: fontScale(12.5),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },
  exactBottomLeaves: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: verticalScale(65),
    opacity: 0.35,
    zIndex: -1,
  },
  // Compact Create Account Button (Login Screen)
  exactCreateAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    height: verticalScale(50),
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    gap: 8,
    marginBottom: verticalScale(14),
  },
  exactCreateAccountBtnText: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },
  // Full-Screen Create Staff Account Page
  registerFullScreenContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modernRegTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  modernRegBackBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modernRegTitle: {
    fontSize: fontScale(18),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  modernRegStaffBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  modernRegStaffBadgeText: {
    fontSize: fontScale(10.5),
    fontWeight: "800",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modernRegSubtitle: {
    fontSize: fontScale(12),
    color: "#64748B",
    marginTop: 1,
  },
  modernRegScrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(16),
  },
  modernRegErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 12,
    marginBottom: verticalScale(14),
  },
  modernRegErrorText: {
    fontSize: fontScale(12.5),
    color: "#DC2626",
    flex: 1,
    fontWeight: "500",
  },
  modernRegSuccessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: scale(24),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: verticalScale(20),
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  modernRegSuccessIconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
    borderWidth: 2,
    borderColor: "#A7F3D0",
  },
  modernRegSuccessTitle: {
    fontSize: fontScale(20),
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  modernRegPendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  modernRegPendingPillText: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#D97706",
  },
  modernRegSuccessText: {
    fontSize: fontScale(13.5),
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: verticalScale(16),
  },
  modernRegSuccessBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A6038",
    borderRadius: 16,
    height: verticalScale(50),
    paddingHorizontal: scale(28),
    gap: 8,
    shadowColor: "#0A6038",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modernRegSuccessBtnText: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modernStepPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: verticalScale(14),
  },
  modernStepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modernStepPillActive: {
    backgroundColor: "#F0FDF4",
  },
  modernStepPillDivider: {
    width: 14,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  modernStepPillText: {
    fontSize: fontScale(12),
    fontWeight: "600",
    color: "#64748B",
  },
  modernStepPillTextActive: {
    color: "#059669",
    fontWeight: "700",
  },
  modernRegCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: scale(16),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: verticalScale(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  modernCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: verticalScale(10),
  },
  modernCardIconBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modernCardTitle: {
    fontSize: fontScale(15),
    fontWeight: "700",
    color: "#0F172A",
  },
  modernCardSub: {
    fontSize: fontScale(11.5),
    color: "#64748B",
    marginTop: 1,
  },
  modernRoundSelfieWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
  },
  modernRoundBtn: {
    width: scale(116),
    height: scale(116),
    borderRadius: scale(58),
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  modernRoundBtnPressed: {
    backgroundColor: "#DCFCE7",
    transform: [{ scale: 0.96 }],
  },
  modernRoundInnerCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  modernRoundPlusBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modernRoundRing: {
    position: "relative",
    width: scale(116),
    height: scale(116),
    borderRadius: scale(58),
    borderWidth: 2.5,
    borderColor: "#10B981",
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  modernRoundImg: {
    width: scale(106),
    height: scale(106),
    borderRadius: scale(53),
  },
  modernRoundBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    elevation: 3,
  },
  modernRoundBadgeText: {
    fontSize: fontScale(10.5),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modernRoundTitle: {
    fontSize: fontScale(14),
    fontWeight: "800",
    color: "#0F172A",
    marginTop: verticalScale(10),
  },
  modernRoundSub: {
    fontSize: fontScale(11.5),
    color: "#64748B",
    marginTop: 2,
  },
  modernRoundRetakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#10B981",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: 14,
    marginTop: verticalScale(10),
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  modernRoundRetakeText: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#059669",
  },
  modernGpsBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: scale(12),
    gap: 10,
    marginTop: 6,
  },
  modernGpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  modernGpsCoords: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#065F46",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modernGpsAddress: {
    fontSize: fontScale(12),
    color: "#475569",
    marginTop: 2,
  },
  modernGpsRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modernGpsRefreshText: {
    fontSize: fontScale(11),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },
  modernGpsTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#94A3B8",
    borderRadius: 14,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    gap: 8,
    marginTop: 6,
  },
  modernGpsTagText: {
    fontSize: fontScale(12.5),
    fontWeight: "700",
    color: BRAND_DARK_GREEN,
  },
  modernInputLabel: {
    fontSize: fontScale(12),
    fontWeight: "700",
    color: "#475569",
    marginTop: verticalScale(12),
    marginBottom: verticalScale(4),
  },
  regModernInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: scale(12),
    height: verticalScale(48),
  },
  modernInputFlex: {
    flex: 1,
    fontSize: fontScale(14),
    fontWeight: "600",
    color: "#0F172A",
    paddingVertical: 0,
  },
  modernPhonePrefixBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  modernPhonePrefixText: {
    fontSize: fontScale(12.5),
    fontWeight: "700",
    color: "#334155",
  },
  modernEyeBtn: {
    padding: 6,
  },
  modernSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A6038",
    borderRadius: 16,
    height: verticalScale(52),
    shadowColor: "#0A6038",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modernSubmitBtnPressed: {
    backgroundColor: "#084e2e",
    transform: [{ scale: 0.99 }],
  },
  modernSubmitBtnText: {
    fontSize: fontScale(15.5),
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
