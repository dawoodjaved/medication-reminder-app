import React, { createContext, useContext, useState } from 'react';

type FontSize = 'small' | 'medium' | 'large';

const sizes = {
  small: 14,
  medium: 18,
  large: 22,
};

const FontSizeContext = createContext({
  size: 'medium' as FontSize,
  fontSize: sizes.medium,
  setSize: (size: FontSize) => {},
});

export const FontSizeProvider = ({ children }: { children: React.ReactNode }) => {
  const [size, setSize] = useState<FontSize>('medium');

  return (
    <FontSizeContext.Provider value={{ size, fontSize: sizes[size], setSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => useContext(FontSizeContext);
