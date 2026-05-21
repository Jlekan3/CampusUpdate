import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, USER_ROLES, ADMIN_THEME } from '../../utils/constants';
import { useTheme } from '../../context/ThemeContext';
import {
  subscribeToBuildings,
  subscribeToLocations,
  subscribeToUsers,
  subscribeToEvents,
  subscribeToNotifications,
  subscribeToIssueReports,
  subscribeToDepartments,
} from '../../services/databaseService';

const getRoleFromUser = (user) => {
  const raw = (
    user?.role ||
    user?.userRole ||
    user?.type ||
    user?.userType ||
    user?.accountRole ||
    user?.accountType ||
    user?.accessLevel ||
    user?.access_level ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();

  if (!raw) return USER_ROLES.GUEST;

  if (raw.includes('admin')) return USER_ROLES.ADMIN;
  if (raw.includes('faculty') || raw.includes('staff') || raw.includes('lecturer') || raw.includes('instructor')) {
    return USER_ROLES.FACULTY;
  }
  if (raw.includes('student') || raw.includes('learner') || raw.includes('member')) {
    return USER_ROLES.STUDENT;
  }
  if (raw.includes('guest')) return USER_ROLES.GUEST;

  return USER_ROLES.GUEST;
};

const toDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const converted = new Date(value);
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  return null;
};

const getUserActivityDate = (user) => (
  toDateValue(user?.lastLoginAt)
  || toDateValue(user?.updatedAt)
  || toDateValue(user?.createdAt)
);

const DEPT_STATUS_OPTIONS = [
  { value: 'Open', color: '#38A169', icon: 'checkmark-circle-outline' },
  { value: 'Closed', color: '#E53E3E', icon: 'close-circle-outline' },
  { value: 'Busy', color: '#D69E2E', icon: 'time-outline' },
  { value: 'Available', color: '#319795', icon: 'ellipse-outline' },
];

const AdminAnalyticsScreen = () => {
  const { colors } = useTheme();
  const [departments, setDepartments] = useState([]);
  const [entityCounts, setEntityCounts] = useState({
    buildings: 0,
    locations: 0,
    events: 0,
    notifications: 0,
    users: 0,
    reports: 0,
  });

  const [roleCounts, setRoleCounts] = useState({
    admin: 0,
    faculty: 0,
    student: 0,
    guest: 0,
  });

  const [latestByRole, setLatestByRole] = useState({
    admin: null,
    faculty: null,
    student: null,
    guest: null,
  });

  const [reportRoleCounts, setReportRoleCounts] = useState({
    student: 0,
    staff: 0,
  });

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const unsubBuildings = subscribeToBuildings((items) => {
      setEntityCounts((prev) => ({ ...prev, buildings: items?.length || 0 }));
    });

    const unsubLocations = subscribeToLocations((items) => {
      setEntityCounts((prev) => ({ ...prev, locations: items?.length || 0 }));
    });

    const unsubEvents = subscribeToEvents((items) => {
      setEntityCounts((prev) => ({ ...prev, events: items?.length || 0 }));
    });

    const unsubNotifications = subscribeToNotifications((items) => {
      setEntityCounts((prev) => ({ ...prev, notifications: items?.length || 0 }));
    });

    const unsubReports = subscribeToIssueReports((items) => {
      const list = items || [];
      setEntityCounts((prev) => ({ ...prev, reports: list.length }));

      const counts = { student: 0, staff: 0 };
      list.forEach((report) => {
        const rawRole = (report?.reporterRole || '').toString().toLowerCase();
        if (rawRole.includes('student')) {
          counts.student += 1;
          return;
        }
        if (rawRole.includes('staff') || rawRole.includes('faculty')) {
          counts.staff += 1;
          return;
        }
      });

      setReportRoleCounts(counts);
    });

    const unsubUsers = subscribeToUsers((items) => {
      const list = items || [];
      const counts = { admin: 0, faculty: 0, student: 0, guest: 0 };
      const latest = { admin: null, faculty: null, student: null, guest: null };

      list.forEach((user) => {
        const role = getRoleFromUser(user);
        counts[role] = (counts[role] || 0) + 1;

        const activityAt = getUserActivityDate(user);
        if (activityAt) {
          const current = latest[role];
          if (!current || activityAt > current) {
            latest[role] = activityAt;
          }
        }
      });

      setEntityCounts((prev) => ({ ...prev, users: list.length }));
      setRoleCounts(counts);
      setLatestByRole(latest);
    });

    const unsubDepartments = subscribeToDepartments((items) => setDepartments(items || []));

    return () => {
      try {
        unsubBuildings && unsubBuildings();
        unsubLocations && unsubLocations();
        unsubEvents && unsubEvents();
        unsubNotifications && unsubNotifications();
        unsubReports && unsubReports();
        unsubUsers && unsubUsers();
        unsubDepartments && unsubDepartments();
      } catch (error) {
        // ignore cleanup errors
      }
    };
  }, []);

  const summaryData = [
    {
      id: 'buildings',
      title: 'Buildings',
      value: entityCounts.buildings,
      icon: 'business-outline',
      color: '#F59E0B',
    },
    {
      id: 'locations',
      title: 'Locations',
      value: entityCounts.locations,
      icon: 'location-outline',
      color: '#10B981',
    },
    {
      id: 'events',
      title: 'Events',
      value: entityCounts.events,
      icon: 'calendar-outline',
      color: '#3B82F6',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      value: entityCounts.notifications,
      icon: 'notifications-outline',
      color: '#8B5CF6',
    },
    {
      id: 'reports',
      title: 'Reports',
      value: entityCounts.reports,
      icon: 'alert-circle-outline',
      color: '#F97316',
    },
    {
      id: 'users',
      title: 'Total Users',
      value: entityCounts.users,
      icon: 'people-outline',
      color: '#0EA5E9',
    },
  ];

  const heroStats = [
    {
      id: 'usersHero',
      label: 'Active Accounts',
      value: entityCounts.users,
      icon: 'people-outline',
      color: '#3B82F6',
    },
    {
      id: 'reportsHero',
      label: 'Reports Logged',
      value: entityCounts.reports,
      icon: 'alert-circle-outline',
      color: '#F97316',
    },
    {
      id: 'notificationsHero',
      label: 'Notices Sent',
      value: entityCounts.notifications,
      icon: 'notifications-outline',
      color: '#8B5CF6',
    },
  ];

  const maxSummaryValue = Math.max(...summaryData.map((item) => item.value), 1);

  const roleBreakdown = [
    {
      id: 'admin',
      label: 'Admins',
      value: roleCounts.admin,
      icon: 'shield-checkmark-outline',
      color: '#EF4444',
    },
    {
      id: 'faculty',
      label: 'Faculty / Staff',
      value: roleCounts.faculty,
      icon: 'briefcase-outline',
      color: '#F59E0B',
    },
    {
      id: 'student',
      label: 'Students',
      value: roleCounts.student,
      icon: 'school-outline',
      color: '#10B981',
    },
    {
      id: 'guest',
      label: 'Guests',
      value: roleCounts.guest,
      icon: 'person-outline',
      color: '#6B7280',
    },
  ];

  const reportBreakdown = [
    {
      id: 'student-reports',
      label: 'Student Reports',
      value: reportRoleCounts.student,
      icon: 'school-outline',
      color: '#2563EB',
    },
    {
      id: 'staff-reports',
      label: 'Staff Reports',
      value: reportRoleCounts.staff,
      icon: 'briefcase-outline',
      color: '#EA580C',
    },
  ];

  const formatDateTime = (dt) => {
    const value = toDateValue(dt);
    if (!value) return '—';
    try {
      return value.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      return '—';
    }
  };

  const formatDateTimeForReport = (dt) => {
    const value = toDateValue(dt);
    if (!value) return 'N/A';
    try {
      return value.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const buildPdfFileName = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    return `analytics-overview-${stamp}.pdf`;
  };

  const downloadPdfOnWeb = async (html, fileName) => {
    const result = await Print.printToFileAsync({ html, base64: true });
    const base64 = result?.base64;
    const doc = globalThis?.document;

    if (!base64 || !doc?.createElement) {
      await Print.printAsync({ html });
      return;
    }

    const link = doc.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = fileName;
    doc.body?.appendChild?.(link);
    link.click();
    doc.body?.removeChild?.(link);
  };

  const escapeHtml = (input) => {
    if (input == null) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const buildAnalyticsReportHtml = () => {
    const generatedAt = formatDateTimeForReport(new Date());
    const numberText = (value) => (typeof value === 'number' ? value.toLocaleString() : `${value}`);
    const renderRows = (rows) => rows
      .map(([label, value]) => (
        `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(numberText(value))}</td></tr>`
      ))
      .join('');

    const entityRows = [
      ['Buildings', entityCounts.buildings],
      ['Locations', entityCounts.locations],
      ['Events', entityCounts.events],
      ['Notifications', entityCounts.notifications],
      ['Reports', entityCounts.reports],
      ['Total Users', entityCounts.users],
    ];

    const roleRows = [
      ['Admins', roleCounts.admin],
      ['Faculty / Staff', roleCounts.faculty],
      ['Students', roleCounts.student],
      ['Guests', roleCounts.guest],
    ];

    const reportRows = [
      ['Student Reports', reportRoleCounts.student],
      ['Staff Reports', reportRoleCounts.staff],
    ];

    const latestRows = [
      ['Admins', formatDateTimeForReport(latestByRole.admin)],
      ['Faculty / Staff', formatDateTimeForReport(latestByRole.faculty)],
      ['Students', formatDateTimeForReport(latestByRole.student)],
      ['Guests', formatDateTimeForReport(latestByRole.guest)],
    ];

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
      h1 { font-size: 22px; margin: 0 0 6px; }
      h2 { font-size: 15px; margin: 22px 0 8px; color: #1e293b; }
      p { margin: 0 0 12px; color: #475569; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 6px; }
      th, td { text-align: left; padding: 8px 6px; font-size: 12px; }
      tr:nth-child(odd) { background: #f8fafc; }
      td:last-child { text-align: right; font-weight: 700; }
      .meta { font-size: 11px; color: #64748b; }
      .divider { height: 1px; background: #e2e8f0; margin: 18px 0; }
    </style>
  </head>
  <body>
    <h1>Campus Analytics Overview</h1>
    <p class="meta">Generated at ${escapeHtml(generatedAt)}</p>
    <div class="divider"></div>

    <h2>System Snapshot</h2>
    <table>
      <tbody>
        ${renderRows(entityRows)}
      </tbody>
    </table>

    <h2>Users by Role</h2>
    <table>
      <tbody>
        ${renderRows(roleRows)}
      </tbody>
    </table>

    <h2>Issue Reports</h2>
    <table>
      <tbody>
        ${renderRows(reportRows)}
      </tbody>
    </table>

    <h2>Most Recent User Per Role</h2>
    <table>
      <tbody>
        ${renderRows(latestRows)}
      </tbody>
    </table>

    <h2>Departments (${escapeHtml(String(departments.length))} total)</h2>
    <table>
      <tbody>
        ${renderRows(DEPT_STATUS_OPTIONS.map((opt) => [
          opt.value,
          departments.filter((d) => (d.availabilityStatus || 'Open') === opt.value).length,
        ]))}
      </tbody>
    </table>
  </body>
</html>`;
  };

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const html = buildAnalyticsReportHtml();
      const fileName = buildPdfFileName();

      if (Platform.OS === 'web') {
        await downloadPdfOnWeb(html, fileName);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Analytics Overview Report',
        });
      } else {
        Alert.alert('PDF ready', `Saved to: ${uri}`);
      }
    } catch (error) {
      console.log('Export PDF failed', error);
      Alert.alert('Export failed', 'Unable to generate the PDF report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScreenWrapper backgroundColor={COLORS.background}>
      <View style={styles.analyticsFrame}>
        <ScrollView
          style={styles.analyticsScroll}
          contentContainerStyle={styles.analyticsScrollContent}
          showsVerticalScrollIndicator
          persistentScrollbar
          stickyHeaderIndices={[0]}
          scrollIndicatorInsets={{ right: 2 }}
          indicatorStyle="black"
        >
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.headerEyebrow}>Live telemetry</Text>
                <Text style={styles.headerTitle}>Analytics Control Center</Text>
                <Text style={styles.headerSubtitle}>
                  Monitor campus engagement, report flow, and usage moments in real time.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
                onPress={handleExportPdf}
                disabled={isExporting}
              >
                <Ionicons name="download-outline" size={16} color={COLORS.white} />
                <Text style={styles.exportButtonText}>{isExporting ? 'Exporting...' : 'Export PDF'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroCopy}>
                <View style={styles.heroBadge}>
                  <Ionicons name="pulse-outline" size={14} color={COLORS.white} />
                  <Text style={styles.heroBadgeText}>Realtime feed</Text>
                </View>
                <Text style={styles.heroMainTitle}>Campus health pulse</Text>
                <Text style={styles.heroDescription}>Snapshot of what admins should watch this hour.</Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroMetaPill}>
                    <Ionicons name="people-outline" size={14} color="#D0E2FF" />
                    <Text style={styles.heroMetaText}>{entityCounts.users} users synced</Text>
                  </View>
                  <View style={styles.heroMetaPill}>
                    <Ionicons name="alert-circle-outline" size={14} color="#FCD34D" />
                    <Text style={styles.heroMetaText}>{entityCounts.reports} reports tracked</Text>
                  </View>
                </View>
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="analytics-outline" size={34} color={COLORS.white} />
              </View>
            </View>
            <View style={styles.heroStatsRow}>
              {heroStats.map((stat) => (
                <View key={stat.id} style={styles.heroStatCard}>
                  <View style={[styles.heroStatIcon, { backgroundColor: `${stat.color}26` }]}>
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                  </View>
                  <Text style={styles.heroStatValue}>{stat.value}</Text>
                  <Text style={styles.heroStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>System Snapshot</Text>
          <Text style={styles.sectionSubtitle}>Core entities compared side-by-side</Text>
          <View style={styles.statGrid}>
            {summaryData.map((item) => {
              const barWidth = `${Math.max((item.value / maxSummaryValue) * 100, item.value > 0 ? 8 : 0)}%`;
              return (
                <View key={item.id} style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: `${item.color}1A` }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.statCardValue}>{item.value}</Text>
                  <Text style={styles.statCardLabel}>{item.title}</Text>
                  <View style={styles.statProgressTrack}>
                    <View
                      style={[
                        styles.statProgressFill,
                        { width: barWidth, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Issue Reports</Text>
          <View style={styles.reportsCard}>
            <View style={styles.reportsHeader}>
              <View>
                <Text style={styles.reportsTitle}>Report intake mix</Text>
                <Text style={styles.reportsSubtitle}>Students vs staff submissions right now</Text>
              </View>
              <View style={styles.reportsBadge}>
                <Ionicons name="documents-outline" size={16} color={COLORS.dark} />
                <Text style={styles.reportsBadgeText}>{entityCounts.reports} total</Text>
              </View>
            </View>

            {reportBreakdown.map((group) => {
              const percentage = entityCounts.reports
                ? Math.round((group.value / entityCounts.reports) * 100)
                : 0;
              return (
                <View key={group.id} style={styles.reportBarBlock}>
                  <View style={styles.reportBarHeader}>
                    <View style={styles.reportBarLabelRow}>
                      <View style={[styles.reportDot, { backgroundColor: group.color }]} />
                      <Text style={styles.reportBarLabel}>{group.label}</Text>
                    </View>
                    <Text style={styles.reportBarPercent}>{percentage}%</Text>
                  </View>
                  <View style={styles.reportBarTrack}>
                    <View
                      style={[
                        styles.reportBarFill,
                        { width: `${percentage}%`, backgroundColor: group.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.reportBarValue}>{group.value} submissions</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Users by Role</Text>
          <View style={styles.insightGrid}>
            {roleBreakdown.map((role) => (
              <View key={role.id} style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: `${role.color}1A` }]}>
                  <Ionicons name={role.icon} size={18} color={role.color} />
                </View>
                <Text style={styles.insightValue}>{role.value}</Text>
                <Text style={styles.insightLabel}>{role.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Most Recent User Per Role</Text>
          <View style={styles.timelineCard}>
            {roleBreakdown.map((role) => (
              <View key={role.id} style={styles.timelineRow}>
                <View style={styles.timelineLabelRow}>
                  <View style={[styles.timelineIconWrap, { backgroundColor: `${role.color}1A` }]}>
                    <Ionicons name={role.icon} size={16} color={role.color} />
                  </View>
                  <View>
                    <Text style={styles.timelineRoleLabel}>{role.label}</Text>
                    <Text style={styles.timelineMuted}>{role.value} total</Text>
                  </View>
                </View>
                <Text style={styles.timelineValue}>{formatDateTime(latestByRole[role.id])}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Departments</Text>
          <Text style={styles.sectionSubtitle}>
            {departments.length} {departments.length === 1 ? 'department' : 'departments'} registered
          </Text>
          <View style={styles.deptStatusGrid}>
            {DEPT_STATUS_OPTIONS.map((opt) => {
              const count = departments.filter((d) => (d.availabilityStatus || 'Open') === opt.value).length;
              return (
                <View key={opt.value} style={styles.deptStatusCard}>
                  <View style={[styles.deptStatusIconWrap, { backgroundColor: `${opt.color}18` }]}>
                    <Ionicons name={opt.icon} size={16} color={opt.color} />
                  </View>
                  <Text style={[styles.deptStatusCount, { color: opt.color }]}>{count}</Text>
                  <Text style={styles.deptStatusLabel}>{opt.value}</Text>
                </View>
              );
            })}
          </View>

          {departments.length > 0 && (
            <View style={styles.deptListCard}>
              {departments.slice(0, 8).map((dept, idx) => {
                const status = dept.availabilityStatus || 'Open';
                const statusColor = DEPT_STATUS_OPTIONS.find((o) => o.value === status)?.color || '#38A169';
                const isLast = idx === Math.min(departments.length, 8) - 1;
                return (
                  <View key={dept.id || idx} style={[styles.deptRow, !isLast && styles.deptRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deptRowName} numberOfLines={1}>{dept.name || 'Unnamed'}</Text>
                      {dept.category ? (
                        <Text style={styles.deptRowCategory}>{dept.category}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.deptStatusBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}30` }]}>
                      <View style={[styles.deptStatusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.deptStatusBadgeText, { color: statusColor }]}>{status}</Text>
                    </View>
                  </View>
                );
              })}
              {departments.length > 8 && (
                <Text style={styles.deptMoreText}>+{departments.length - 8} more departments</Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  analyticsFrame: {
    height: 600,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#F8FBFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  analyticsScroll: {
    flex: 1,
  },
  analyticsScrollContent: {
    padding: 18,
    paddingBottom: 26,
  },
  header: {
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#64748B',
    marginBottom: 6,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#1D4ED8',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#020617',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
  },
  heroCopy: {
    flex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  heroBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroMainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 6,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.dark,
  },
  statCardLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
    marginBottom: 8,
  },
  statProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },
  statProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  reportsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 10,
  },
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reportsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  reportsSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  reportsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
  },
  reportsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
  },
  reportBarBlock: {
    marginBottom: 12,
  },
  reportBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  reportBarLabel: {
    fontSize: 13,
    color: COLORS.dark,
    fontWeight: '600',
  },
  reportBarPercent: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  reportBarTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    overflow: 'hidden',
  },
  reportBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  reportBarValue: {
    fontSize: 12,
    color: '#475569',
    marginTop: 3,
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  insightCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  insightValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.dark,
  },
  insightLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  timelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timelineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineRoleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  timelineMuted: {
    fontSize: 11,
    color: COLORS.muted,
  },
  timelineValue: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  deptStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  deptStatusCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  deptStatusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  deptStatusCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  deptStatusLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  deptListCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    marginBottom: 10,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  deptRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deptRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  deptRowCategory: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  deptStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 10,
  },
  deptStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deptStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deptMoreText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    paddingTop: 8,
    fontStyle: 'italic',
  },
});

export default AdminAnalyticsScreen;
