import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import {
  addIssueReport,
  subscribeToUserNotificationReads,
  subscribeToDepartments,
} from '../../services/databaseService';
import { USER_ROLES } from '../../utils/constants';

// ── Brand palette ─────────────────────────────────────────────────────────────
const C = {
  navy:      '#1A365D',
  navyDk:    '#0F2444',
  gold:      '#C5A047',
  goldSoft:  'rgba(197,160,71,0.14)',
  bg:        '#F8F9FA',
  darkText:  '#2D3748',
  blue:      '#2563EB',
  green:     '#38A169',
  red:       '#E53E3E',
  amber:     '#D69E2E',
  teal:      '#0D9488',
  purple:    '#6D28D9',
  muted:     '#718096',
};

const STORAGE_KEY = 'student-dashboard-mode';

const THEMES = {
  light: {
    bg:         C.bg,
    surface:    '#FFFFFF',
    surfaceAlt: '#EDF1F8',
    text:       C.darkText,
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

// ── Quick actions ─────────────────────────────────────────────────────────────
const PRIMARY_ACTIONS = [
  { id: 'map',       label: 'Campus Map',   icon: 'map-outline',            color: C.navy,   nav: 'Map'          },
  { id: 'search',    label: 'Search',       icon: 'search-outline',         color: C.gold,   nav: 'Search'       },
  { id: 'events',    label: 'Events',       icon: 'calendar-outline',       color: C.green,  nav: 'CampusEvents' },
  { id: 'notifs',    label: 'Alerts',       icon: 'notifications-outline',  color: C.purple, nav: 'Notifications', badge: true },
  { id: 'favorites', label: 'Saved',        icon: 'heart-outline',          color: C.red,    nav: 'Favorites'    },
  { id: 'emergency', label: 'Emergency',    icon: 'alert-circle-outline',   color: C.red,    nav: 'SafetySupport' },
];

const UTIL_ACTIONS = [
  { id: 'dining',    label: 'Dining',    icon: 'restaurant-outline', color: C.amber, nav: 'Dining'    },
  { id: 'amenities', label: 'Amenities', icon: 'fitness-outline',    color: C.teal,  nav: 'Amenities' },
  { id: 'qr',        label: 'Scan QR',   icon: 'qr-code-outline',    color: C.blue,  nav: 'QRScanner' },
];

const DEPT_STATUS = {
  Open:      { color: C.green,  icon: 'checkmark-circle-outline' },
  Closed:    { color: C.red,    icon: 'close-circle-outline'     },
  Busy:      { color: C.amber,  icon: 'time-outline'             },
  Available: { color: C.teal,   icon: 'ellipse-outline'          },
};

const NOTICE_PRIORITY = {
  emergency: { label: 'Emergency', color: C.red,   bg: '#FEE2E2' },
  urgent:    { label: 'Urgent',    color: C.amber, bg: '#FEF3C7' },
  event:     { label: 'Event',     color: C.blue,  bg: '#DBEAFE' },
  default:   { label: 'Notice',    color: C.navy,  bg: C.goldSoft },
};

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
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getNoticePriority = (item) => {
  const cat = (item?.category || item?.type || '').toLowerCase();
  if (cat.includes('emergency')) return NOTICE_PRIORITY.emergency;
  if (cat.includes('urgent'))    return NOTICE_PRIORITY.urgent;
  if (cat.includes('event'))     return NOTICE_PRIORITY.event;
  return NOTICE_PRIORITY.default;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
};

// ── Component ─────────────────────────────────────────────────────────────────
const StudentHomeScreen = ({ navigation }) => {
  const { logout, user, userRole } = useAuth();
  const { notifications, events } = useContext(CampusUpdatesContext);

  const [mode, setMode]               = useState('light');
  const [profile, setProfile]         = useState(null);
  const [departments, setDepartments] = useState([]);
  const [readMap, setReadMap]         = useState({});
  const [now, setNow]                 = useState(new Date());
  const [showReport, setShowReport]   = useState(false);
  const [issueTitle, setIssueTitle]   = useState('');
  const [issueDesc, setIssueDesc]     = useState('');
  const [issueCat, setIssueCat]       = useState('Technical');
  const [photos, setPhotos]           = useState([]);

  // Animations
  const heroAnim    = useRef(new Animated.Value(0)).current;
  const bodyAnim    = useRef(new Animated.Value(0)).current;
  const primAnims   = useRef(PRIMARY_ACTIONS.map(() => new Animated.Value(0))).current;
  const utilAnims   = useRef(UTIL_ACTIONS.map(() => new Animated.Value(0))).current;

  // ── Load theme ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (alive && (v === 'light' || v === 'dark')) setMode(v);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, [mode]);

  // ── Live clock (every minute) ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── Entrance animations ─────────────────────────────────────────────────────
  useEffect(() => {
    const allCardAnims = [...primAnims, ...utilAnims];
    const seq = Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.stagger(60, allCardAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 160, useNativeDriver: true })
      )),
    ]);
    seq.start();
    return () => seq.stop();
  }, []);

  // ── Profile & notification reads ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setProfile(null); setReadMap({}); return; }
    let cancelled = false;

    supabase.from('users').select('full_name,department,programme,student_id,role,position').eq('id', user.id).single()
      .then(({ data }) => { if (!cancelled && data) setProfile(data); })
      .catch(() => {});

    const unsub = subscribeToUserNotificationReads(user.id, (e) => setReadMap(e || {}));
    return () => { cancelled = true; try { unsub?.(); } catch (_) {} };
  }, [user?.uid]);

  // ── Departments live ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToDepartments((items) => setDepartments(items || []));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const t = THEMES[mode] || THEMES.light;

  const profileName = useMemo(() => {
    const raw = (profile?.name || profile?.fullName || user?.displayName || '').trim();
    if (raw) return raw;
    const local = (user?.email || '').split('@')[0];
    return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [profile, user]);

  const firstName = profileName.split(' ')[0] || 'Student';

  const isStaff    = userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.ADMIN;
  const indexNo    = profile?.studentID || profile?.indexNumber || profile?.staffId || '—';
  const programme  = profile?.programme || profile?.department || '—';

  const unreadCount = useMemo(() => {
    return notifications.reduce((n, item) => {
      const read = readMap[item.id]?.readAt;
      return read ? n : n + 1;
    }, 0);
  }, [notifications, readMap]);

  const latestNotices = useMemo(() =>
    [...notifications].slice(0, 3),
    [notifications]
  );

  const upcomingEvents = useMemo(() => {
    const now2 = Date.now();
    return [...events]
      .filter((e) => {
        const d = toDate(e.startDate || e.date || e.createdAt);
        return d && d.getTime() >= now2 - 86400000; // include today
      })
      .sort((a, b) => {
        const da = toDate(a.startDate || a.date || a.createdAt);
        const db2 = toDate(b.startDate || b.date || b.createdAt);
        return (da?.getTime() || 0) - (db2?.getTime() || 0);
      })
      .slice(0, 3);
  }, [events]);

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const goTo = (screen) => {
    if (screen === 'QRScanner') {
      navigation.getParent?.()?.navigate('QRScanner') || navigation.navigate(screen);
      return;
    }
    navigation.navigate(screen);
  };

  const cardStyle = (anims, i) => ({
    opacity:   anims[i],
    transform: [{ translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  // ── Issue report ────────────────────────────────────────────────────────────
  const handleReport = () => {
    if (!issueTitle.trim() || !issueDesc.trim()) {
      Alert.alert('Incomplete', 'Please fill in all fields.'); return;
    }
    addIssueReport({
      title: issueTitle.trim(),
      description: issueDesc.trim(),
      category: issueCat,
      photoUris: photos,
      photoCount: photos.length,
      reporterId: user?.uid || '',
      reporterName: profileName,
      reporterEmail: user?.email || '',
      reporterRole: userRole || 'student',
      status: 'open',
    }).then(() => {
      Alert.alert('Submitted', 'Your report has been sent.');
      setShowReport(false); setIssueTitle(''); setIssueDesc('');
      setIssueCat('Technical'); setPhotos([]);
    }).catch((err) => Alert.alert('Error', err?.message || 'Failed to submit.'));
  };

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!res.cancelled && res.uri) setPhotos((p) => [...p, res.uri]);
    } catch (_) {}
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const heroSlide = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] });
  const bodySlide = bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <ScreenWrapper backgroundColor={t.bg} statusBarStyle={t.statusBar}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.hero, { opacity: heroAnim, transform: [{ translateY: heroSlide }] }]}>
          <View style={styles.heroGoldBar} />
          <View style={styles.heroOrbA} />
          <View style={styles.heroOrbB} />

          {/* Top row: avatar + controls */}
          <View style={styles.heroTopRow}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(firstName)}</Text>
            </View>

            {/* Controls */}
            <View style={styles.heroControls}>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
                activeOpacity={0.8}
              >
                <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => goTo('Notifications')}
                activeOpacity={0.8}
              >
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

          {/* Date / time */}
          <Text style={styles.heroDate}>{fmtDate(now)}  ·  {fmtTime(now)}</Text>

          {/* Student details */}
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Ionicons name={isStaff ? 'briefcase-outline' : 'school-outline'} size={13} color={C.gold} />
              <Text style={styles.heroPillText}>{isStaff ? 'Staff' : `Index: ${indexNo}`}</Text>
            </View>
            {!isStaff && (
              <View style={styles.heroPill}>
                <Ionicons name="book-outline" size={13} color={C.gold} />
                <Text style={styles.heroPillText} numberOfLines={1}>{programme}</Text>
              </View>
            )}
            <View style={styles.heroPill}>
              <Ionicons name="navigate-outline" size={13} color={C.gold} />
              <Text style={styles.heroPillText}>RMU Campus</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── BODY ───────────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.body, { opacity: bodyAnim, transform: [{ translateY: bodySlide }] }]}>

          {/* ── QUICK ACTIONS ─────────────────────────────────────────────── */}
          <Text style={[styles.eyebrow, { color: C.gold }]}>Navigate</Text>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Quick Access</Text>

          <View style={styles.primaryGrid}>
            {PRIMARY_ACTIONS.map((item, i) => (
              <Animated.View key={item.id} style={[styles.primaryCardWrap, cardStyle(primAnims, i)]}>
                <TouchableOpacity
                  style={[styles.primaryCard, { backgroundColor: t.surface, borderColor: t.border }]}
                  onPress={() => goTo(item.nav)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.primaryTopBar, { backgroundColor: item.color }]} />
                  <View style={[styles.primaryIconBox, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={26} color={item.color} />
                    {item.badge && unreadCount > 0 && (
                      <View style={styles.cardBadge}>
                        <Text style={styles.cardBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.primaryLabel, { color: t.text }]}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* ── UTILITIES ─────────────────────────────────────────────────── */}
          <View style={styles.utilRow}>
            {UTIL_ACTIONS.map((item, i) => (
              <Animated.View key={item.id} style={[styles.utilCardWrap, cardStyle(utilAnims, i)]}>
                <TouchableOpacity
                  style={[styles.utilCard, { backgroundColor: t.surface, borderColor: t.border }]}
                  onPress={() => goTo(item.nav)}
                  activeOpacity={0.82}
                >
                  <View style={[styles.utilIconBox, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.utilLabel, { color: t.text }]}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* ── DEPARTMENT STATUS ─────────────────────────────────────────── */}
          {departments.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: C.gold }]}>Live Status</Text>
                  <Text style={[styles.sectionTitle, { color: t.text }]}>Departments</Text>
                </View>
                <View style={styles.liveChip}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live</Text>
                </View>
              </View>

              <View style={[styles.deptCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                <View style={[styles.deptGoldBar, { backgroundColor: C.gold }]} />
                {departments.slice(0, 5).map((dept, idx) => {
                  const status = dept.availabilityStatus || 'Open';
                  const cfg    = DEPT_STATUS[status] || DEPT_STATUS.Open;
                  return (
                    <View
                      key={dept.id || idx}
                      style={[styles.deptRow, idx < Math.min(departments.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}
                    >
                      <View style={styles.deptLeft}>
                        <View style={[styles.deptDot, { backgroundColor: cfg.color }]} />
                        <View>
                          <Text style={[styles.deptName, { color: t.text }]} numberOfLines={1}>{dept.name}</Text>
                          {dept.operatingHours ? (
                            <Text style={[styles.deptHours, { color: t.muted }]}>{dept.operatingHours}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={[styles.deptBadge, { backgroundColor: `${cfg.color}18`, borderColor: `${cfg.color}30` }]}>
                        <Ionicons name={cfg.icon} size={12} color={cfg.color} />
                        <Text style={[styles.deptBadgeText, { color: cfg.color }]}>{status}</Text>
                      </View>
                    </View>
                  );
                })}
                {departments.length > 5 && (
                  <Text style={[styles.deptMore, { color: t.muted }]}>
                    +{departments.length - 5} more departments
                  </Text>
                )}
              </View>
            </>
          )}

          {/* ── ANNOUNCEMENTS ─────────────────────────────────────────────── */}
          {latestNotices.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: C.gold }]}>Updates</Text>
                  <Text style={[styles.sectionTitle, { color: t.text }]}>Announcements</Text>
                </View>
                <TouchableOpacity onPress={() => goTo('Notifications')} style={styles.seeAllBtn}>
                  <Text style={styles.seeAllText}>See all</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.gold} />
                </TouchableOpacity>
              </View>

              <View style={styles.noticeList}>
                {latestNotices.map((item, idx) => {
                  const pri   = getNoticePriority(item);
                  const isNew = !readMap[item.id]?.readAt;
                  return (
                    <TouchableOpacity
                      key={item.id || idx}
                      style={[styles.noticeCard, { backgroundColor: t.surface, borderColor: t.border }]}
                      onPress={() => goTo('Notifications')}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.noticeLeftBar, { backgroundColor: pri.color }]} />
                      <View style={styles.noticeBody}>
                        <View style={styles.noticeTopRow}>
                          <View style={[styles.noticePri, { backgroundColor: pri.bg }]}>
                            <Text style={[styles.noticePriText, { color: pri.color }]}>{pri.label}</Text>
                          </View>
                          {isNew && <View style={styles.newDot} />}
                          <Text style={[styles.noticeTime, { color: t.muted }]}>{fmtRelative(item.createdAt)}</Text>
                        </View>
                        <Text style={[styles.noticeTitle, { color: t.text }]} numberOfLines={1}>
                          {item.title || item.subject || 'Campus notice'}
                        </Text>
                        <Text style={[styles.noticePreview, { color: t.muted }]} numberOfLines={2}>
                          {item.message || item.body || item.description || ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── UPCOMING EVENTS ───────────────────────────────────────────── */}
          {upcomingEvents.length > 0 && (
            <>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: C.gold }]}>Calendar</Text>
                  <Text style={[styles.sectionTitle, { color: t.text }]}>Upcoming Events</Text>
                </View>
                <TouchableOpacity onPress={() => goTo('CampusEvents')} style={styles.seeAllBtn}>
                  <Text style={styles.seeAllText}>See all</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.gold} />
                </TouchableOpacity>
              </View>

              <View style={styles.eventList}>
                {upcomingEvents.map((ev, idx) => {
                  const evDate = toDate(ev.startDate || ev.date || ev.createdAt);
                  const day    = evDate ? evDate.toLocaleDateString([], { day: '2-digit' }) : '—';
                  const mon    = evDate ? evDate.toLocaleDateString([], { month: 'short' }).toUpperCase() : '';
                  const time   = evDate ? fmtTime(evDate) : '';
                  return (
                    <TouchableOpacity
                      key={ev.id || idx}
                      style={[styles.eventCard, { backgroundColor: t.surface, borderColor: t.border }]}
                      onPress={() => goTo('CampusEvents')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.eventDateBlock}>
                        <Text style={styles.eventDay}>{day}</Text>
                        <Text style={styles.eventMon}>{mon}</Text>
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={[styles.eventTitle, { color: t.text }]} numberOfLines={1}>
                          {ev.title || ev.name || 'Campus Event'}
                        </Text>
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
                      <View style={styles.eventCta}>
                        <Text style={styles.eventCtaText}>View</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* ── CAMPUS INFO + REPORT ──────────────────────────────────────── */}
          <View style={[styles.infoCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.infoGoldBar, { backgroundColor: C.gold }]} />
            <View style={styles.infoRow}>
              <View style={[styles.infoIconBox, { backgroundColor: C.goldSoft }]}>
                <Ionicons name="time-outline" size={18} color={C.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: t.text }]}>Campus Hours</Text>
                <Text style={[styles.infoBody, { color: t.muted }]}>Monday – Friday  ·  9:00 AM – 4:00 PM</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => setShowReport(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.reportIconBox, { backgroundColor: `${C.red}18` }]}>
              <Ionicons name="flag-outline" size={20} color={C.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>Report an Issue</Text>
              <Text style={styles.reportSub}>Flag campus problems or concerns</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>

      {/* ── REPORT MODAL ──────────────────────────────────────────────────────── */}
      <Modal visible={showReport} animationType="slide" transparent={false} onRequestClose={() => setShowReport(false)}>
        <ScreenWrapper backgroundColor={C.navy} statusBarStyle="light-content">
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>

            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReport(false)}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <View style={{ width: 26 }} />
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.catRow}>
                {['Technical', 'Facility', 'Safety', 'Other'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catBtn, issueCat === cat && styles.catBtnActive]}
                    onPress={() => setIssueCat(cat)}
                  >
                    <Text style={[styles.catBtnText, issueCat === cat && styles.catBtnTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Issue Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Brief title of the issue"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={issueTitle}
                onChangeText={setIssueTitle}
              />

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Describe the issue in detail"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={issueDesc}
                onChangeText={setIssueDesc}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <Text style={styles.modalLabel}>Photos (optional)</Text>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Ionicons name="camera-outline" size={22} color="#fff" />
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>

              {photos.length > 0 && (
                <View style={styles.photoRow}>
                  {photos.map((uri, i) => (
                    <View key={i} style={styles.photoWrap}>
                      <Image source={{ uri }} style={styles.photoImg} />
                      <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <CustomButton title="Submit Report" onPress={handleReport} style={{ marginTop: 24, marginBottom: 12 }} />
              <CustomButton title="Cancel" onPress={() => setShowReport(false)} variant="outline" style={{ marginBottom: 32 }} />
            </View>
          </ScrollView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // ── Hero
  hero: {
    backgroundColor: C.navy,
    paddingTop: 54,
    paddingBottom: 30,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    shadowColor: '#060F1E',
    shadowOpacity: 0.32,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
    marginBottom: 0,
  },
  heroGoldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: C.gold },
  heroOrbA:    { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: C.gold, opacity: 0.08, top: -80, right: -70 },
  heroOrbB:    { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: C.blue, opacity: 0.08, bottom: -60, left: -50 },

  heroTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatar:        { width: 54, height: 54, borderRadius: 27, backgroundColor: C.gold, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:    { fontSize: 20, fontWeight: '800', color: C.navyDk },
  heroControls:  { flexDirection: 'row', gap: 10 },
  heroBtn: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'visible',
  },
  heroBadge:     { position: 'absolute', top: -6, right: -6, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: C.navy },
  heroBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  heroGreeting:  { fontSize: 14, color: 'rgba(255,255,255,0.72)', fontWeight: '600', marginBottom: 4 },
  heroName:      { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 0.2, marginBottom: 6 },
  heroDate:      { fontSize: 12, color: 'rgba(255,255,255,0.60)', marginBottom: 18 },
  heroPillRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  heroPillText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // ── Body
  body: { paddingHorizontal: 16, paddingTop: 24 },

  // ── Section headers
  eyebrow:          { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4 },
  sectionTitle:     { fontSize: 22, fontWeight: '800', letterSpacing: 0.2, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 0 },
  seeAllBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  seeAllText:       { fontSize: 13, fontWeight: '700', color: C.gold },

  // ── Primary action grid (3-col)
  primaryGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  primaryCardWrap: { width: '30.5%' },
  primaryCard: {
    borderRadius: 20, paddingTop: 18, paddingBottom: 14, paddingHorizontal: 12,
    borderWidth: 1, overflow: 'hidden', alignItems: 'center',
    shadowColor: '#060F1E', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  primaryTopBar:  { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  primaryIconBox: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10, overflow: 'visible',
    position: 'relative',
  },
  primaryLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cardBadge:    { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  cardBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '800' },

  // ── Util row (3-col horizontal)
  utilRow:     { flexDirection: 'row', gap: 12, marginBottom: 28 },
  utilCardWrap:{ flex: 1 },
  utilCard:    { borderRadius: 18, padding: 14, borderWidth: 1, alignItems: 'center', gap: 8, shadowColor: '#060F1E', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  utilIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  utilLabel:   { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  // ── Live chip
  liveChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#C6F6D5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 16 },
  liveDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  liveText:  { fontSize: 11, fontWeight: '700', color: C.green },

  // ── Department card
  deptCard: {
    borderRadius: 22, borderWidth: 1, overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#060F1E', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  deptGoldBar: { height: 3 },
  deptRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  deptLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  deptDot:     { width: 10, height: 10, borderRadius: 5 },
  deptName:    { fontSize: 14, fontWeight: '700' },
  deptHours:   { fontSize: 11, marginTop: 2 },
  deptBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  deptBadgeText:{ fontSize: 11, fontWeight: '700' },
  deptMore:    { textAlign: 'center', fontSize: 12, fontStyle: 'italic', paddingVertical: 10 },

  // ── Notice cards
  noticeList: { gap: 10, marginBottom: 28 },
  noticeCard: {
    flexDirection: 'row', borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#060F1E', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  noticeLeftBar: { width: 4 },
  noticeBody:    { flex: 1, padding: 14 },
  noticeTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  noticePri:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noticePriText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  newDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: C.blue },
  noticeTime:    { fontSize: 11, marginLeft: 'auto' },
  noticeTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  noticePreview: { fontSize: 12, lineHeight: 17 },

  // ── Event cards
  eventList: { gap: 10, marginBottom: 28 },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1,
    padding: 14, gap: 14,
    shadowColor: '#060F1E', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  eventDateBlock: { width: 50, alignItems: 'center', backgroundColor: C.goldSoft, borderRadius: 14, paddingVertical: 10 },
  eventDay:       { fontSize: 22, fontWeight: '800', color: C.navy },
  eventMon:       { fontSize: 11, fontWeight: '700', color: C.gold },
  eventInfo:      { flex: 1, gap: 4 },
  eventTitle:     { fontSize: 14, fontWeight: '700' },
  eventMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText:  { fontSize: 12 },
  eventCta:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: C.goldSoft },
  eventCtaText:   { fontSize: 12, fontWeight: '700', color: C.gold },

  // ── Info card
  infoCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 14, shadowColor: '#060F1E', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  infoGoldBar: { height: 3 },
  infoRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoIconBox: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  infoTitle:   { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  infoBody:    { fontSize: 12, lineHeight: 17 },

  // ── Report button
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 20, borderWidth: 1,
    borderColor: `${C.red}30`, backgroundColor: '#FFF5F5',
    marginBottom: 8,
  },
  reportIconBox: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  reportTitle:   { fontSize: 15, fontWeight: '700', color: C.red, marginBottom: 3 },
  reportSub:     { fontSize: 12, color: C.muted },

  // ── Modal
  modalScroll: { paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalForm:   { paddingHorizontal: 20, paddingTop: 22 },
  modalLabel:  { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 10, marginTop: 18 },
  catRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catBtn:      { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  catBtnActive:    { backgroundColor: C.gold },
  catBtnText:      { color: '#fff', fontSize: 13, fontWeight: '600' },
  catBtnTextActive:{ color: C.navyDk },
  modalInput:  { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', padding: 14, color: '#fff', fontSize: 14, marginBottom: 4 },
  modalTextArea:   { minHeight: 110, textAlignVertical: 'top' },
  photoBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.40)', paddingVertical: 18 },
  photoBtnText:    { color: '#fff', fontWeight: '600', fontSize: 14 },
  photoRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  photoWrap:   { width: '47%', aspectRatio: 1, position: 'relative' },
  photoImg:    { width: '100%', height: '100%', borderRadius: 10 },
  photoRemove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
});

export default StudentHomeScreen;
