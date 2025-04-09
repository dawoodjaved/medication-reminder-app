import React from 'react';
import { TextStyle } from 'react-native';
import { Link, LinkProps } from 'expo-router';
import { useFontSize } from '../../context/fontSizeContext';

export const AppLink = ({ style, ...props }: LinkProps & { style?: TextStyle }) => {
  const { fontSize } = useFontSize();
  return <Link {...props} style={[{ fontSize }, style]} />;
};
