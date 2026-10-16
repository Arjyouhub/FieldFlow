import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base guidelines based on standard phone (iPhone 13 / Pixel 5: 390 x 844)
const baseWidth = 390;
const baseHeight = 844;

/**
 * Responsive horizontal scale
 */
export const scale = (size: number): number => {
  const scaled = (SCREEN_WIDTH / baseWidth) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Responsive vertical scale
 */
export const verticalScale = (size: number): number => {
  const scaled = (SCREEN_HEIGHT / baseHeight) * size;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Moderate scale with configurable damping factor
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  const scaled = size + (scale(size) - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Responsive font scale with safe min/max clamps to prevent overflow/clipping
 */
export const fontScale = (size: number, minScale = 0.85, maxScale = 1.25): number => {
  const pixelRatio = PixelRatio.getFontScale();
  const clampedRatio = Math.min(Math.max(pixelRatio, minScale), maxScale);
  const widthRatio = Math.min(Math.max(SCREEN_WIDTH / baseWidth, 0.85), 1.2);
  const calculated = size * widthRatio * (clampedRatio > 1.15 ? 1.05 : 1);
  return Math.round(PixelRatio.roundToNearestPixel(calculated));
};

export const isSmallDevice = SCREEN_WIDTH < 360;
export const isTablet = SCREEN_WIDTH >= 768;
export const windowWidth = SCREEN_WIDTH;
export const windowHeight = SCREEN_HEIGHT;
