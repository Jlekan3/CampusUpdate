import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import { supabase } from '../../config/supabase';

// ── Palette ──────────────────────────────────────────────────────────────────
const NAVY  = '#1A365D';
const BLUE  = '#2563EB';
const WHITE = '#FFFFFF';
const BG    = '#F8FAFC';
const CARD  = '#FFFFFF';
const BORDER= '#E2E8F0';
const DARK  = '#0F172A';
const MUTED = '#64748B';
const LIGHT = '#94A3B8';

export default function StaffHomeScreen() {
  const { user, logout } = useAuth();
  const { notifications = [], events = [] } = useContext(CampusUpdatesContext);

  const [tab,          setTab]          = useState('Overview');
  const [departments,  setDepartments]  = useState([]);
  const [reports,      setReports]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [broadcastOpen,setBroadcastOpen]= useState(false);
  const [bTitle,       setBTitle]       = useState('');
  const [bMessage,     setBMessage]     = useState('');
  const [bSending,     setBSending]     = useState(false);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'Staff';

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [deptRes, reportRes] = await Promise.all([
        supabase.from('departments').select('id, name, head_of_department, contact_email').order('name'),
        supabase.from('reports').select('id, title, description, status, category, created_at').order('created_at', { ascending: false }).limit(20),
      ]);
      if (deptRes.data)   setDepartments(deptRes.data);
      if (reportRes.data) setReports(reportRes.data);
    } catch (err) {
      console.warn('[Staff] fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── Broadcast ───────────────────────────────────────────────────────────────
  const sendBroadcast = async () => {
    if (!bTitle.trim() || !bMessage.trim()) {
      Alert.alert('Required', 'Please fill in both title and message.');
      return;
    }
    setBSending(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        title:    bTitle.trim(),
        message:  bMessage.trim(),
        audience: 'everyone',
        posted_by: user?.id,
      });
      if (error) throw error;
      Alert.alert('Sent', 'Broadcast posted successfully.');
      setBTitle('');
      setBMessage('');
      setBroadcastOpen(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBSending(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={s.loadingText}>Loading dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerEye}>FACULTY & STAFF</Text>
          <Text style={s.headerName} numberOfLines={1}>{displayName}</Text>
        </View>
        <TouchableOpacity style={s.broadcastBtn} onPress={() => setBroadcastOpen(true)} activeOpacity={0.85}>
          <Ionicons name="megaphone-outline" size={16} color={WHITE} />
          <Text style={s.broadcastBtnText}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {['Overview', 'Departments', 'Reports'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tabItem, tab === t && s.tabItemActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />}
      >

        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <View style={s.section}>
            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statNum}>{departments.length}</Text>
                <Text style={s.statLabel}>Departments</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statNum}>{reports.filter(r => r.status !== 'resolved').length}</Text>
                <Text style={s.statLabel}>Open Reports</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statNum}>{(notifications || []).length}</Text>
                <Text style={s.statLabel}>Notices</Text>
              </View>
            </View>

            {/* Recent notifications */}
            <Text style={s.sectionTitle}>Recent Notifications</Text>
            {(notifications || []).length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="notifications-outline" size={36} color={LIGHT} />
                <Text style={s.emptyText}>No notifications yet</Text>
              </View>
            ) : (notifications || []).slice(0, 5).map((n) => (
              <View key={n.id} style={s.notifCard}>
                <View style={s.notifDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={s.notifMsg} numberOfLines={2}>{n.message || n.body || ''}</Text>
                </View>
              </View>
            ))}

            {/* Recent events */}
            {(events || []).length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 20 }]}>Upcoming Events</Text>
                {(events || []).slice(0, 3).map((ev) => (
                  <View key={ev.id} style={s.eventCard}>
                    <View style={s.eventIconWrap}>
                      <Ionicons name="calendar-outline" size={20} color={BLUE} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventTitle} numberOfLines={1}>{ev.title}</Text>
                      {ev.date ? <Text style={s.eventMeta}>{ev.date}{ev.time ? ` · ${ev.time}` : ''}</Text> : null}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* ── DEPARTMENTS ── */}
        {tab === 'Departments' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Campus Departments</Text>
            {departments.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="business-outline" size={36} color={LIGHT} />
                <Text style={s.emptyText}>No departments found</Text>
              </View>
            ) : departments.map((d) => (
              <View key={d.id} style={s.deptCard}>
                <View style={s.deptIconWrap}>
                  <Ionicons name="business-outline" size={20} color={NAVY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.deptName} numberOfLines={1}>{d.name}</Text>
                  {d.head_of_department ? (
                    <Text style={s.deptMeta}>HOD: {d.head_of_department}</Text>
                  ) : null}
                  {d.contact_email ? (
                    <Text style={s.deptMeta}>{d.contact_email}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── REPORTS ── */}
        {tab === 'Reports' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Student Issue Reports</Text>
            {reports.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="document-text-outline" size={36} color={LIGHT} />
                <Text style={s.emptyText}>No reports submitted yet</Text>
              </View>
            ) : reports.map((r) => (
              <View key={r.id} style={s.reportCard}>
                <View style={[s.statusDot, { backgroundColor: r.status === 'resolved' ? '#10B981' : '#F59E0B' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.reportTitle} numberOfLines={1}>{r.title}</Text>
                  <Text style={s.reportMeta}>{r.category || 'General'} · {r.status || 'open'}</Text>
                  {r.description ? (
                    <Text style={s.reportDesc} numberOfLines={2}>{r.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Broadcast Modal */}
      <Modal visible={broadcastOpen} animationType="slide" transparent onRequestClose={() => setBroadcastOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Broadcast</Text>
              <TouchableOpacity onPress={() => setBroadcastOpen(false)}>
                <Ionicons name="close" size={22} color={DARK} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Title</Text>
            <TextInput
              style={s.fieldInput}
              value={bTitle}
              onChangeText={setBTitle}
              placeholder="Broadcast title…"
              placeholderTextColor={LIGHT}
            />

            <Text style={s.fieldLabel}>Message</Text>
            <TextInput
              style={[s.fieldInput, { height: 100, textAlignVertical: 'top' }]}
              value={bMessage}
              onChangeText={setBMessage}
              placeholder="Type your message…"
              placeholderTextColor={LIGHT}
              multiline
            />

            <TouchableOpacity
              style={[s.sendBtn, bSending && { opacity: 0.6 }]}
              onPress={sendBroadcast}
              disabled={bSending}
              activeOpacity={0.85}
            >
              {bSending
                ? <ActivityIndicator color={WHITE} size="small" />
                : <Text style={s.sendBtnText}>Post Broadcast</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG },
  loadingWrap:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:   { fontSize: 14, color: MUTED },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', backgroundColor: NAVY, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 12 },
  headerEye:     { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  headerName:    { fontSize: 20, fontWeight: '800', color: WHITE },
  broadcastBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BLUE, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  broadcastBtnText: { fontSize: 13, fontWeight: '700', color: WHITE },

  // Tabs
  tabBar:        { flexDirection: 'row', backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabItem:       { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: BLUE },
  tabText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  tabTextActive: { color: BLUE, fontWeight: '700' },

  // Scroll
  scroll: { padding: 16, paddingBottom: 40 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginTop: 4, marginBottom: 4 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  statNum:  { fontSize: 24, fontWeight: '800', color: NAVY },
  statLabel:{ fontSize: 11, fontWeight: '600', color: MUTED, marginTop: 2 },

  // Notifications
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  notifDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE, marginTop: 5 },
  notifTitle:{ fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 2 },
  notifMsg:  { fontSize: 12, color: MUTED, lineHeight: 17 },

  // Events
  eventCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  eventIconWrap:{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  eventTitle:   { fontSize: 14, fontWeight: '700', color: DARK },
  eventMeta:    { fontSize: 12, color: MUTED, marginTop: 2 },

  // Departments
  deptCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  deptIconWrap:{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  deptName:    { fontSize: 14, fontWeight: '700', color: DARK },
  deptMeta:    { fontSize: 12, color: MUTED, marginTop: 2 },

  // Reports
  reportCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  statusDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  reportTitle: { fontSize: 14, fontWeight: '700', color: DARK },
  reportMeta:  { fontSize: 12, color: MUTED, marginTop: 2, textTransform: 'capitalize' },
  reportDesc:  { fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 17 },

  // Empty
  empty:     { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: MUTED, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: '800', color: DARK },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: DARK, marginBottom: 6 },
  fieldInput:   { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: DARK, marginBottom: 14 },
  sendBtn:      { height: 50, backgroundColor: BLUE, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  sendBtnText:  { fontSize: 15, fontWeight: '700', color: WHITE },
});
