// components/AppText.tsx
import React from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { useFontSize } from '../../context/fontSizeContext';

export const AppText = ({ style, ...props }: TextProps) => {
  const { fontSize } = useFontSize();

  return (
    <Text
      {...props}
      style={[{ fontSize: fontSize ?? 18 }, style as StyleProp<TextStyle>]}
    />
  );
};
