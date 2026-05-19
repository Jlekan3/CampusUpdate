import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import {
  subscribeToIssueReports,
  subscribeToUserNotificationReads,
  subscribeToDepartments,
  updateDepartment,
  addNotification,
  updateIssueReport,
} from '../../services/databaseService';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:     '#1A365D',
  navyDk:   '#0F2444',
  gold:     '#C5A047',
  goldSoft: 'rgba(197,160,71,0.14)',
  bg:       '#F8F9FA',
  text:     '#2D3748',
  muted:    '#718096',
  blue:     '#2563EB',
  green:    '#38A169',
  red:      '#E53E3E',
  amber:    '#D69E2E',
  teal:     '#0D9488',
  purple:   '#6D28D9',
  surface:  '#FFFFFF',
};

const STORAGE_KEY = 'staff-dashboard-mode';

const THEMES = {
  light: {
    bg:         C.bg,
    surface:    '#FFFFFF',
    surfaceAlt: '#EDF1F8',
    text:       C.text,
    muted:      C.muted,
    border:     'rgba(26,54,93,0.09)',
    statusBar:  'dark-content',
  },
  dark: {
    bg:         '#0A1628',
    surface:    '#0F2038',
    surfaceAlt: '#131D35',
    text:       '#E8EDF8',
    muted:      '#8B9BC4',
    border:     'rgba(197,160,71,0.14)',
    statusBar:  'light-content',
  },
};

// ── Department statuses ───────────────────────────────────────────────────────
const STATUSES = [
  { value: 'Open',       color: C.green,  icon: 'checkmark-circle-outline' },
  { value: 'Available',  color: C.teal,   icon: 'ellipse-outline'           },
  { value: 'Busy',       color: C.amber,  icon: 'time-outline'              },
  { value: 'In Meeting', color: C.purple, icon: 'people-outline'            },
  { value: 'Closed',     color: C.red,    icon: 'close-circle-outline'      },
];

// ── Announcement categories ───────────────────────────────────────────────────
const NOTICE_CATS = ['Academic', 'Administrative', 'Emergency', 'Departmental', 'Events'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const fmtDate = (d) =>
  d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const fmtTime = (d) =>
  d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const fmtRelative = (v) => {
  const d = toDate(v);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
};

const statusCfg = (s) => STATUSES.find((x) => x.value === s) || STATUSES[0];

const REPORT_STATUS_COLORS = {
  open:        { color: C.red,    bg: '#FEE2E2', label: 'Open'        },
  in_progress: { color: C.amber,  bg: '#FEF3C7', label: 'In Progress' },
  resolved:    { color: C.green,  bg: '#D1FAE5', label: 'Resolved'    },
  dismissed:   { color: C.muted,  bg: '#F1F5F9', label: 'Dismissed'   },
};

const NOTICE_PRI_COLORS = {
  emergency:     { color: C.red,    bg: '#FEE2E2' },
  academic:      { color: C.navy,   bg: C.goldSoft },
  administrative:{ color: C.blue,   bg: '#DBEAFE' },
  departmental:  { color: C.teal,   bg: '#CCFBF1' },
  events:        { color: C.green,  bg: '#D1FAE5' },
  default:       { color: C.navy,   bg: C.goldSoft },
};

// ── Quick action definitions ──────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'status',    label: 'Update Status',   desc: 'Change dept availability',  icon: 'toggle-outline',          color: C.teal,   action: 'status'         },
  { id: 'notice',    label: 'Post Notice',      desc: 'Publish an announcement',   icon: 'megaphone-outline',       color: C.gold,   action: 'notice'         },
  { id: 'reports',   label: 'View Reports',     desc: 'Student issue reports',     icon: 'document-text-outline',  color: C.red,    nav:    'ReportsTab'     },
  { id: 'map',       label: 'Campus Map',       desc: 'Navigate & explore campus', icon: 'map-outline',            color: C.navy,   nav:    'Map'            },
  { id: 'emergency', label: 'Emergency',        desc: 'SOS & safety contacts',     icon: 'alert-circle-outline',   color: C.red,    nav:    'SafetySupport'  },
  { id: 'events',    label: 'Events',           desc: 'Upcoming campus events',    icon: 'calendar-outline',       color: C.purple, nav:    'CampusEvents'   },
];

// ─────────────────────────────────────────────────────────────────────────────
const StaffHomeScreen = ({ navigation }) => {
  const { logout, user } = useAuth();
  const { notifications, events, postNotification } = useContext(CampusUpdatesContext);

  const [mode, setMode]               = useState('light');
  const [now, setNow]                 = useState(new Date());
  const [profile, setProfile]         = useState(null);
  const [departments, setDepartments] = useState([]);
  const [reports, setReports]         = useState([]);
  const [readMap, setReadMap]         = useState({});

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport,  setSelectedReport]  = useState(null);

  // Status update form
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingHours,  setPendingHours]  = useState('');
  const [isUpdating,    setIsUpdating]    = useState(false);

  // Notice form
  const [noticeTitle,   setNoticeTitle]   = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeCat,     setNoticeCat]     = useState('Academic');
  const [isPosting,     setIsPosting]     = useState(false);

  // Report response
  const [responseText,  setResponseText]  = useState('');
  const [isResponding,  setIsResponding]  = useState(false);

  // Animations
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const bodyAnim   = useRef(new Animated.Value(0)).current;
  const cardAnims  = useRef(QUICK_ACTIONS.map(() => new Animated.Value(0))).current;

  // ── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (alive && (v === 'light' || v === 'dark')) setMode(v); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => { AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {}); }, [mode]);

  // ── Live clock ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // ── Entrance animation ───────────────────────────────────────────────────
  useEffect(() => {
    const seq = Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.stagger(70, cardAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true })
      )),
    ]);
    seq.start();
    return () => seq.stop();
  }, []);

  // ── Profile ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setProfile(null); return; }
    let cancelled = false;
    supabase.from('users').select('*').eq('id', user.id).single()
      .then(({ data }) => { if (!cancelled && data) setProfile(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.uid]);

  // ── Notification reads ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserNotificationReads(user.id, (e) => setReadMap(e || {}));
    return () => { try { unsub?.(); } catch (_) {} };
  }, [user?.uid]);

  // ── Departments ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToDepartments((items) => setDepartments(items || []));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  // ── Reports ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToIssueReports((items) => setReports(items || []));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const t = THEMES[mode] || THEMES.light;

  const profileName = useMemo(() => {
    const raw = (profile?.name || profile?.fullName || user?.displayName || '').trim();
    if (raw) return raw;
    const local = (user?.email || '').split('@')[0];
    return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [profile, user]);

  const firstName = profileName.split(' ')[0] || 'Staff';

  const deptLabel    = (profile?.department || profile?.dept || '—').trim();
  const positionLabel= (profile?.position   || profile?.role  || 'Staff').trim();

  // The staff's own department from the live list
  const myDept = useMemo(() => {
    if (!deptLabel || deptLabel === '—') return departments[0] || null;
    const lower = deptLabel.toLowerCase();
    return departments.find((d) => (d.name || '').toLowerCase().includes(lower))
      || departments[0]
      || null;
  }, [departments, deptLabel]);

  const unreadCount = useMemo(() =>
    notifications.reduce((n, item) => (readMap[item.id]?.readAt ? n : n + 1), 0),
    [notifications, readMap]
  );

  const openReports = useMemo(() =>
    [...reports]
      .filter((r) => r.status !== 'resolved' && r.status !== 'dismissed')
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 4),
    [reports]
  );

  const latestNotices = useMemo(() =>
    [...notifications].slice(0, 3),
    [notifications]
  );

  const upcomingEvents = useMemo(() => {
    const nowMs = Date.now() - 86400000;
    return [...events]
      .filter((e) => {
        const d = toDate(e.startDate || e.date || e.createdAt);
        return d && d.getTime() >= nowMs;
      })
      .sort((a, b) => {
        const da = toDate(a.startDate || a.date || a.createdAt);
        const db2 = toDate(b.startDate || b.date || b.createdAt);
        return (da?.getTime() || 0) - (db2?.getTime() || 0);
      })
      .slice(0, 3);
  }, [events]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleQuickAction = useCallback((qa) => {
    if (qa.action === 'status') {
      setPendingStatus(myDept?.availabilityStatus || 'Open');
      setPendingHours(myDept?.operatingHours || '');
      setShowStatusModal(true);
      return;
    }
    if (qa.action === 'notice') {
      setShowNoticeModal(true);
      return;
    }
    if (qa.nav) navigation.navigate(qa.nav);
  }, [myDept, navigation]);

  const handleStatusSave = useCallback(async () => {
    if (!myDept?.id || !pendingStatus) return;
    setIsUpdating(true);
    try {
      await updateDepartment(myDept.id, {
        availabilityStatus: pendingStatus,
        operatingHours: pendingHours || myDept.operatingHours,
      });
      Alert.alert('Updated', `Status set to ${pendingStatus}.`);
      setShowStatusModal(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not update status.');
    } finally {
      setIsUpdating(false);
    }
  }, [myDept, pendingStatus, pendingHours]);

  const handlePostNotice = useCallback(async () => {
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      Alert.alert('Incomplete', 'Title and message are required.'); return;
    }
    setIsPosting(true);
    try {
      await addNotification({
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        category: noticeCat,
        type: noticeCat.toLowerCase(),
        audience: 'everyone',
        postedBy: user?.uid || '',
        postedByName: profileName,
      });
      Alert.alert('Published', 'Your announcement is live.');
      setShowNoticeModal(false);
      setNoticeTitle(''); setNoticeMessage(''); setNoticeCat('Academic');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not post notice.');
    } finally {
      setIsPosting(false);
    }
  }, [noticeTitle, noticeMessage, noticeCat, user, profileName]);

  const handleRespondToReport = useCallback(async () => {
    if (!selectedReport?.id || !responseText.trim()) {
      Alert.alert('Incomplete', 'Enter a response before submitting.'); return;
    }
    setIsResponding(true);
    try {
      await updateIssueReport(selectedReport.id, {
        adminResponse: responseText.trim(),
        status: 'in_progress',
        adminReadAt: new Date(),
        adminReadBy: user?.uid,
      });
      Alert.alert('Sent', 'Your response has been recorded.');
      setShowReportModal(false);
      setResponseText('');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not update report.');
    } finally {
      setIsResponding(false);
    }
  }, [selectedReport, responseText, user]);

  // ── Anim helpers ─────────────────────────────────────────────────────────
  const heroSlide = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-26, 0] });
  const bodySlide = bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const cardStyle = (i) => ({
    opacity:   cardAnims[i],
    transform: [{ translateY: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper backgroundColor={t.bg} statusBarStyle={t.statusBar}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.hero, { opacity: heroAnim, transform: [{ translateY: heroSlide }] }]}>
          <View style={styles.heroGoldBar} />
          <View style={styles.heroOrbA} />
          <View style={styles.heroOrbB} />

          {/* Top row */}
          <View style={styles.heroTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(firstName)}</Text>
            </View>
            <View style={styles.heroControls}>
              <TouchableOpacity style={styles.heroBtn} onPress={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))} activeOpacity={0.8}>
                <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={16} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <Text style={styles.heroGreeting}>{getGreeting()} 👋</Text>
          <Text style={styles.heroName}>{firstName}</Text>
          <Text style={styles.heroRole}>{positionLabel}  ·  {deptLabel}</Text>
          <Text style={styles.heroDate}>{fmtDate(now)}  ·  {fmtTime(now)}</Text>

          {/* Stats pills */}
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Ionicons name="document-text-outline" size={13} color={C.gold} />
              <Text style={styles.heroPillText}>{openReports.length} open reports</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="notifications-outline" size={13} color={C.gold} />
              <Text style={styles.heroPillText}>{unreadCount} unread</Text>
            </View>
            {myDept && (
              <View style={[styles.heroPill, { backgroundColor: `${statusCfg(myDept.availabilityStatus).color}22`, borderColor: `${statusCfg(myDept.availabilityStatus).color}44` }]}>
                <Ionicons name={statusCfg(myDept.availabilityStatus).icon} size={13} color={statusCfg(myDept.availabilityStatus).color} />
                <Text style={[styles.heroPillText, { color: statusCfg(myDept.availabilityStatus).color }]}>
                  {myDept.availabilityStatus || 'Open'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.body, { opacity: bodyAnim, transform: [{ translateY: bodySlide }] }]}>

          {/* ── QUICK ACTIONS (2-col) ──────────────────────────────────── */}
          <Text style={[styles.eyebrow, { color: C.gold }]}>Manage</Text>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Quick Actions</Text>

          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((qa, i) => (
              <Animated.View key={qa.id} style={[styles.qaCardWrap, cardStyle(i)]}>
                <TouchableOpacity
                  style={[styles.qaCard, { backgroundColor: t.surface, borderColor: t.border }]}
                  onPress={() => handleQuickAction(qa)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.qaLeftBar, { backgroundColor: qa.color }]} />
                  <View style={styles.qaBody}>
                    <View style={[styles.qaIconBox, { backgroundColor: `${qa.color}18` }]}>
                      <Ionicons name={qa.icon} size={22} color={qa.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.qaLabel, { color: t.text }]}>{qa.label}</Text>
                      <Text style={[styles.qaDesc, { color: t.muted }]}>{qa.desc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={t.muted} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* ── MY DEPARTMENT ─────────────────────────────────────────── */}
          {myDept && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: C.gold }]}>Live</Text>
                  <Text style={[styles.sectionTitle, { color: t.text }]}>My Department</Text>
                </View>
                <View style={styles.liveChip}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Real-time</Text>
                </View>
              </View>

              <View style={[styles.deptCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                <View style={[styles.deptGoldBar, { backgroundColor: C.gold }]} />
                <View style={styles.deptTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deptName, { color: t.text }]}>{myDept.name}</Text>
                    {myDept.operatingHours ? (
                      <Text style={[styles.deptHours, { color: t.muted }]}>
                        <Ionicons name="time-outline" size={12} /> {myDept.operatingHours}
                      </Text>
                    ) : null}
                    <Text style={[styles.deptUpdated, { color: t.muted }]}>
                      Updated {fmtRelative(myDept.updatedAt || myDept.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.deptStatusBadge, { backgroundColor: `${statusCfg(myDept.availabilityStatus).color}18`, borderColor: `${statusCfg(myDept.availabilityStatus).color}30` }]}>
                    <Ionicons name={statusCfg(myDept.availabilityStatus).icon} size={14} color={statusCfg(myDept.availabilityStatus).color} />
                    <Text style={[styles.deptStatusText, { color: statusCfg(myDept.availabilityStatus).color }]}>
                      {myDept.availabilityStatus || 'Open'}
                    </Text>
                  </View>
                </View>

                {/* Quick status toggle */}
                <Text style={[styles.deptToggleLabel, { color: t.muted }]}>Quick update:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deptToggleRow}>
                  {STATUSES.map((s) => {
                    const isActive = (myDept.availabilityStatus || 'Open') === s.value;
                    return (
                      <TouchableOpacity
                        key={s.value}
                        style={[styles.deptToggleBtn, { borderColor: s.color, backgroundColor: isActive ? s.color : 'transparent' }]}
                        onPress={async () => {
                          try {
                            await updateDepartment(myDept.id, { availabilityStatus: s.value });
                          } catch (e) {
                            Alert.alert('Error', e?.message || 'Failed');
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.deptToggleBtnText, { color: isActive ? '#fff' : s.color }]}>{s.value}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}

          {/* ── RECENT REPORTS ────────────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.eyebrow, { color: C.gold }]}>Inbox</Text>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Student Reports</Text>
            </View>
            {openReports.length > 0 && (
              <View style={styles.countChip}>
                <Text style={styles.countChipText}>{openReports.length} open</Text>
              </View>
            )}
          </View>

          {openReports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={C.green} />
              <Text style={[styles.emptyText, { color: t.muted }]}>No open reports — all clear!</Text>
            </View>
          ) : (
            <View style={styles.reportList}>
              {openReports.map((report, idx) => {
                const rCfg = REPORT_STATUS_COLORS[report.status] || REPORT_STATUS_COLORS.open;
                return (
                  <TouchableOpacity
                    key={report.id || idx}
                    style={[styles.reportCard, { backgroundColor: t.surface, borderColor: t.border }]}
                    onPress={() => { setSelectedReport(report); setResponseText(report.adminResponse || ''); setShowReportModal(true); }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.reportLeftBar, { backgroundColor: rCfg.color }]} />
                    <View style={styles.reportBody}>
                      <View style={styles.reportTopRow}>
                        <View style={[styles.reportStatusBadge, { backgroundColor: rCfg.bg }]}>
                          <Text style={[styles.reportStatusText, { color: rCfg.color }]}>{rCfg.label}</Text>
                        </View>
                        <Text style={[styles.reportTime, { color: t.muted }]}>{fmtRelative(report.createdAt)}</Text>
                      </View>
                      <Text style={[styles.reportTitle, { color: t.text }]} numberOfLines={1}>
                        {report.title || 'Campus Issue'}
                      </Text>
                      <View style={styles.reportMeta}>
                        <Ionicons name="person-outline" size={12} color={t.muted} />
                        <Text style={[styles.reportMetaText, { color: t.muted }]}>
                          {report.reporterName || 'Anonymous'}  ·  {report.category || 'General'}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={t.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── ANNOUNCEMENTS ─────────────────────────────────────────── */}
          {latestNotices.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: C.gold }]}>Feed</Text>
                  <Text style={[styles.sectionTitle, { color: t.text }]}>Announcements</Text>
                </View>
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('Notifications')}>
                  <Text style={styles.seeAllText}>See all</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.gold} />
                </TouchableOpacity>
              </View>

              <View style={styles.noticeList}>
                {latestNotices.map((item, idx) => {
                  const cat  = (item.category || item.type || 'default').toLowerCase();
                  const pri  = NOTICE_PRI_COLORS[cat] || NOTICE_PRI_COLORS.default;
                  const mine = item.postedBy === user?.uid;
                  return (
                    <View key={item.id || idx} style={[styles.noticeCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                      <View style={[styles.noticeLeftBar, { backgroundColor: pri.color }]} />
                      <View style={styles.noticeBody}>
                        <View style={styles.noticeTopRow}>
                          <View style={[styles.noticePriChip, { backgroundColor: pri.bg }]}>
                            <Text style={[styles.noticePriText, { color: pri.color }]}>{item.category || 'Notice'}</Text>
                          </View>
                          {mine && (
                            <View style={styles.mineBadge}>
                              <Text style={styles.mineBadgeText}>You</Text>
                            </View>
                          )}
                          <Text style={[styles.noticeTime, { color: t.muted }]}>{fmtRelative(item.createdAt)}</Text>
                        </View>
                        <Text style={[styles.noticeTitle, { color: t.text }]} numberOfLines={1}>
                          {item.title || item.subject || 'Campus Notice'}
                        </Text>
                        <Text style={[styles.noticePreview, { color: t.muted }]} numberOfLines={2}>
                          {item.message || item.body || item.description || ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── UPCOMING EVENTS ───────────────────────────────────────── */}
          {upcomingEvents.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: C.gold }]}>Calendar</Text>
                  <Text style={[styles.sectionTitle, { color: t.text }]}>Upcoming Events</Text>
                </View>
                <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate('CampusEvents')}>
                  <Text style={styles.seeAllText}>See all</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.gold} />
                </TouchableOpacity>
              </View>

              <View style={styles.eventList}>
                {upcomingEvents.map((ev, idx) => {
                  const evDate = toDate(ev.startDate || ev.date || ev.createdAt);
                  const day  = evDate ? evDate.toLocaleDateString([], { day: '2-digit' }) : '—';
                  const mon  = evDate ? evDate.toLocaleDateString([], { month: 'short' }).toUpperCase() : '';
                  const time = evDate ? fmtTime(evDate) : '';
                  return (
                    <TouchableOpacity
                      key={ev.id || idx}
                      style={[styles.eventCard, { backgroundColor: t.surface, borderColor: t.border }]}
                      onPress={() => navigation.navigate('CampusEvents')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.eventDateBlock}>
                        <Text style={styles.eventDay}>{day}</Text>
                        <Text style={styles.eventMon}>{mon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventTitle, { color: t.text }]} numberOfLines={1}>{ev.title || ev.name || 'Campus Event'}</Text>
                        {ev.location ? (
                          <View style={styles.eventMeta}>
                            <Ionicons name="location-outline" size={12} color={t.muted} />
                            <Text style={[styles.eventMetaText, { color: t.muted }]} numberOfLines={1}>{ev.location}</Text>
                          </View>
                        ) : null}
                        {time ? (
                          <View style={styles.eventMeta}>
                            <Ionicons name="time-outline" size={12} color={t.muted} />
                            <Text style={[styles.eventMetaText, { color: t.muted }]}>{time}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={t.muted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── FOOTER INFO ───────────────────────────────────────────── */}
          <View style={[styles.footerCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.footerGoldBar, { backgroundColor: C.gold }]} />
            <View style={styles.footerRow}>
              <View style={[styles.footerIcon, { backgroundColor: C.goldSoft }]}>
                <Ionicons name="time-outline" size={18} color={C.gold} />
              </View>
              <View>
                <Text style={[styles.footerTitle, { color: t.text }]}>Campus Hours</Text>
                <Text style={[styles.footerBody, { color: t.muted }]}>Mon – Fri  ·  9:00 AM – 4:00 PM</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STATUS UPDATE MODAL                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showStatusModal} animationType="slide" transparent onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: t.surface }]}>
            <View style={[styles.modalGoldBar, { backgroundColor: C.gold }]} />
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Update Department Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={t.muted} />
              </TouchableOpacity>
            </View>

            {myDept && (
              <Text style={[styles.modalSubtitle, { color: t.muted }]}>{myDept.name}</Text>
            )}

            <Text style={[styles.modalLabel, { color: t.text }]}>Availability Status</Text>
            <View style={styles.statusGrid}>
              {STATUSES.map((s) => {
                const active = pendingStatus === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.statusBtn, { borderColor: s.color, backgroundColor: active ? s.color : `${s.color}10` }]}
                    onPress={() => setPendingStatus(s.value)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={s.icon} size={18} color={active ? '#fff' : s.color} />
                    <Text style={[styles.statusBtnText, { color: active ? '#fff' : s.color }]}>{s.value}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, { color: t.text }]}>Office Hours (optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: t.surfaceAlt, color: t.text, borderColor: t.border }]}
              placeholder="e.g. 9:00 AM – 4:00 PM"
              placeholderTextColor={t.muted}
              value={pendingHours}
              onChangeText={setPendingHours}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: C.gold }, isUpdating && { opacity: 0.6 }]}
              onPress={handleStatusSave}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating
                ? <ActivityIndicator color={C.navyDk} size="small" />
                : <Text style={styles.saveBtnText}>Save Status</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* POST ANNOUNCEMENT MODAL                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showNoticeModal} animationType="slide" transparent={false} onRequestClose={() => setShowNoticeModal(false)}>
        <ScreenWrapper backgroundColor={C.navy} statusBarStyle="light-content">
          <ScrollView contentContainerStyle={styles.noticeModalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.noticeModalHeader}>
              <TouchableOpacity onPress={() => setShowNoticeModal(false)}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.noticeModalTitle}>Post Announcement</Text>
              <View style={{ width: 26 }} />
            </View>

            <View style={styles.noticeModalForm}>
              <Text style={styles.noticeLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.noticeCatRow}>
                {NOTICE_CATS.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.noticeCatBtn, noticeCat === cat && styles.noticeCatBtnActive]}
                    onPress={() => setNoticeCat(cat)}
                  >
                    <Text style={[styles.noticeCatText, noticeCat === cat && styles.noticeCatTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.noticeLabel}>Title</Text>
              <TextInput
                style={styles.noticeInput}
                placeholder="Announcement title"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={noticeTitle}
                onChangeText={setNoticeTitle}
              />

              <Text style={styles.noticeLabel}>Message</Text>
              <TextInput
                style={[styles.noticeInput, styles.noticeTextArea]}
                placeholder="Write your announcement..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={noticeMessage}
                onChangeText={setNoticeMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <CustomButton
                title={isPosting ? 'Publishing...' : 'Publish Announcement'}
                onPress={handlePostNotice}
                style={{ marginTop: 24, marginBottom: 12 }}
              />
              <CustomButton
                title="Cancel"
                onPress={() => setShowNoticeModal(false)}
                variant="outline"
                style={{ marginBottom: 36 }}
              />
            </View>
          </ScrollView>
        </ScreenWrapper>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REPORT DETAIL MODAL                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal visible={showReportModal} animationType="slide" transparent onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.reportModalSheet, { backgroundColor: t.surface }]}>
            <View style={[styles.modalGoldBar, { backgroundColor: C.red }]} />
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Report Details</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color={t.muted} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.reportModalTitle, { color: t.text }]}>
                  {selectedReport.title || 'Campus Issue'}
                </Text>
                <View style={styles.reportModalMeta}>
                  <Text style={[styles.reportModalMetaText, { color: t.muted }]}>
                    From: {selectedReport.reporterName || 'Anonymous'}
                  </Text>
                  <Text style={[styles.reportModalMetaText, { color: t.muted }]}>
                    Type: {selectedReport.category || 'General'}
                  </Text>
                  <Text style={[styles.reportModalMetaText, { color: t.muted }]}>
                    Filed: {fmtRelative(selectedReport.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.reportModalBody, { color: t.text }]}>
                  {selectedReport.description || '—'}
                </Text>

                <Text style={[styles.modalLabel, { color: t.text, marginTop: 16 }]}>Your Response</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: t.surfaceAlt, color: t.text, borderColor: t.border, minHeight: 90, textAlignVertical: 'top' }]}
                  placeholder="Write a response to this report..."
                  placeholderTextColor={t.muted}
                  value={responseText}
                  onChangeText={setResponseText}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.navy, marginBottom: 24 }, isResponding && { opacity: 0.6 }]}
                  onPress={handleRespondToReport}
                  disabled={isResponding}
                  activeOpacity={0.85}
                >
                  {isResponding
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[styles.saveBtnText, { color: '#fff' }]}>Send Response</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // ── Hero
  hero: { backgroundColor: C.navy, paddingTop: 54, paddingBottom: 28, paddingHorizontal: 22, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', shadowColor: '#060F1E', shadowOpacity: 0.32, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
  heroGoldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: C.gold },
  heroOrbA:    { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: C.gold, opacity: 0.08, top: -70, right: -60 },
  heroOrbB:    { position: 'absolute', width: 160, height: 160, borderRadius: 80,  backgroundColor: C.blue, opacity: 0.08, bottom: -50, left: -40 },

  heroTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatar:        { width: 54, height: 54, borderRadius: 27, backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.40)' },
  avatarText:    { fontSize: 20, fontWeight: '800', color: C.navyDk },
  heroControls:  { flexDirection: 'row', gap: 10 },
  heroBtn:       { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  heroBadge:     { position: 'absolute', top: -6, right: -6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: C.navy },
  heroBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  heroGreeting:  { fontSize: 13, color: 'rgba(255,255,255,0.68)', fontWeight: '600', marginBottom: 4 },
  heroName:      { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 0.2, marginBottom: 4 },
  heroRole:      { fontSize: 13, color: C.gold, fontWeight: '600', marginBottom: 4 },
  heroDate:      { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 18 },
  heroPillRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)' },
  heroPillText:  { fontSize: 12, fontWeight: '600', color: '#fff' },

  // ── Body
  body: { paddingHorizontal: 16, paddingTop: 24 },

  // ── Section headers
  eyebrow:          { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4 },
  sectionTitle:     { fontSize: 22, fontWeight: '800', letterSpacing: 0.2, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  seeAllBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  seeAllText:       { fontSize: 13, fontWeight: '700', color: C.gold },
  liveChip:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#C6F6D5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 16 },
  liveDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  liveText:         { fontSize: 11, fontWeight: '700', color: C.green },
  countChip:        { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FEE2E2', borderRadius: 20, marginBottom: 16 },
  countChipText:    { fontSize: 12, fontWeight: '700', color: C.red },

  // ── Quick actions (2-col full-width cards)
  qaGrid:     { gap: 10, marginBottom: 28 },
  qaCardWrap: {},
  qaCard:     { borderRadius: 20, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', shadowColor: '#060F1E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  qaLeftBar:  { width: 4 },
  qaBody:     { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  qaIconBox:  { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  qaLabel:    { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  qaDesc:     { fontSize: 12, lineHeight: 16 },

  // ── My department
  deptCard:        { borderRadius: 22, borderWidth: 1, overflow: 'hidden', marginBottom: 28, shadowColor: '#060F1E', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  deptGoldBar:     { height: 3 },
  deptTopRow:      { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  deptName:        { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  deptHours:       { fontSize: 12, marginBottom: 2 },
  deptUpdated:     { fontSize: 11, fontStyle: 'italic' },
  deptStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  deptStatusText:  { fontSize: 13, fontWeight: '700' },
  deptToggleLabel: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  deptToggleRow:   { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  deptToggleBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  deptToggleBtnText:{ fontSize: 12, fontWeight: '700' },

  // ── Reports
  reportList:      { gap: 10, marginBottom: 28 },
  reportCard:      { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#060F1E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  reportLeftBar:   { width: 4, alignSelf: 'stretch' },
  reportBody:      { flex: 1, padding: 14 },
  reportTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reportStatusBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reportStatusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  reportTime:      { fontSize: 11, marginLeft: 'auto' },
  reportTitle:     { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  reportMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportMetaText:  { fontSize: 12 },
  emptyCard:       { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 10, marginBottom: 28 },
  emptyText:       { fontSize: 14, fontWeight: '600' },

  // ── Notices
  noticeList:      { gap: 10, marginBottom: 28 },
  noticeCard:      { flexDirection: 'row', borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#060F1E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  noticeLeftBar:   { width: 4 },
  noticeBody:      { flex: 1, padding: 14 },
  noticeTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  noticePriChip:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noticePriText:   { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  mineBadge:       { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: C.goldSoft },
  mineBadgeText:   { fontSize: 10, fontWeight: '800', color: C.gold, textTransform: 'uppercase' },
  noticeTime:      { fontSize: 11, marginLeft: 'auto' },
  noticeTitle:     { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  noticePreview:   { fontSize: 12, lineHeight: 17 },

  // ── Events
  eventList:       { gap: 10, marginBottom: 28 },
  eventCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 14, gap: 14, shadowColor: '#060F1E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  eventDateBlock:  { width: 52, alignItems: 'center', backgroundColor: C.goldSoft, borderRadius: 14, paddingVertical: 10 },
  eventDay:        { fontSize: 22, fontWeight: '800', color: C.navy },
  eventMon:        { fontSize: 11, fontWeight: '700', color: C.gold },
  eventTitle:      { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  eventMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText:   { fontSize: 12 },

  // ── Footer
  footerCard:      { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 8, shadowColor: '#060F1E', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  footerGoldBar:   { height: 3 },
  footerRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  footerIcon:      { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  footerTitle:     { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  footerBody:      { fontSize: 12 },

  // ── Status modal (sheet)
  modalBackdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet:      { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '90%', overflow: 'hidden' },
  modalGoldBar:    { height: 4, marginHorizontal: -20 },
  modalHandle:     { width: 44, height: 4, borderRadius: 2, backgroundColor: '#CBD5E0', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', marginBottom: 16 },
  modalTitle:      { fontSize: 18, fontWeight: '800' },
  modalSubtitle:   { fontSize: 14, marginBottom: 16, fontWeight: '500' },
  modalLabel:      { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  modalInput:      { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 14, marginBottom: 16 },

  // Status grid
  statusGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statusBtn:       { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  statusBtnText:   { fontSize: 13, fontWeight: '700' },

  saveBtn:         { borderRadius: 16, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  saveBtnText:     { fontSize: 15, fontWeight: '800', color: C.navyDk },

  // Report modal sheet
  reportModalSheet:   { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '88%', overflow: 'hidden' },
  reportModalTitle:   { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  reportModalMeta:    { gap: 4, marginBottom: 14 },
  reportModalMetaText:{ fontSize: 13 },
  reportModalBody:    { fontSize: 14, lineHeight: 22, padding: 14, borderRadius: 14, backgroundColor: '#F8F9FA', marginBottom: 4 },

  // Notice modal
  noticeModalScroll:  { paddingBottom: 36 },
  noticeModalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  noticeModalTitle:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  noticeModalForm:    { paddingHorizontal: 20, paddingTop: 22 },
  noticeLabel:        { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 10, marginTop: 18 },
  noticeCatRow:       { gap: 10, paddingBottom: 4 },
  noticeCatBtn:       { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  noticeCatBtnActive: { backgroundColor: C.gold },
  noticeCatText:      { color: '#fff', fontSize: 13, fontWeight: '600' },
  noticeCatTextActive:{ color: C.navyDk },
  noticeInput:        { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', padding: 14, color: '#fff', fontSize: 14, marginBottom: 4 },
  noticeTextArea:     { minHeight: 120, textAlignVertical: 'top' },
});

export default StaffHomeScreen;
