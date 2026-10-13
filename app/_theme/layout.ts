import { Platform, useWindowDimensions } from 'react-native';

const BASE_WIDTH = 390;

/** Shared FlatList tuning for smooth Android scroll. */
export const LIST_PERF = {
  removeClippedSubviews: Platform.OS === 'android',
  maxToRenderPerBatch: 8,
  windowSize: 7,
  initialNumToRender: 8,
  updateCellsBatchingPeriod: 50,
} as const;

/** Responsive layout tokens for phone screen sizes (esp. small Android). */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 360;
  const isNarrow = width < 380;
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.12);
  const contentPad = isCompact ? 12 : isNarrow ? 16 : 24;
  const titleSize = isCompact ? 26 : isNarrow ? 28 : 32;
  const heroPad = isCompact ? 14 : 20;
  const chipSize = isCompact ? 42 : 48;
  const listBottom = Math.max(36, 24 + (height < 700 ? 12 : 16));

  return {
    width,
    height,
    isCompact,
    isNarrow,
    scale,
    contentPad,
    titleSize,
    heroPad,
    chipSize,
    listBottom,
    s: (n: number) => Math.round(n * scale),
  };
}
