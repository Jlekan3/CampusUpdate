import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal, Image, Switch, FlatList, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_THEME } from '../../utils/constants';
import { supabase } from '../../config/supabase';
import {
  subscribeToEvents, subscribeToNotifications,
  addItem, updateItem, deleteItem,
} from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const PRIMARY = ADMIN_THEME.primary;
const ACCENT  = ADMIN_THEME.accent;
const SUCCESS = ADMIN_THEME.success;
const BLUE    = '#2563EB';

const TABS = ['Events', 'Notices'];

const TAB_META = {
  Events:  { icon: 'calendar-outline',  table: 'events',         color: SUCCESS,             emptyIcon: 'calendar-outline' },
  Notices: { icon: 'megaphone-outline', table: 'notifications',  color: ADMIN_THEME.warning, emptyIcon: 'megaphone-outline' },
};

const EVENT_CATEGORIES = ['Academic', 'Social', 'Sports', 'Workshop', 'Career'];

// ── Segment control ──────────────────────────────────────────────────────────
const Segment = ({ tabs, active, onChange }) => (
  <View style={seg.wrap}>
    {tabs.map((t) => (
      <TouchableOpacity key={t} style={[seg.btn, active === t && seg.btnActive]} onPress={() => onChange(t)} activeOpacity={0.8}>
        <Text style={[seg.label, active === t && seg.labelActive]}>{t}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ── Generic list item (Locations & Notices) ──────────────────────────────────
const Item = ({ icon, color, title, subtitle, onEdit, onDelete }) => (
  <View style={s.item}>
    <View style={[s.itemIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View style={s.itemBody}>
      <Text style={s.itemTitle} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={s.itemSub} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    <TouchableOpacity style={s.itemBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="create-outline" size={18} color={PRIMARY} />
    </TouchableOpacity>
    <TouchableOpacity style={[s.itemBtn, { marginLeft: 4 }]} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="trash-outline" size={18} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

// ── Event card with image preview ────────────────────────────────────────────
const EventCard = ({ item, onEdit, onDelete }) => {
  const dateStr = item.start_date
    ? new Date(item.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <View style={s.eventCard}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={s.eventImage} resizeMode="cover" />
      ) : (
        <View style={s.eventImagePlaceholder}>
          <Ionicons name="calendar-outline" size={32} color="rgba(255,255,255,0.5)" />
        </View>
      )}

      {item.category ? (
        <View style={s.eventBadge}>
          <Text style={s.eventBadgeText}>{item.category}</Text>
        </View>
      ) : null}

      <View style={s.eventBody}>
        <View style={s.eventBodyText}>
          <Text style={s.eventTitle} numberOfLines={1}>{item.title || '—'}</Text>
          <View style={s.eventMeta}>
            {dateStr ? (
              <View style={s.eventMetaItem}>
                <Ionicons name="calendar-outline" size={12} color="#64748B" />
                <Text style={s.eventMetaText}>{dateStr}</Text>
              </View>
            ) : null}
            {item.location ? (
              <View style={s.eventMetaItem}>
                <Ionicons name="location-outline" size={12} color="#64748B" />
                <Text style={s.eventMetaText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
            {item.attendee_count ? (
              <View style={s.eventMetaItem}>
                <Ionicons name="people-outline" size={12} color="#64748B" />
                <Text style={s.eventMetaText}>{item.attendee_count} attendees</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={s.eventActions}>
          <TouchableOpacity style={s.eventBtn} onPress={onEdit} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={17} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.eventBtn, s.eventBtnDanger]} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={17} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ── Generic edit modal (Locations & Notices) ─────────────────────────────────
const EditModal = ({ visible, title, fields, values, onChange, onSave, onClose, saving }) => (
  <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
    <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
    <ScrollView style={m.sheet} keyboardShouldPersistTaps="handled" bounces={false}>
      <View style={m.handle} />
      <Text style={m.title}>{title}</Text>
      {fields.map((f) => (
        <View key={f.key} style={m.fieldWrap}>
          <Text style={m.label}>{f.label}</Text>
          <TextInput
            style={[m.input, f.multiline && { height: 80, textAlignVertical: 'top' }]}
            value={values[f.key] || ''}
            onChangeText={(v) => onChange(f.key, v)}
            placeholder={f.placeholder || ''}
            placeholderTextColor="#94A3B8"
            multiline={f.multiline}
          />
        </View>
      ))}
      <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving} activeOpacity={0.85}>
        <Text style={m.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  </Modal>
);

// ── Event modal ──────────────────────────────────────────────────────────────
// ── Reusable date-time picker field ─────────────────────────────────────────
function DateTimeField({ label, value, onChange, minDate, error }) {
  const [showDate,    setShowDate]    = useState(false);
  const [showTime,    setShowTime]    = useState(false);
  const [tempDate,    setTempDate]    = useState(value || new Date());

  const display = value
    ? value.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  // Android: date picker first, then time picker sequentially
  const handleAndroidDate = (evt, selected) => {
    setShowDate(false);
    if (evt.type === 'dismissed' || !selected) return;
    setTempDate(selected);
    setShowTime(true);
  };

  const handleAndroidTime = (evt, selected) => {
    setShowTime(false);
    if (evt.type === 'dismissed' || !selected) return;
    onChange(selected);
  };

  // iOS: inline spinner in a modal, confirm on Done
  const [iosTemp, setIosTemp] = useState(value || new Date());
  const openIos = () => { setIosTemp(value || new Date()); setShowDate(true); };

  const isIos = Platform.OS === 'ios';

  return (
    <View style={ev.dateField}>
      <Text style={ev.dateLabel}>{label}</Text>
      <TouchableOpacity
        style={[ev.dateBtn, error && ev.dateBtnError]}
        onPress={() => { if (isIos) openIos(); else setShowDate(true); }}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={16} color={value ? PRIMARY : '#94A3B8'} />
        <Text style={[ev.dateBtnText, !value && ev.datePlaceholder]}>
          {display || 'Select date & time'}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={ev.dateError}>{error}</Text> : null}

      {/* Android date */}
      {!isIos && showDate && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          onChange={handleAndroidDate}
        />
      )}
      {/* Android time */}
      {!isIos && showTime && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleAndroidTime}
        />
      )}

      {/* iOS modal */}
      {isIos && (
        <Modal visible={showDate} animationType="slide" transparent presentationStyle="overFullScreen">
          <TouchableOpacity style={ev.iosOverlay} activeOpacity={1} onPress={() => setShowDate(false)} />
          <View style={ev.iosSheet}>
            <View style={ev.iosHeader}>
              <TouchableOpacity onPress={() => setShowDate(false)} activeOpacity={0.7}>
                <Text style={ev.iosCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={ev.iosTitle}>{label}</Text>
              <TouchableOpacity onPress={() => { onChange(iosTemp); setShowDate(false); }} activeOpacity={0.7}>
                <Text style={ev.iosDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={iosTemp}
              mode="datetime"
              display="spinner"
              minimumDate={minDate}
              onChange={(_, d) => { if (d) setIosTemp(d); }}
              style={{ width: '100%' }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

// ── Event Modal ──────────────────────────────────────────────────────────────
function EventModal({ visible, editTarget, onClose, onSaved }) {
  const { user } = useAuth();

  const [title,      setTitle]      = useState('');
  const [description,setDesc]       = useState('');
  const [location,   setLocation]   = useState('');
  const [category,   setCategory]   = useState('');
  const [startDate,  setStartDate]  = useState(null);
  const [endDate,    setEndDate]    = useState(null);
  const [organizer,  setOrganizer]  = useState('');
  const [isFeatured, setFeatured]   = useState(false);
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);
  const [catOpen,    setCatOpen]    = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editTarget) {
      setTitle(editTarget.title || '');
      setDesc(editTarget.description || '');
      setLocation(editTarget.location || '');
      setCategory(editTarget.category || '');
      setStartDate(editTarget.start_date ? new Date(editTarget.start_date) : null);
      setEndDate(editTarget.end_date   ? new Date(editTarget.end_date)   : null);
      setOrganizer(editTarget.organizer || '');
      setFeatured(editTarget.is_featured || false);
    } else {
      setTitle(''); setDesc(''); setLocation(''); setCategory('');
      setStartDate(null); setEndDate(null); setOrganizer(''); setFeatured(false);
    }
    setErrors({});
  }, [visible, editTarget]);

  const clearError = (key) => setErrors((e) => ({ ...e, [key]: undefined }));

  const validate = () => {
    const errs = {};
    if (!title.trim())       errs.title       = 'Title is required';
    if (!description.trim()) errs.description = 'Description is required';
    if (!category)           errs.category    = 'Please select a category';
    const now = new Date();
    if (startDate && startDate <= now) errs.startDate = 'Start date must be in the future';
    if (startDate && endDate && endDate <= startDate)
      errs.endDate = 'End date must be after start date';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        title:       title.trim(),
        description: description.trim(),
        location:    location.trim() || null,
        category,
        start_date:  startDate ? startDate.toISOString() : null,
        end_date:    endDate   ? endDate.toISOString()   : null,
        organizer:   organizer.trim() || null,
        is_featured: isFeatured,
      };

      if (editTarget) {
        await updateItem('events', editTarget.id, payload);
      } else {
        await addItem('events', { ...payload, created_by: user?.id ?? null });
      }
      onSaved();
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={m.sheet}>
        <ScrollView
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={m.sheetScroll}
          bounces={false}
        >
          <View style={m.handle} />
          <Text style={m.title}>{editTarget ? 'Edit Event' : 'Add Event'}</Text>

          {/* ── Details ── */}
          <Text style={ev.sectionHeader}>EVENT DETAILS</Text>

          <Text style={ev.label}>Title <Text style={ev.req}>*</Text></Text>
          <TextInput
            style={[ev.input, errors.title && ev.inputError]}
            value={title}
            onChangeText={(v) => { setTitle(v); clearError('title'); }}
            placeholder="e.g. Annual Sports Day"
            placeholderTextColor="#94A3B8"
          />
          {errors.title ? <Text style={ev.fieldError}>{errors.title}</Text> : null}

          <Text style={ev.label}>Description <Text style={ev.req}>*</Text></Text>
          <TextInput
            style={[ev.input, ev.inputMulti, errors.description && ev.inputError]}
            value={description}
            onChangeText={(v) => { setDesc(v); clearError('description'); }}
            placeholder="Describe the event in detail…"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description ? <Text style={ev.fieldError}>{errors.description}</Text> : null}

          <Text style={ev.label}>Location</Text>
          <TextInput
            style={ev.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Main Auditorium"
            placeholderTextColor="#94A3B8"
          />

          <Text style={ev.label}>Organiser</Text>
          <TextInput
            style={ev.input}
            value={organizer}
            onChangeText={setOrganizer}
            placeholder="Name or department"
            placeholderTextColor="#94A3B8"
          />

          {/* ── Category ── */}
          <Text style={ev.sectionHeader}>CATEGORY <Text style={ev.req}>*</Text></Text>
          <TouchableOpacity
            style={[ev.input, ev.dropdownBtn, errors.category && ev.inputError]}
            onPress={() => setCatOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={[ev.dropdownText, !category && ev.placeholder]}>{category || 'Select a category'}</Text>
            <Ionicons name="chevron-down-outline" size={16} color="#64748B" />
          </TouchableOpacity>
          {errors.category ? <Text style={ev.fieldError}>{errors.category}</Text> : null}

          {/* ── Schedule ── */}
          <Text style={ev.sectionHeader}>SCHEDULE</Text>
          <View style={ev.dateRow}>
            <DateTimeField
              label="Start Date & Time"
              value={startDate}
              onChange={(d) => { setStartDate(d); clearError('startDate'); }}
              minDate={now}
              error={errors.startDate}
            />
            <DateTimeField
              label="End Date & Time"
              value={endDate}
              onChange={(d) => { setEndDate(d); clearError('endDate'); }}
              minDate={startDate || now}
              error={errors.endDate}
            />
          </View>

          {/* ── Featured toggle ── */}
          <Text style={ev.sectionHeader}>OPTIONS</Text>
          <View style={ev.featuredRow}>
            <View style={ev.featuredText}>
              <Text style={ev.featuredLabel}>Feature this event</Text>
              <Text style={ev.featuredSub}>Featured events are highlighted in the app</Text>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setFeatured}
              trackColor={{ false: '#E2E8F0', true: PRIMARY + '80' }}
              thumbColor={isFeatured ? PRIMARY : '#FFFFFF'}
            />
          </View>

          {/* ── Save ── */}
          <TouchableOpacity
            style={[ev.saveBtn, saving && ev.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={ev.saveBtnText}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Event'}</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>

      {/* Category dropdown modal */}
      <Modal visible={catOpen} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={() => setCatOpen(false)} />
        <View style={ev.catSheet}>
          <View style={m.handle} />
          <Text style={ev.catSheetTitle}>Select Category</Text>
          {EVENT_CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={cat}
              style={[ev.catOption, i < EVENT_CATEGORIES.length - 1 && ev.catBorder]}
              onPress={() => { setCategory(cat); clearError('category'); setCatOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[ev.catOptionText, category === cat && ev.catOptionActive]}>{cat}</Text>
              {category === cat && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </View>
      </Modal>
    </Modal>
  );
}

// ── Notice Modal ─────────────────────────────────────────────────────────────
const NOTICE_CATEGORIES = ['General', 'Academic', 'Emergency', 'Event'];
const AUDIENCE_OPTIONS  = [
  { label: 'Everyone',  value: 'everyone', icon: 'globe-outline' },
  { label: 'Staff',     value: 'staff',    icon: 'briefcase-outline' },
  { label: 'Direct',    value: 'direct',   icon: 'person-outline' },
];

function NoticeModal({ visible, editTarget, onClose, onSaved }) {
  const { user } = useAuth();
  const [title,        setTitle]        = useState('');
  const [body,         setBody]         = useState('');
  const [category,     setCategory]     = useState('General');
  const [audience,     setAudience]     = useState('everyone');
  const [recipientIds, setRecipientIds] = useState([]);
  const [isPinned,     setIsPinned]     = useState(false);
  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);

  // Recipient picker state
  const [allUsers,     setAllUsers]     = useState([]);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [userSearch,   setUserSearch]   = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Category dropdown state
  const [catOpen, setCatOpen] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (!visible) return;
    if (editTarget) {
      setTitle(editTarget.title || '');
      setBody(editTarget.body || editTarget.message || '');
      setCategory(editTarget.category || 'General');
      setAudience(editTarget.audience || 'everyone');
      setRecipientIds(editTarget.recipient_ids || []);
      setIsPinned(editTarget.is_pinned || false);
    } else {
      setTitle(''); setBody(''); setCategory('General');
      setAudience('everyone'); setRecipientIds([]); setIsPinned(false);
    }
    setErrors({});
    setUserSearch('');
  }, [visible, editTarget]);

  // Fetch users when 'direct' is selected
  useEffect(() => {
    if (audience !== 'direct' || allUsers.length > 0) return;
    setLoadingUsers(true);
    supabase
      .from('users')
      .select('id, full_name, email, role')
      .in('role', ['student', 'faculty', 'staff'])
      .order('full_name')
      .then(({ data }) => { setAllUsers(data || []); setLoadingUsers(false); });
  }, [audience]);

  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) ||
           (u.email     || '').toLowerCase().includes(q);
  });

  const toggleRecipient = (id) => {
    setRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getSelectedNames = () => {
    const selected = allUsers.filter((u) => recipientIds.includes(u.id));
    if (selected.length === 0) return 'Tap to select recipients';
    if (selected.length === 1) return selected[0].full_name || selected[0].email;
    return `${selected[0].full_name || selected[0].email} +${selected.length - 1} more`;
  };

  const handleSave = async () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!body.trim())  errs.body  = 'Body is required';
    if (audience === 'direct' && recipientIds.length === 0) errs.recipients = 'Select at least one recipient';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        title:         title.trim(),
        body:          body.trim(),
        message:       body.trim(),      // keep message in sync for backward compat
        category,
        audience,
        recipient_ids: audience === 'direct' ? recipientIds : [],
        is_pinned:     isPinned,
        posted_by:     user?.id || null,
        posted_by_name: user?.user_metadata?.full_name || user?.email || null,
      };
      if (editTarget) {
        await updateItem('notifications', editTarget.id, payload);
      } else {
        await addItem('notifications', payload);
      }
      onSaved();
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={n.overlay} activeOpacity={1} onPress={onClose} />
      <View style={n.sheet}>
        <ScrollView
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={n.sheetScroll}
          bounces={false}
        >
          <View style={n.handle} />
          <Text style={n.sheetTitle}>{editTarget ? 'Edit Notice' : 'Post Notice'}</Text>

          {/* ── Title ── */}
          <Text style={n.label}>Title <Text style={n.req}>*</Text></Text>
          <TextInput
            style={[n.input, errors.title && n.inputError]}
            value={title}
            onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }}
            placeholder="e.g. Lecture Hall Closure"
            placeholderTextColor="#94A3B8"
          />
          {errors.title ? <Text style={n.fieldError}>{errors.title}</Text> : null}

          {/* ── Body ── */}
          <Text style={n.label}>Body <Text style={n.req}>*</Text></Text>
          <TextInput
            style={[n.input, n.inputMulti, errors.body && n.inputError]}
            value={body}
            onChangeText={(v) => { setBody(v); setErrors((e) => ({ ...e, body: undefined })); }}
            placeholder="Write the full announcement here…"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          {errors.body ? <Text style={n.fieldError}>{errors.body}</Text> : null}

          {/* ── Category dropdown ── */}
          <Text style={n.label}>Category</Text>
          <TouchableOpacity style={n.dropdown} onPress={() => setCatOpen(true)} activeOpacity={0.8}>
            <Text style={n.dropdownText}>{category}</Text>
            <Ionicons name="chevron-down-outline" size={16} color="#64748B" />
          </TouchableOpacity>

          {/* ── Audience radio ── */}
          <Text style={n.sectionHeader}>AUDIENCE</Text>
          <View style={n.audienceRow}>
            {AUDIENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[n.audienceBtn, audience === opt.value && n.audienceBtnActive]}
                onPress={() => { setAudience(opt.value); setErrors((e) => ({ ...e, recipients: undefined })); }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={audience === opt.value ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={audience === opt.value ? PRIMARY : '#94A3B8'}
                />
                <Ionicons name={opt.icon} size={14} color={audience === opt.value ? PRIMARY : '#64748B'} />
                <Text style={[n.audienceBtnText, audience === opt.value && n.audienceBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Recipient picker (only when direct) ── */}
          {audience === 'direct' && (
            <View style={n.recipientSection}>
              <Text style={n.label}>Recipients <Text style={n.req}>*</Text></Text>
              <TouchableOpacity
                style={[n.dropdown, errors.recipients && n.inputError]}
                onPress={() => setPickerOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={[n.dropdownText, recipientIds.length === 0 && n.placeholderText]} numberOfLines={1}>
                  {getSelectedNames()}
                </Text>
                {recipientIds.length > 0 && (
                  <View style={n.countBadge}>
                    <Text style={n.countBadgeText}>{recipientIds.length}</Text>
                  </View>
                )}
                <Ionicons name="chevron-down-outline" size={16} color="#64748B" />
              </TouchableOpacity>
              {errors.recipients ? <Text style={n.fieldError}>{errors.recipients}</Text> : null}
            </View>
          )}

          {/* ── Pinned toggle ── */}
          <View style={n.pinnedRow}>
            <View style={n.pinnedText}>
              <Text style={n.label} >Pin this notice</Text>
              <Text style={n.pinnedSub}>Pinned notices appear at the top of the feed</Text>
            </View>
            <Switch
              value={isPinned}
              onValueChange={setIsPinned}
              trackColor={{ false: '#E2E8F0', true: PRIMARY + '80' }}
              thumbColor={isPinned ? PRIMARY : '#FFFFFF'}
            />
          </View>

          {/* ── Save ── */}
          <TouchableOpacity
            style={[n.saveBtn, saving && n.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={n.saveBtnText}>{saving ? 'Posting…' : editTarget ? 'Save Changes' : 'Post Notice'}</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

      {/* ── Category dropdown modal ── */}
      <Modal visible={catOpen} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={n.overlay} activeOpacity={1} onPress={() => setCatOpen(false)} />
        <View style={n.pickerSheet}>
          <View style={n.handle} />
          <Text style={n.sheetTitle}>Select Category</Text>
          {NOTICE_CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={cat}
              style={[n.pickerOption, i < NOTICE_CATEGORIES.length - 1 && n.pickerBorder]}
              onPress={() => { setCategory(cat); setCatOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[n.pickerOptionText, category === cat && n.pickerOptionActive]}>{cat}</Text>
              {category === cat && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </View>
      </Modal>

      {/* ── Recipient picker modal ── */}
      <Modal visible={pickerOpen} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={n.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)} />
        <View style={n.pickerSheet}>
          <View style={n.handle} />
          <View style={n.pickerHeader}>
            <Text style={n.sheetTitle}>Select Recipients</Text>
            {recipientIds.length > 0 && (
              <TouchableOpacity onPress={() => setRecipientIds([])} activeOpacity={0.7}>
                <Text style={n.clearText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={n.searchRow}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              style={n.searchInput}
              value={userSearch}
              onChangeText={setUserSearch}
              placeholder="Search by name or email…"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {loadingUsers ? (
            <ActivityIndicator color={PRIMARY} style={{ paddingVertical: 24 }} />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(u) => u.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const selected = recipientIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={n.userRow}
                    onPress={() => toggleRecipient(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[n.userAvatar, selected && n.userAvatarSelected]}>
                      <Text style={[n.userAvatarText, selected && { color: '#FFFFFF' }]}>
                        {(item.full_name || item.email || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={n.userInfo}>
                      <Text style={n.userName} numberOfLines={1}>{item.full_name || '—'}</Text>
                      <Text style={n.userEmail} numberOfLines={1}>{item.email}</Text>
                    </View>
                    <View style={[n.checkbox, selected && n.checkboxSelected]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={n.userSep} />}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity style={n.doneBtn} onPress={() => setPickerOpen(false)} activeOpacity={0.85}>
            <Text style={n.doneBtnText}>
              {recipientIds.length > 0 ? `Done · ${recipientIds.length} selected` : 'Done'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
        </View>
      </Modal>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function CampusContentScreen({ navigation }) {
  const [tab, setTab] = useState('Events');
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeToEvents((d) => { setEvents(d || []); setLoading(false); }),
      subscribeToNotifications((d) => setNotices(d || [])),
    ];
    return () => unsubs.forEach((u) => { try { u?.(); } catch (_) {} });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const meta = TAB_META[tab];

  const getTitle = (item) => item.name || item.title || '—';
  const getSubtitle = (item) => {
    if (tab === 'Events') return item.location || item.category;
    return item.audience || item.category;
  };

  const getTabData = () => {
    if (tab === 'Events') return events;
    return notices;
  };

  const openAdd = () => { setEditTarget(null); setFormValues({}); setModalVisible(true); };
  const openEdit = (item) => { setEditTarget(item); setFormValues({ ...item }); setModalVisible(true); };

  const handleDelete = (item) => {
    Alert.alert('Delete', `Delete "${getTitle(item)}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteItem(meta.table, item.id); } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleGenericSave = async () => {
    if (!formValues.title?.trim()) { Alert.alert('Required', 'Title is required'); return; }
    setSaving(true);
    try {
      if (editTarget) { await updateItem(meta.table, editTarget.id, formValues); }
      else { await addItem(meta.table, formValues); }
      setModalVisible(false);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const data = getTabData();
  const counts = `${events.length} events · ${notices.length} notices`;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Campus Content</Text>
          <Text style={s.headerSub}>{counts}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={s.segWrap}>
        <Segment tabs={TABS} active={tab} onChange={setTab} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {data.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name={meta.emptyIcon} size={48} color="#CBD5E0" />
              <Text style={s.emptyText}>No {tab.toLowerCase()} yet</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={openAdd} activeOpacity={0.85}>
                <Text style={s.emptyBtnText}>Add {tab === 'Notices' ? 'Notice' : tab.slice(0, -1)}</Text>
              </TouchableOpacity>
            </View>
          ) : tab === 'Events' ? (
            data.map((item) => (
              <EventCard
                key={item.id}
                item={item}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            ))
          ) : (
            data.map((item) => (
              <Item
                key={item.id}
                icon={meta.icon}
                color={meta.color}
                title={getTitle(item)}
                subtitle={getSubtitle(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            ))
          )}
        </ScrollView>
      )}

      {tab === 'Events' ? (
        <EventModal
          visible={modalVisible}
          editTarget={editTarget}
          onClose={() => setModalVisible(false)}
          onSaved={() => setModalVisible(false)}
        />
      ) : (
        <NoticeModal
          visible={modalVisible}
          editTarget={editTarget}
          onClose={() => setModalVisible(false)}
          onSaved={() => setModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  segWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  list: { flexGrow: 1, padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12, marginBottom: 20 },
  emptyBtn: { backgroundColor: BLUE, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Generic item
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  itemIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemBtn: { padding: 6 },

  // Event card
  eventCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  eventImage: { width: '100%', height: 150 },
  eventImagePlaceholder: {
    width: '100%', height: 150,
    backgroundColor: SUCCESS + 'CC',
    justifyContent: 'center', alignItems: 'center',
  },
  eventBadge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  eventBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  eventBody: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  eventBodyText: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 5 },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  eventMetaText: { fontSize: 12, color: '#64748B' },
  eventActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  eventBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  eventBtnDanger: { backgroundColor: '#FEF2F2' },
});

const seg = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 4,
  },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnActive: { backgroundColor: '#FFFFFF' },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  labelActive: { color: PRIMARY, fontWeight: '700' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '94%',
  },
  sheetScroll: { paddingHorizontal: 24, paddingTop: 12 },

  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 0.8, marginBottom: 12, marginTop: 4,
  },
  required: { color: '#EF4444' },

  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A',
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  // Side-by-side date fields
  rowFields: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  halfField: { flex: 1 },

  // Attendee row with icon
  attendeeRow: { flexDirection: 'row', alignItems: 'center' },

  // Category chips
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: {
    paddingVertical: 9, paddingHorizontal: 18,
    backgroundColor: '#F8FAFC', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  catChipActive: { backgroundColor: '#F0FDF4', borderColor: SUCCESS },
  catChipText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  catChipTextActive: { color: SUCCESS, fontWeight: '700' },

  // Image toggle
  imgToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  imgToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  imgToggleBtnActive: { backgroundColor: '#EFF6FF', borderColor: PRIMARY },
  imgToggleText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  imgToggleTextActive: { color: PRIMARY },
  urlPreview: { width: '100%', height: 140, borderRadius: 12, marginTop: 10 },
  imagePicker: {
    borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 28,
    alignItems: 'center', marginBottom: 20, backgroundColor: '#F8FAFC',
  },
  imagePickerIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  imagePickerText: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 4 },
  imagePickerSub: { fontSize: 12, color: '#94A3B8' },
  imagePreviewWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 20, position: 'relative' },
  imagePreview: { width: '100%', height: 180 },
  imageChangeBtn: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  imageChangeBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  saveBtn: {
    height: 52, backgroundColor: BLUE, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

// ── NoticeModal styles ────────────────────────────────────────────────────────
const n = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '94%',
  },
  sheetScroll: { paddingHorizontal: 22, paddingTop: 12 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 18,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },
  req: { color: '#EF4444' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', marginBottom: 14,
  },
  inputMulti: { height: 120, textAlignVertical: 'top' },
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12, fontWeight: '500', color: '#EF4444', marginTop: -10, marginBottom: 10 },

  // Category & recipient dropdowns
  dropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 14,
  },
  dropdownText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0F172A' },
  placeholderText: { color: '#94A3B8', fontWeight: '400' },
  countBadge: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 6,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // Audience radio buttons
  audienceRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  audienceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  audienceBtnActive: { backgroundColor: '#EFF6FF', borderColor: PRIMARY },
  audienceBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  audienceBtnTextActive: { color: PRIMARY, fontWeight: '700' },

  // Recipient section
  recipientSection: { marginBottom: 4 },

  // Pinned toggle
  pinnedRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 20,
  },
  pinnedText: { flex: 1 },
  pinnedSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // Save
  saveBtn: {
    height: 52, backgroundColor: BLUE, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BLUE, shadowOpacity: 0.28,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Picker sheet (category + recipients)
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
    maxHeight: '75%',
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  clearText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  pickerBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerOptionText: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  pickerOptionActive: { fontWeight: '700', color: PRIMARY },

  // User search + list
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: 12,
  },
  userAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  userAvatarSelected: { backgroundColor: PRIMARY },
  userAvatarText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  userEmail: { fontSize: 12, color: '#64748B', marginTop: 1 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#CBD5E0',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  userSep: { height: 1, backgroundColor: '#F1F5F9' },
  doneBtn: {
    height: 48, backgroundColor: PRIMARY, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ── Event modal styles ────────────────────────────────────────────────────────
const ev = StyleSheet.create({
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 10, marginTop: 6,
  },
  req: { color: '#EF4444' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', marginBottom: 14,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12, fontWeight: '500', color: '#EF4444', marginTop: -10, marginBottom: 10 },

  // Category dropdown
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  dropdownText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0F172A' },
  placeholder: { color: '#94A3B8', fontWeight: '400' },

  // Date-time fields — side by side
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  dateBtn: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 10, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  dateBtnError: { borderColor: '#EF4444' },
  dateBtnText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#0F172A' },
  datePlaceholder: { color: '#94A3B8', fontWeight: '400' },
  dateError: { fontSize: 11, fontWeight: '500', color: '#EF4444', marginTop: 4 },

  // iOS date picker modal
  iosOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  iosSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  iosHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iosTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  iosCancelText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  iosDoneText: { fontSize: 15, fontWeight: '700', color: PRIMARY },

  // Featured toggle
  featuredRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },
  featuredText: { flex: 1 },
  featuredLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  featuredSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // Category picker sheet
  catSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
  },
  catSheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  catOption: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 15,
  },
  catBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  catOptionText: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  catOptionActive: { fontWeight: '700', color: PRIMARY },

  // Save
  saveBtn: {
    height: 52, backgroundColor: BLUE, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: BLUE, shadowOpacity: 0.28,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

