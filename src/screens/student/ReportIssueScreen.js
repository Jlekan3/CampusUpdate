import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Flag01Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import FormInput from '../../components/FormInput';
import { useAuth } from '../../context/AuthContext';
import { addIssueReport } from '../../services/databaseService';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../utils/theme';

const CATEGORIES = ['Technical', 'Facility', 'Safety', 'Other'];

export default function ReportIssueScreen({ navigation }) {
  const { user } = useAuth();
  const [category, setCategory] = useState('Technical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!description.trim()) errs.description = 'Description is required';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await addIssueReport({
        title: title.trim(),
        description: description.trim(),
        category,
        reporter_id: user?.id,
        reporter_name: user?.user_metadata?.full_name || user?.email,
        reporter_email: user?.email,
      });
      Alert.alert('Report submitted', "Thank you! We'll look into it shortly.", [
        { text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : null },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : null} activeOpacity={0.7}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color="#0F172A" variant="stroke" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report an Issue</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <HugeiconsIcon icon={Flag01Icon} size={28} color="#FFFFFF" variant="solid" />
          </View>
          <Text style={styles.title}>What's the issue?</Text>
          <Text style={styles.subtitle}>Help us keep campus running smoothly.</Text>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormInput
            label="Title"
            required
            placeholder="Brief summary of the issue"
            value={title}
            onChangeText={setTitle}
            error={errors.title}
            autoCapitalize="sentences"
          />

          <FormInput
            label="Description"
            required
            placeholder="Describe the issue in detail…"
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            multiline
            numberOfLines={5}
            inputStyle={{ height: 110, textAlignVertical: 'top', paddingTop: 12 }}
            containerStyle={{ marginBottom: 24 }}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>{loading ? 'Submitting…' : 'Submit Report'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  scroll: { padding: 20, paddingBottom: 40 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 21 },
  label: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.label, marginBottom: 10 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: COLORS.bg,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  categoryText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  categoryTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
  submitBtn: {
    height: 54,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.blue,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontFamily: FONTS.bold, letterSpacing: 0.2 },
});
