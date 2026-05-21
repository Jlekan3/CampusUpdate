import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_THEME } from '../../utils/constants';
import {
  subscribeToIssueReports, subscribeToUsers,
  subscribeToEvents, subscribeToNotifications, updateItem,
} from '../../services/databaseService';

const PRIMARY = ADMIN_THEME.primary;
const ACCENT  = ADMIN_THEME.accent;
const BLUE    = '#2563EB';

const Segment = ({ tabs, active, onChange }) => (
  <View style={seg.wrap}>
    {tabs.map((t) => (
      <TouchableOpacity key={t} style={[seg.btn, active === t && seg.btnActive]} onPress={() => onChange(t)} activeOpacity={0.8}>
        <Text style={[seg.label, active === t && seg.labelActive]}>{t}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  open:        { bg: '#FEF3C7', text: '#92400E', label: 'Open' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF', label: 'In Progress' },
  resolved:    { bg: '#D1FAE5', text: '#065F46', label: 'Resolved' },
  dismissed:   { bg: '#F1F5F9', text: '#64748B', label: 'Dismissed' },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <View style={[rb.badge, { backgroundColor: c.bg }]}>
      <Text style={[rb.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
};

const PRIORITY_ICONS = { high: 'arrow-up-circle', critical: 'alert-circle', medium: 'remove-circle', low: 'arrow-down-circle' };
const PRIORITY_COLORS = { high: '#F97316', critical: '#EF4444', medium: '#F59E0B', low: '#6B7280' };

// ── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('All');
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => {
    const unsub = subscribeToIssueReports((d) => { setReports(d || []); setLoading(false); });
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'All') return reports;
    return reports.filter((r) => (r.status || 'open') === filter.toLowerCase().replace(' ', '_'));
  }, [reports, filter]);

  const handleExportIssuesPDF = async () => {
    if (reports.length === 0) { Alert.alert('No data', 'There are no reports to export.'); return; }
    setExporting(true);
    try {
      const now     = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', dismissed: 'Dismissed' };
      const STATUS_COLOR = { open: '#F59E0B', in_progress: '#2563EB', resolved: '#16A34A', dismissed: '#94A3B8' };
      const PRIO_COLOR   = { low: '#6B7280', medium: '#F59E0B', high: '#F97316', critical: '#EF4444' };

      const rows = reports.map((rep) => {
        const status   = rep.status || 'open';
        const priority = (rep.priority || 'low').toLowerCase();
        const sc = STATUS_COLOR[status]  || '#94A3B8';
        const sl = STATUS_LABEL[status]  || status;
        const pc = PRIO_COLOR[priority]  || '#6B7280';
        const created = rep.created_at
          ? new Date(rep.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—';
        return `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-weight:600;color:#0F172A;font-size:13px;">${rep.title || 'Untitled'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#475569;">${rep.category || '—'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;">
              <span style="background:${pc}22;color:${pc};font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;">${priority.toUpperCase()}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;">
              <span style="background:${sc}22;color:${sc};font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;">${sl}</span>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#64748B;">${rep.reporter_name || rep.reporter_email || 'Anonymous'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:12px;color:#64748B;">${created}</td>
          </tr>`;
      }).join('');

      const openCount     = reports.filter((r) => !r.status || r.status === 'open').length;
      const inProgCount   = reports.filter((r) => r.status === 'in_progress').length;
      const resolvedCount = reports.filter((r) => r.status === 'resolved').length;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,Helvetica,Arial,sans-serif; color:#0F172A; }
    table { width:100%; border-collapse:collapse; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background:#1A365D;padding:32px 40px 28px;color:#fff;">
    <div style="font-size:22px;font-weight:800;">RMU Campus Map</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:2px;">Regional Maritime University</div>
    <div style="margin-top:20px;font-size:26px;font-weight:800;">Issues Reported</div>
    <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,0.7);">Generated: ${dateStr} at ${timeStr}</div>
  </div>

  <div style="padding:32px 40px;">
    <!-- Summary row -->
    <div style="display:flex;gap:16px;margin-bottom:28px;">
      <div style="flex:1;background:#FFF7ED;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:800;color:#EA580C;">${openCount}</div>
        <div style="font-size:12px;color:#78350F;margin-top:4px;">Open</div>
      </div>
      <div style="flex:1;background:#EFF6FF;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:800;color:#2563EB;">${inProgCount}</div>
        <div style="font-size:12px;color:#1E3A8A;margin-top:4px;">In Progress</div>
      </div>
      <div style="flex:1;background:#F0FDF4;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:800;color:#16A34A;">${resolvedCount}</div>
        <div style="font-size:12px;color:#14532D;margin-top:4px;">Resolved</div>
      </div>
      <div style="flex:1;background:#F8FAFC;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:32px;font-weight:800;color:#1A365D;">${reports.length}</div>
        <div style="font-size:12px;color:#475569;margin-top:4px;">Total</div>
      </div>
    </div>

    <!-- Table -->
    <div style="margin-bottom:8px;font-size:11px;font-weight:700;color:#94A3B8;letter-spacing:1px;text-transform:uppercase;">All Issues</div>
    <table style="border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
      <thead>
        <tr style="background:#F8FAFC;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748B;font-weight:600;">Title</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748B;font-weight:600;">Category</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748B;font-weight:600;">Priority</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748B;font-weight:600;">Status</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748B;font-weight:600;">Reporter</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748B;font-weight:600;">Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <!-- Footer -->
    <div style="border-top:1px solid #E2E8F0;padding-top:16px;margin-top:28px;font-size:12px;color:#94A3B8;text-align:center;">
      RMU Campus Map · Confidential · ${dateStr}
    </div>
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Issues Report', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e.message || 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  const updateStatus = (id, status) => {
    Alert.alert('Update Status', `Mark this report as "${status}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try { await updateItem('reports', id, { status }); } catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const FILTERS = ['All', 'Open', 'In Progress', 'Resolved'];

  return (
    <ScrollView
      contentContainerStyle={r.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
    >
      {/* Filter chips + export button */}
      <View style={r.topRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[r.filterChip, filter === f && r.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[r.filterText, filter === f && r.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[r.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExportIssuesPDF}
          disabled={exporting}
          activeOpacity={0.85}
        >
          <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={14} color="#FFFFFF" />
          <Text style={r.exportBtnText}>{exporting ? '…' : 'PDF'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={r.empty}>
          <Ionicons name="document-text-outline" size={48} color="#CBD5E0" />
          <Text style={r.emptyText}>No reports found</Text>
        </View>
      ) : (
        filtered.map((report) => {
          const priority = (report.priority || 'low').toLowerCase();
          const pColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low;
          const pIcon = PRIORITY_ICONS[priority] || PRIORITY_ICONS.low;
          return (
            <View key={report.id} style={r.card}>
              <View style={r.cardHeader}>
                <View style={r.cardMeta}>
                  <Ionicons name={pIcon} size={16} color={pColor} />
                  <Text style={[r.priority, { color: pColor }]}>{priority.toUpperCase()}</Text>
                </View>
                <StatusBadge status={report.status || 'open'} />
              </View>
              <Text style={r.cardTitle} numberOfLines={2}>{report.title || 'Untitled Report'}</Text>
              <Text style={r.cardDesc} numberOfLines={2}>{report.description}</Text>
              <View style={r.cardFooter}>
                <View style={r.reporterRow}>
                  <Ionicons name="person-outline" size={13} color="#94A3B8" />
                  <Text style={r.reporter}>{report.reporter_name || report.reporter_email || 'Anonymous'}</Text>
                </View>
                <Text style={r.category}>{report.category}</Text>
              </View>
              {/* Quick status actions */}
              {(report.status || 'open') !== 'resolved' && (
                <View style={r.actions}>
                  {(report.status || 'open') === 'open' && (
                    <TouchableOpacity style={r.actionBtn} onPress={() => updateStatus(report.id, 'in_progress')} activeOpacity={0.8}>
                      <Text style={r.actionBtnText}>Mark In Progress</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[r.actionBtn, r.actionBtnGreen]} onPress={() => updateStatus(report.id, 'resolved')} activeOpacity={0.8}>
                    <Text style={[r.actionBtnText, { color: '#065F46' }]}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [users,         setUsers]         = useState([]);
  const [events,        setEvents]        = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reports,       setReports]       = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const unsubs = [
      subscribeToUsers((d)          => { setUsers(d || []); setLoading(false); }),
      subscribeToEvents((d)         => setEvents(d || [])),
      subscribeToNotifications((d)  => setNotifications(d || [])),
      subscribeToIssueReports((d)   => setReports(d || [])),
    ];
    return () => unsubs.forEach((u) => { try { u?.(); } catch (_) {} });
  }, []);

  const stats = useMemo(() => [
    { label: 'Total Users',   value: users.length,                                                               icon: 'people-outline',           color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Students',      value: users.filter((u) => u.role === 'student').length,                           icon: 'school-outline',           color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Faculty',       value: users.filter((u) => ['faculty', 'staff'].includes(u.role)).length,          icon: 'briefcase-outline',        color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Active Events', value: events.length,                                                              icon: 'calendar-outline',         color: '#D97706', bg: '#FFFBEB' },
    { label: 'Announcements', value: notifications.length,                                                       icon: 'megaphone-outline',        color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Open Issues',   value: reports.filter((r) => !r.status || r.status === 'open').length,            icon: 'document-text-outline',    color: '#EA580C', bg: '#FFF7ED' },
    { label: 'Resolved',      value: reports.filter((r) => r.status === 'resolved').length,                     icon: 'checkmark-circle-outline', color: '#16A34A', bg: '#F0FDF4' },
  ], [users, events, notifications, reports]);

  const roleBreakdown = useMemo(() => {
    const total = users.length || 1;
    return [
      { label: 'Students', pct: Math.round((users.filter((u) => u.role === 'student').length / total) * 100), color: '#2563EB' },
      { label: 'Faculty', pct: Math.round((users.filter((u) => ['faculty', 'staff'].includes(u.role)).length / total) * 100), color: '#7C3AED' },
      { label: 'Guests', pct: Math.round((users.filter((u) => u.role === 'guest').length / total) * 100), color: '#94A3B8' },
    ];
  }, [users]);

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      // Issue status rows
      const statusRows = Object.entries(STATUS_COLORS).map(([key, c]) => {
        const count = reports.filter((r) => (r.status || 'open') === key).length;
        return `<tr>
          <td style="padding:10px 14px; border-bottom:1px solid #F1F5F9;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.text};margin-right:8px;"></span>
            ${c.label}
          </td>
          <td style="padding:10px 14px; border-bottom:1px solid #F1F5F9; text-align:right; font-weight:700; color:${c.text};">${count}</td>
        </tr>`;
      }).join('');

      // Role breakdown rows
      const roleRows = roleBreakdown.map((r) => `
        <tr>
          <td style="padding:10px 14px; border-bottom:1px solid #F1F5F9; color:#0F172A;">${r.label}</td>
          <td style="padding:10px 14px; border-bottom:1px solid #F1F5F9;">
            <div style="background:#F1F5F9;border-radius:4px;height:10px;overflow:hidden;">
              <div style="background:${r.color};width:${r.pct}%;height:100%;border-radius:4px;"></div>
            </div>
          </td>
          <td style="padding:10px 14px; border-bottom:1px solid #F1F5F9; text-align:right; font-weight:700; color:${r.color};">${r.pct}%</td>
        </tr>`).join('');

      // Stat grid cards (3 per row for 7 items)
      const statCards = stats.map((st) => `
        <div style="width:30%;display:inline-block;margin:1.5%;background:${st.bg};border-radius:12px;padding:14px;vertical-align:top;box-sizing:border-box;">
          <div style="font-size:28px;font-weight:800;color:${st.color};">${st.value}</div>
          <div style="font-size:12px;color:#718096;margin-top:4px;">${st.label}</div>
        </div>`).join('');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0F172A; background: #FFFFFF; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <!-- Header banner -->
  <div style="background:#1A365D; padding:32px 40px 28px; color:#fff;">
    <div style="font-size:22px; font-weight:800; letter-spacing:-0.3px;">RMU Campus Map</div>
    <div style="font-size:13px; color:rgba(255,255,255,0.65); margin-top:2px;">Regional Maritime University</div>
    <div style="margin-top:20px; font-size:26px; font-weight:800;">Analytics Report</div>
    <div style="margin-top:6px; font-size:13px; color:rgba(255,255,255,0.7);">Generated: ${dateStr} at ${timeStr}</div>
  </div>

  <div style="padding:32px 40px;">

    <!-- Campus Overview -->
    <div style="margin-bottom:8px; font-size:11px; font-weight:700; color:#94A3B8; letter-spacing:1px; text-transform:uppercase;">Campus Overview</div>
    <div style="margin-bottom:28px;">${statCards}</div>

    <!-- User Breakdown -->
    <div style="margin-bottom:8px; font-size:11px; font-weight:700; color:#94A3B8; letter-spacing:1px; text-transform:uppercase;">User Breakdown</div>
    <table style="border-radius:12px; overflow:hidden; border:1px solid #E2E8F0; margin-bottom:28px;">
      <thead>
        <tr style="background:#F8FAFC;">
          <th style="padding:10px 14px; text-align:left; font-size:12px; color:#64748B; font-weight:600;">Role</th>
          <th style="padding:10px 14px; text-align:left; font-size:12px; color:#64748B; font-weight:600;">Share</th>
          <th style="padding:10px 14px; text-align:right; font-size:12px; color:#64748B; font-weight:600;">%</th>
        </tr>
      </thead>
      <tbody>${roleRows}</tbody>
    </table>

    <!-- Issues Status -->
    <div style="margin-bottom:8px; font-size:11px; font-weight:700; color:#94A3B8; letter-spacing:1px; text-transform:uppercase;">Issues Status</div>
    <table style="border-radius:12px; overflow:hidden; border:1px solid #E2E8F0; margin-bottom:32px;">
      <thead>
        <tr style="background:#F8FAFC;">
          <th style="padding:10px 14px; text-align:left; font-size:12px; color:#64748B; font-weight:600;">Status</th>
          <th style="padding:10px 14px; text-align:right; font-size:12px; color:#64748B; font-weight:600;">Count</th>
        </tr>
      </thead>
      <tbody>${statusRows}</tbody>
    </table>

    <!-- Footer -->
    <div style="border-top:1px solid #E2E8F0; padding-top:16px; font-size:12px; color:#94A3B8; text-align:center;">
      RMU Campus Map · Confidential · ${dateStr}
    </div>
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Analytics Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', e.message || 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 60 }} />;

  return (
    <ScrollView contentContainerStyle={a.scroll} showsVerticalScrollIndicator={false}>
      {/* Export button */}
      <TouchableOpacity
        style={[a.exportBtn, exporting && a.exportBtnDisabled]}
        onPress={handleExportPDF}
        disabled={exporting}
        activeOpacity={0.85}
      >
        <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={16} color="#FFFFFF" />
        <Text style={a.exportBtnText}>{exporting ? 'Generating PDF…' : 'Export as PDF'}</Text>
      </TouchableOpacity>

      {/* Stats grid */}
      <Text style={a.groupTitle}>Campus Overview</Text>
      <View style={a.grid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[a.statCard, { backgroundColor: stat.bg }]}>
            <View style={[a.statIcon, { backgroundColor: stat.color + '20' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={[a.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={a.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* User breakdown */}
      <Text style={a.groupTitle}>User Breakdown</Text>
      <View style={a.breakdownCard}>
        {roleBreakdown.map((row) => (
          <View key={row.label} style={a.breakdownRow}>
            <Text style={a.breakdownLabel}>{row.label}</Text>
            <View style={a.barBg}>
              <View style={[a.barFill, { width: `${row.pct}%`, backgroundColor: row.color }]} />
            </View>
            <Text style={[a.breakdownPct, { color: row.color }]}>{row.pct}%</Text>
          </View>
        ))}
      </View>

      {/* Report status */}
      <Text style={a.groupTitle}>Report Status</Text>
      <View style={a.breakdownCard}>
        {Object.entries(STATUS_COLORS).map(([key, c]) => {
          const count = reports.filter((r) => (r.status || 'open') === key).length;
          return (
            <View key={key} style={a.breakdownRow}>
              <View style={[a.dot, { backgroundColor: c.text }]} />
              <Text style={a.breakdownLabel}>{c.label}</Text>
              <Text style={[a.breakdownPct, { color: c.text, marginLeft: 'auto' }]}>{count}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function ReportsAnalyticsScreen({ navigation }) {
  const [tab, setTab] = useState('Issues Reported');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Reports & Analytics</Text>
          <Text style={s.headerSub}>Monitor campus activity</Text>
        </View>
      </View>

      <View style={s.segWrap}>
        <Segment tabs={['Issues Reported', 'Analytics']} active={tab} onChange={setTab} />
      </View>

      <View style={s.content}>
        {tab === 'Issues Reported' ? <ReportsTab /> : <AnalyticsTab />}
      </View>
    </SafeAreaView>
  );
}

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
  segWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  content: {
    flex: 1, backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
});

const seg = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 4,
  },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnActive: { backgroundColor: '#FFFFFF' },
  label: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  labelActive: { color: PRIMARY, fontWeight: '700' },
});

const rb = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

const r = StyleSheet.create({
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  exportBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  filterChip: {
    paddingVertical: 7, paddingHorizontal: 14,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priority: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reporter: { fontSize: 12, color: '#94A3B8' },
  category: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#EFF6FF', alignItems: 'center',
  },
  actionBtnGreen: { backgroundColor: '#F0FDF4' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },
});

const a = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '47%', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  statValue: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#718096', marginTop: 2 },
  breakdownCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
    gap: 14,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownLabel: { fontSize: 14, fontWeight: '600', color: '#0F172A', width: 70 },
  barBg: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  breakdownPct: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
  dot: { width: 8, height: 8, borderRadius: 4 },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    backgroundColor: BLUE,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
