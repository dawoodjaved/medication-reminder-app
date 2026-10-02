import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FontSize = 'small' | 'medium' | 'large';

const sizes = {
  small: 14,
  medium: 18,
  large: 22,
};

const STORAGE_KEY = 'medrem_font_size';

const FontSizeContext = createContext({
  size: 'medium' as FontSize,
  fontSize: sizes.medium,
  setSize: (_size: FontSize) => {},
  ready: false,
});

export const FontSizeProvider = ({ children }: { children: ReactNode }) => {
  const [size, setSizeState] = useState<FontSize>('medium');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'small' || v === 'medium' || v === 'large') setSizeState(v);
      setReady(true);
    });
  }, []);

  const setSize = (next: FontSize) => {
    setSizeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <FontSizeContext.Provider value={{ size, fontSize: sizes[size], setSize, ready }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => useContext(FontSizeContext);
