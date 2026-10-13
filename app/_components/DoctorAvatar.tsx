import React, { memo, useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Text } from './customizableFontElements';
import { colors } from '../_theme/colors';

type Props = {
  photoUrl?: string;
  initials?: string;
  size?: number;
  style?: ViewStyle;
};

/** Doctor avatar: remote photo when available, else initials chip. */
export const DoctorAvatar = memo(function DoctorAvatar({
  photoUrl,
  initials = 'DR',
  size = 48,
  style,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(photoUrl) && !failed;
  const radius = size / 2;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
          {...(Platform.OS === 'android' ? { fadeDuration: 0 } : null)}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.32) }]}>
          {(initials || 'DR').slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.white,
    fontWeight: '800',
  },
});
