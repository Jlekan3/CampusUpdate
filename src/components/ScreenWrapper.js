import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../utils/constants';

const ScreenWrapper = ({
  children,
  scrollable = false,
  safeArea = true,
  backgroundColor = COLORS.white,
  statusBarStyle = 'dark-content',
  paddingHorizontal = 20,
  paddingTop = 0,
  paddingBottom = 20,
  showsVerticalScrollIndicator = false,
}) => {
  const Container = safeArea ? SafeAreaView : View;
  const content = (
    <View style={[
      styles.container,
      !scrollable && { flex: 1 },
      { backgroundColor, paddingHorizontal, paddingTop, paddingBottom }
    ]}>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <Container style={[styles.wrapper, { backgroundColor }]}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={showsVerticalScrollIndicator}
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            scrollIndicatorInsets={{ right: 1 }}
            indicatorStyle="black"
          >
            {content}
          </ScrollView>
        </KeyboardAvoidingView>
      </Container>
    );
  }

  return (
    <Container style={[styles.wrapper, { backgroundColor }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {content}
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  container: {
    paddingBottom: 20,
  },
});

export default ScreenWrapper;