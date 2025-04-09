import React from 'react';
import { TextInput, TextInputProps, StyleProp, TextStyle } from 'react-native';
import { useFontSize } from '../../context/fontSizeContext';

export const AppTextInput = ({ style, ...props }: TextInputProps) => {
  const { fontSize } = useFontSize();

  return (
    <TextInput
      {...props}
      style={[{ fontSize }, style as StyleProp<TextStyle>]}
      placeholderTextColor="#888"
    />
  );
};
