import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_THEME } from '../utils/constants';

const STORAGE_KEY = '@admin_dark_mode';

function buildColors(isDark) {
  return {
    primary: ADMIN_THEME.primary,
    accent: ADMIN_THEME.accent,
    background: isDark ? ADMIN_THEME.darkBackground : ADMIN_THEME.background,
    surface: isDark ? ADMIN_THEME.darkSurface : ADMIN_THEME.surface,
    textDark: isDark ? ADMIN_THEME.darkText : ADMIN_THEME.textDark,
    textMuted: isDark ? ADMIN_THEME.darkMuted : ADMIN_THEME.textMuted,
    border: isDark ? ADMIN_THEME.darkBorder : ADMIN_THEME.border,
    success: ADMIN_THEME.success,
    danger: ADMIN_THEME.danger,
    warning: ADMIN_THEME.warning,
    info: ADMIN_THEME.info,
    statusOpen: ADMIN_THEME.statusOpen,
    statusClosed: ADMIN_THEME.statusClosed,
    statusBusy: ADMIN_THEME.statusBusy,
    statusAvailable: ADMIN_THEME.statusAvailable,
    glassBackground: isDark ? ADMIN_THEME.glassDark : ADMIN_THEME.glassBackground,
    glassBorder: ADMIN_THEME.glassBorder,
    white: '#FFFFFF',
  };
}

export const ThemeContext = createContext({
  isDarkMode: false,
  toggleDarkMode: () => {},
  colors: buildColors(false),
});

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load preference asynchronously — render immediately with light default,
  // re-render once the stored preference arrives. No blank screen.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => { if (stored === 'true') setIsDarkMode(true); })
      .catch(() => {});
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors: buildColors(isDarkMode) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
