import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Home01Icon,
  Location01Icon,
  Calendar03Icon,
  Restaurant01Icon,
  BookOpen01Icon,
  Shield01Icon,
  Notification01Icon,
  FavouriteIcon,
  Flag01Icon,
  QrCode01Icon,
  Logout03Icon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../utils/theme';

const NAV_ITEMS = [
  { label: 'Home',             icon: Home01Icon,         screen: 'HomeTabs'     },
  { label: 'Campus Map',       icon: Location01Icon,     screen: 'DrawerMap'    },
  { label: 'Notifications',    icon: Notification01Icon, screen: 'DrawerNotifs' },
  { label: 'Favorites',        icon: FavouriteIcon,      screen: 'DrawerFavs'   },
  null,
  { label: 'Events',           icon: Calendar03Icon,     screen: 'DrawerEvents' },
  { label: 'Dining',           icon: Restaurant01Icon,   screen: 'DrawerDining' },
  { label: 'Campus Rules',     icon: BookOpen01Icon,     screen: 'DrawerRules'  },
  { label: 'Safety & Support', icon: Shield01Icon,       screen: 'DrawerSafety' },
  null,
  { label: 'Scan QR',          icon: QrCode01Icon,       screen: 'DrawerQR'     },
  { label: 'Report Issue',     icon: Flag01Icon,         screen: 'DrawerReport' },
];

export default function StudentSidebar({ state, navigation }) {
  const { user, logout } = useAuth();

  const activeRouteName = state?.routeNames?.[state?.index];

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.userHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
          <Text style={styles.userRole}>Student</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item, i) => {
          if (!item) return <View key={`sep-${i}`} style={styles.separator} />;
          const isActive = activeRouteName === item.screen;
          return (
            <TouchableOpacity
              key={item.screen}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={20}
                color={isActive ? '#C5A047' : '#94A3B8'}
                variant="stroke"
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <HugeiconsIcon icon={Logout03Icon} size={20} color="#EF4444" variant="stroke" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  userHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 17, fontFamily: FONTS.bold },
  userInfo: { marginLeft: 12, flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 16, fontFamily: FONTS.semiBold },
  userRole: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },
  navList: { flex: 1, paddingTop: 8 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    marginHorizontal: 8, borderRadius: 12, position: 'relative',
  },
  navItemActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  navLabel: { marginLeft: 12, fontSize: 15, fontFamily: FONTS.medium, color: 'rgba(255,255,255,0.65)', flex: 1 },
  navLabelActive: { color: '#FFFFFF', fontFamily: FONTS.semiBold },
  activeIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#60A5FA' },
  separator: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16, marginVertical: 8,
  },
  footer: { paddingBottom: 28 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 24, marginTop: 4,
  },
  logoutText: { marginLeft: 12, fontSize: 15, fontFamily: FONTS.semiBold, color: '#FCA5A5' },
});
