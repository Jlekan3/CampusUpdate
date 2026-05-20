import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS } from '../../utils/constants';
import Map from '../../components/Map';
import {
  subscribeToLocations,
  subscribeToBuildings,
  subscribeToDepartments,
  subscribeToDining,
} from '../../services/databaseService';
import { fetchRouteGuidance, resolveLocationCoordinates } from '../../services/mapService';

const STORAGE_KEY = 'guest-dashboard-mode';
const MOBILE_BOTTOM_SHEET_COLLAPSED_HEIGHT = 104;
const MOBILE_BOTTOM_SHEET_BASE_HEIGHT = 232;
const MOBILE_BOTTOM_SHEET_EXTENDED_HEIGHT = 360;

// Professional navy + gold map theme
const NAVY  = '#1A365D';
const GOLD  = '#C5A047';
const GOLD_SOFT = 'rgba(197,160,71,0.14)';

const THEMES = {
  light: {
    background:      '#EDEEF0',        // Apple Maps cool-gray base
    surface:         '#FFFFFF',
    surfaceSoft:     '#F1F5F9',        // slate-100
    heroPanelBg:     '#FFFFFF',
    heroPanelBorder: 'rgba(0,0,0,0.00)',
    heroPanelGlow:   'rgba(0,0,0,0.00)',
    textPrimary:     '#0F172A',        // slate-900
    textMuted:       '#64748B',        // slate-500
    border:          'rgba(0,0,0,0.07)',
    hero:            NAVY,
    heroSoft:        GOLD_SOFT,
    heroText:        '#FFFFFF',
    gold:            GOLD,
    chipBg:          '#F1F5F9',        // slate-100 unselected
    chipBorder:      'rgba(0,0,0,0.08)',
    chipActiveBg:    '#0F172A',        // slate-900 selected (dark slate)
    chipActiveBorder:'#0F172A',
    chipActiveText:  '#FFFFFF',
    chipText:        '#334155',        // slate-700
    searchBg:        '#F1F5F9',        // clean slate input bg
    searchBorder:    'rgba(0,0,0,0.00)',
    searchIcon:      '#94A3B8',        // slate-400
    pillBg:          'rgba(255,255,255,0.97)',
    pillBorder:      'rgba(0,0,0,0.06)',
    pillText:        NAVY,
    rowBg:           '#F8FAFC',
    rowBorder:       'rgba(0,0,0,0.06)',
    rowIconBg:       GOLD_SOFT,
    rowIcon:         GOLD,
    bottomSheetBg:   '#FFFFFF',
    noResultsBg:     '#F1F5F9',
    webBg:           '#EDEEF0',
    previewBg:       '#FFFFFF',
    cardShadow:      '#000000',
  },
  dark: {
    background:      '#0A0A0A',        // near-black
    surface:         '#1C1C1E',        // iOS dark surface
    surfaceSoft:     '#2C2C2E',        // iOS dark secondary
    heroPanelBg:     '#1C1C1E',
    heroPanelBorder: 'rgba(255,255,255,0.00)',
    heroPanelGlow:   'rgba(255,255,255,0.00)',
    textPrimary:     '#F2F2F7',        // iOS light text
    textMuted:       '#8E8E93',        // iOS secondary text
    border:          'rgba(255,255,255,0.10)',
    hero:            '#1C1C1E',
    heroSoft:        'rgba(255,255,255,0.08)',
    heroText:        '#FFFFFF',
    gold:            GOLD,
    chipBg:          '#2C2C2E',
    chipBorder:      'rgba(255,255,255,0.10)',
    chipActiveBg:    '#F2F2F7',
    chipActiveBorder:'#F2F2F7',
    chipActiveText:  '#0A0A0A',
    chipText:        '#AEAEB2',
    searchBg:        '#2C2C2E',
    searchBorder:    'rgba(255,255,255,0.00)',
    searchIcon:      '#8E8E93',
    pillBg:          'rgba(28,28,30,0.97)',
    pillBorder:      'rgba(255,255,255,0.10)',
    pillText:        '#F2F2F7',
    rowBg:           '#1C1C1E',
    rowBorder:       'rgba(255,255,255,0.10)',
    rowIconBg:       GOLD_SOFT,
    rowIcon:         GOLD,
    bottomSheetBg:   '#1C1C1E',
    noResultsBg:     '#2C2C2E',
    webBg:           '#0A0A0A',
    previewBg:       '#1C1C1E',
    cardShadow:      '#000000',
    bottomSheetBg:   '#0D1A30',
    noResultsBg:     '#0D1A30',
    webBg:           '#080F1E',
    previewBg:       '#0D1A30',
    cardShadow:      '#000000',
  },
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(2) + ' km';
};

const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistanceMeters = (meters) => {
  if (!Number.isFinite(meters)) {
    return '';
  }

  if (meters < 1000) {
    return `${Math.max(1, Math.round(meters))} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

const lowerCaseFirst = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0 min';
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
};

const formatEtaTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Now';
  }

  const etaDate = new Date(Date.now() + seconds * 1000);
  return etaDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getTravelModeLabel = (travelMode) => {
  if (travelMode === 'driving') {
    return 'Driving';
  }

  return 'Walking';
};

const MapScreen = ({ navigation, route }) => {
  const [loading,    setLoading]    = useState(true);
  const [locations,  setLocations]  = useState([]);
  const [buildings,  setBuildings]  = useState([]);
  const [dining,     setDining]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const [themeMode, setThemeMode] = useState('light');
  const [activeLocation, setActiveLocation] = useState(null);
  const [routeOrigin, setRouteOrigin] = useState(null);
  const [routeDestination, setRouteDestination] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [routeSummary, setRouteSummary] = useState({ distance: 0, duration: 0 });
  const [travelMode, setTravelMode] = useState('walking');
  const [travelModeModalVisible, setTravelModeModalVisible] = useState(false);
  const [pendingRouteAction, setPendingRouteAction] = useState(null);
  const [navigationMode, setNavigationMode] = useState('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRouting, setIsRouting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [isBottomSheetCollapsed, setIsBottomSheetCollapsed] = useState(false);
  const bottomSheetTranslateY = useRef(new Animated.Value(0)).current;
  const bottomSheetDragStart = useRef(0);

  const selectedLocation = route?.params?.selectedLocation;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (savedMode === 'light' || savedMode === 'dark')) {
          setThemeMode(savedMode);
        }
      } catch (error) {
        console.log('MapScreen theme load error', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const theme = useMemo(() => THEMES[themeMode] || THEMES.light, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  useEffect(() => {
    setActiveLocation(selectedLocation || null);
  }, [selectedLocation]);

  // Subscribe to all campus entities that carry GPS coordinates
  useEffect(() => {
    setLoading(true);
    let resolved = 0;
    const done = () => { resolved += 1; if (resolved >= 4) setLoading(false); };

    const unsubLocs  = subscribeToLocations((items)  => { setLocations(items   || []); done(); });
    const unsubBldgs = subscribeToBuildings((items)   => { setBuildings(items   || []); done(); });
    const unsubAmen  = subscribeToDining((items)     => { setDining(items     || []); done(); });
    const unsubDepts = subscribeToDepartments((items) => { setDepartments(items || []); done(); });

    return () => {
      try { unsubLocs?.();  } catch (_) {}
      try { unsubBldgs?.(); } catch (_) {}
      try { unsubAmen?.();  } catch (_) {}
      try { unsubDepts?.(); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let subscription;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (!mounted) {
          return;
        }

        if (status !== 'granted') {
          setLocationStatus('denied');
          setCurrentLocation(null);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!mounted) {
          return;
        }

        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('granted');

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 3,
            timeInterval: 3000,
          },
          (nextPosition) => {
            if (!mounted) {
              return;
            }

            setCurrentLocation({
              latitude: nextPosition.coords.latitude,
              longitude: nextPosition.coords.longitude,
            });
          }
        );
      } catch (error) {
        if (mounted) {
          console.log('MapScreen location error', error);
          setLocationStatus('error');
          setCurrentLocation(null);
        }
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  // Normalise a raw row from any collection into a map-ready object
  const toMapPoint = (row, _type) => ({
    ...row,
    _type,
    name:      row.name || row.title || row.names || _type,
    category:  row.category || row.type || _type,
    latitude:  row.latitude  ?? row.coordinates?.latitude,
    longitude: row.longitude ?? row.coordinates?.longitude,
  });

  // Merge locations + buildings + departments + dining (all 4 tables have lat/lng)
  // Only include rows that have valid numeric coordinates
  const normalizedLocations = useMemo(() => {
    const allRows = [
      ...locations.map((r)   => toMapPoint(r, 'Location')),
      ...buildings.map((r)    => toMapPoint(r, 'Building')),
      ...departments.map((r)  => toMapPoint(r, 'Department')),
      ...dining.map((r)       => toMapPoint(r, 'Dining')),
    ];
    // Deduplicate by id, filter to rows with valid numeric coordinates
    const seen = new Set();
    return allRows.filter((p) => {
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [locations, buildings, departments, dining]);

  const mapLocations = useMemo(() => {
    if (!activeLocation) {
      return normalizedLocations;
    }

    const activeId = activeLocation.id;
    const alreadyIncluded = normalizedLocations.some((location) => location.id === activeId);

    if (alreadyIncluded) {
      return normalizedLocations;
    }

    return [activeLocation, ...normalizedLocations];
  }, [activeLocation, normalizedLocations]);

  const visibleLocations = !searchQuery.trim()
    ? mapLocations
    : mapLocations.filter((location) => {
        const query = searchQuery.trim().toLowerCase();
        const name = (location.name || location.names || '').toLowerCase();
        const building = (location.building || '').toLowerCase();
        const category = (location.category || location.type || '').toLowerCase();
        const description = (location.description || '').toLowerCase();

        return (
          name.includes(query) ||
          building.includes(query) ||
          category.includes(query) ||
          description.includes(query)
        );
      });

  const activeLocationLabel = activeLocation?.name || activeLocation?.title || 'No place selected';
  const selectedMarkerLocation = routeDestination || activeLocation;
  const navigationTarget = activeLocation || routeDestination;
  const searchTarget = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const query = searchQuery.trim().toLowerCase();
    const exactMatch = visibleLocations.find((location) => {
      const name = (location.name || location.names || '').toLowerCase();
      const building = (location.building || '').toLowerCase();
      const category = (location.category || location.type || '').toLowerCase();

      return (
        (name && name === query) ||
        (building && building === query) ||
        (category && category === query)
      );
    });

    if (exactMatch) return exactMatch;
    if (visibleLocations.length > 0) return visibleLocations[0];

    return null;
  }, [searchQuery, visibleLocations]);

  const ensureNavigationTarget = useCallback((intentLabel) => {
    const target = navigationTarget || searchTarget;

    if (!target) {
      Alert.alert('Select a location', 'Tap a marker or refine your search before requesting directions.');
      return null;
    }

    if (!resolveLocationCoordinates(target)) {
      Alert.alert('Unavailable', 'This location does not have valid coordinates yet.');
      return null;
    }

    if (!currentLocation) {
      Alert.alert('Location needed', 'Enable location access to get turn-by-turn directions.');
      return null;
    }

    return target;
  }, [currentLocation, navigationTarget, searchTarget]);
  const mapMarkerLocations = useMemo(() => {
    if (selectedMarkerLocation) {
      return [selectedMarkerLocation];
    }

    return visibleLocations;
  }, [selectedMarkerLocation, visibleLocations]);

  const routeStartPoint = routeOrigin || currentLocation;
  const routeCoordinates = useMemo(() => {
    const destination = routeDestination ? resolveLocationCoordinates(routeDestination) : null;

    if (!routeStartPoint || !destination) {
      return [];
    }

    return [routeStartPoint, destination];
  }, [routeStartPoint, routeDestination]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!routeDestination) {
        setIsRouting(false);
        setRoutePath([]);
        setRouteSteps([]);
        setRouteSummary({ distance: 0, duration: 0 });
        return;
      }

      const startPoint = routeOrigin;

      if (!startPoint) {
        setIsRouting(false);
        setRoutePath([]);
        setRouteSteps([]);
        setRouteSummary({ distance: 0, duration: 0 });
        return;
      }

      setIsRouting(true);
      setRoutePath(routeCoordinates.length > 1 ? routeCoordinates : []);

      try {
        const guidance = await fetchRouteGuidance(startPoint, routeDestination, { travelMode });

        if (cancelled) {
          return;
        }

        setRoutePath(guidance.path.length > 1 ? guidance.path : routeCoordinates);
        setRouteSteps(guidance.steps || []);
        setRouteSummary({
          distance: guidance.distance || 0,
          duration: guidance.duration || 0,
        });
      } catch (error) {
        if (!cancelled) {
          console.log('MapScreen route error', error);
          setRoutePath(routeCoordinates);
          setRouteSteps([]);
          setRouteSummary({ distance: 0, duration: 0 });
        }
      } finally {
        if (!cancelled) {
          setIsRouting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeOrigin, routeDestination, routeCoordinates, travelMode]);

  const routeDistanceLabel = useMemo(() => {
    const destination = routeDestination ? resolveLocationCoordinates(routeDestination) : null;

    if (!currentLocation || !destination) {
      return null;
    }

    return calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );
  }, [currentLocation, routeDestination]);

  const routeDistanceMeters = useMemo(() => {
    if (routeSummary.distance > 0) {
      return routeSummary.distance;
    }

    return routeSteps.reduce((total, step) => total + (step.distance || 0), 0);
  }, [routeSummary.distance, routeSteps]);

  const routeDurationSeconds = useMemo(() => {
    if (routeSummary.duration > 0) {
      return routeSummary.duration;
    }

    return routeSteps.reduce((total, step) => total + (step.duration || 0), 0);
  }, [routeSummary.duration, routeSteps]);

  const activeStep = useMemo(() => {
    if (routeSteps.length === 0 || currentStepIndex >= routeSteps.length) {
      return null;
    }

    return routeSteps[currentStepIndex];
  }, [routeSteps, currentStepIndex]);

  const nextStep = useMemo(() => {
    if (routeSteps.length === 0) {
      return null;
    }

    return routeSteps[currentStepIndex + 1] || null;
  }, [routeSteps, currentStepIndex]);

  const remainingDurationSeconds = useMemo(() => {
    if (routeSteps.length === 0) {
      return routeDurationSeconds;
    }

    const startIndex = Math.min(currentStepIndex, routeSteps.length - 1);
    return routeSteps.slice(startIndex).reduce((total, step) => total + (step.duration || 0), 0);
  }, [routeSteps, currentStepIndex, routeDurationSeconds]);

  const remainingDistanceMeters = useMemo(() => {
    const destination = routeDestination ? resolveLocationCoordinates(routeDestination) : null;

    if (currentLocation && destination) {
      return calculateDistanceInMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        destination.latitude,
        destination.longitude
      );
    }

    return routeDistanceMeters;
  }, [currentLocation, routeDestination, routeDistanceMeters]);

  const upcomingSteps = useMemo(() => {
    if (routeSteps.length === 0) {
      return [];
    }

    const startIndex = navigationMode === 'active'
      ? Math.min(currentStepIndex, routeSteps.length - 1)
      : 0;

    return routeSteps.slice(startIndex, startIndex + 5);
  }, [routeSteps, navigationMode, currentStepIndex]);

  const routeDurationLabel = formatDuration(routeDurationSeconds);
  const routeDistanceValue = routeDistanceMeters > 0 ? formatDistanceMeters(routeDistanceMeters) : (routeDistanceLabel || '0 m');
  const remainingDurationLabel = formatDuration(remainingDurationSeconds || routeDurationSeconds);
  const remainingDistanceLabel = remainingDistanceMeters > 0 ? formatDistanceMeters(remainingDistanceMeters) : routeDistanceValue;
  const etaTimeLabel = formatEtaTime(remainingDurationSeconds || routeDurationSeconds);
  const activeInstructionLabel = activeStep?.instruction || 'Continue on the highlighted route';
  const hasExtendedBottomContent =
    (routeDestination && (navigationMode === 'preview' || navigationMode === 'active')) ||
    upcomingSteps.length > 0;
  const bottomSheetExpandedHeight = hasExtendedBottomContent
    ? MOBILE_BOTTOM_SHEET_EXTENDED_HEIGHT
    : MOBILE_BOTTOM_SHEET_BASE_HEIGHT;
  const bottomSheetCollapsedOffset = Math.max(
    0,
    bottomSheetExpandedHeight - MOBILE_BOTTOM_SHEET_COLLAPSED_HEIGHT
  );
  const bottomSheetSnapThreshold = bottomSheetCollapsedOffset / 2;

  const animateBottomSheetTo = useCallback((collapsed) => {
    setIsBottomSheetCollapsed(collapsed);
    Animated.spring(bottomSheetTranslateY, {
      toValue: collapsed ? bottomSheetCollapsedOffset : 0,
      useNativeDriver: true,
      damping: 24,
      stiffness: 260,
      mass: 0.9,
    }).start();
  }, [bottomSheetTranslateY, bottomSheetCollapsedOffset]);

  const toggleBottomSheet = useCallback(() => {
    animateBottomSheetTo(!isBottomSheetCollapsed);
  }, [animateBottomSheetTo, isBottomSheetCollapsed]);

  const bottomSheetPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => (
      Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 3
    ),
    onPanResponderGrant: () => {
      bottomSheetTranslateY.stopAnimation((value) => {
        bottomSheetDragStart.current = value;
      });
    },
    onPanResponderMove: (_, gestureState) => {
      const nextValue = Math.max(
        0,
        Math.min(
          bottomSheetCollapsedOffset,
          bottomSheetDragStart.current + gestureState.dy
        )
      );

      bottomSheetTranslateY.setValue(nextValue);
    },
    onPanResponderRelease: (_, gestureState) => {
      const projected = bottomSheetDragStart.current + gestureState.dy;
      const shouldCollapse =
        gestureState.vy > 0.45 || projected > bottomSheetSnapThreshold;

      animateBottomSheetTo(shouldCollapse);
    },
    onPanResponderTerminate: () => {
      bottomSheetTranslateY.stopAnimation((value) => {
        animateBottomSheetTo(value > bottomSheetSnapThreshold);
      });
    },
  }), [animateBottomSheetTo, bottomSheetTranslateY, bottomSheetCollapsedOffset, bottomSheetSnapThreshold]);

  useEffect(() => {
    bottomSheetTranslateY.setValue(isBottomSheetCollapsed ? bottomSheetCollapsedOffset : 0);
  }, [bottomSheetTranslateY, bottomSheetCollapsedOffset, isBottomSheetCollapsed]);

  useEffect(() => {
    if (Platform.OS !== 'web' && (activeLocation || routeDestination || navigationMode !== 'idle')) {
      animateBottomSheetTo(false);
    }
  }, [activeLocation, routeDestination, navigationMode, animateBottomSheetTo]);

  useEffect(() => {
    if (navigationMode !== 'active' || !currentLocation || routeSteps.length === 0) {
      return;
    }

    if (currentStepIndex >= routeSteps.length) {
      return;
    }

    const arrivalThresholdMeters = 20;
    let nextIndex = currentStepIndex;

    while (nextIndex < routeSteps.length) {
      const step = routeSteps[nextIndex];

      if (!step?.maneuverLocation) {
        nextIndex += 1;
        continue;
      }

      const distance = calculateDistanceInMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        step.maneuverLocation.latitude,
        step.maneuverLocation.longitude
      );

      if (distance <= arrivalThresholdMeters) {
        nextIndex += 1;
        continue;
      }

      break;
    }

    if (nextIndex !== currentStepIndex) {
      setCurrentStepIndex(nextIndex);
    }
  }, [navigationMode, currentLocation, routeSteps, currentStepIndex]);

  const handleLocationSelect = (location) => {
    setActiveLocation(location);
    setRouteOrigin(null);
    setRouteDestination(null);
    setRoutePath([]);
    setRouteSteps([]);
    setRouteSummary({ distance: 0, duration: 0 });
    setCurrentStepIndex(0);
    setNavigationMode('idle');
  };

  const beginRouting = (location, mode, selectedTravelMode) => {
    if (!location || !currentLocation) {
      return;
    }

    setTravelMode(selectedTravelMode);
    setActiveLocation(location);
    setRoutePath([]);
    setRouteSteps([]);
    setRouteSummary({ distance: 0, duration: 0 });
    setCurrentStepIndex(0);
    setNavigationMode(mode);
    setRouteOrigin({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    });
    setRouteDestination(location);
  };

  const closeTravelModeModal = () => {
    setTravelModeModalVisible(false);
    setPendingRouteAction(null);
  };

  const openTravelModeModal = (location, mode) => {
    if (!location) {
      return;
    }

    if (!currentLocation) {
      Alert.alert('Location needed', 'Enable location to continue with routing.');
      return;
    }

    setPendingRouteAction({
      location,
      mode,
    });
    setTravelModeModalVisible(true);
  };

  const handleTravelModeSelect = (selectedTravelMode) => {
    if (!pendingRouteAction) {
      return;
    }

    beginRouting(pendingRouteAction.location, pendingRouteAction.mode, selectedTravelMode);
    closeTravelModeModal();
  };

  const handleStartNavigation = (location) => {
    openTravelModeModal(location, 'active');
  };

  const handleOpenDirection = (location) => {
    openTravelModeModal(location, 'preview');
  };

  const handleDirectionPress = () => {
    const target = ensureNavigationTarget('Direction');
    if (target) handleOpenDirection(target);
  };

  const handleStartPress = () => {
    const target = ensureNavigationTarget('Start');
    if (target) handleStartNavigation(target);
  };

  const handleClearRoute = () => {
    setActiveLocation(null);
    closeTravelModeModal();
    setRouteOrigin(null);
    setRouteDestination(null);
    setRoutePath([]);
    setRouteSteps([]);
    setRouteSummary({ distance: 0, duration: 0 });
    setCurrentStepIndex(0);
    setNavigationMode('idle');
  };

  const handleViewDetails = () => {
    const target = activeLocation;
    if (!target?.id) {
      Alert.alert('No location selected', 'Tap a marker on the map first.');
      return;
    }

    navigation.navigate('LocationDetails', {
      id: target.id,
      location: target,
    });
  };

  const handleSuggestionSelect = (location) => {
    if (!location) {
      return;
    }

    const label =
      location.name ||
      location.names ||
      location.title ||
      location.building ||
      location.category ||
      'Selected location';

    setSearchQuery(label);
    handleLocationSelect(location);
    setIsSuggestionsVisible(false);
  };

  const searchHeaderCard = (
    <View style={[styles.searchHeader, { backgroundColor: theme.heroPanelBg, borderColor: theme.heroPanelBorder, shadowColor: theme.cardShadow }]}>
      <View style={[styles.heroAccent, { backgroundColor: theme.heroPanelGlow }]} />
      <View style={styles.searchHeaderTop}>
        <View style={[styles.heroBadge, { backgroundColor: theme.hero, shadowColor: theme.cardShadow }]}>
          <Ionicons name="map" size={20} color={theme.heroText} />
        </View>

        <View style={styles.heroCopy}>
          <Text style={[styles.heroEyebrow, { color: theme.chipActiveText }]}>Regional Maritime University</Text>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Campus Map</Text>
          <Text style={[styles.heroSubtitle, { color: theme.textMuted }]} numberOfLines={2}>
            Search campus places, focus markers, and view directions without leaving the app.
          </Text>
        </View>

        <View style={[styles.livePill, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
          <View style={styles.liveDot} />
          <Text style={[styles.livePillText, { color: theme.textPrimary }]}>Live</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.searchBar, { backgroundColor: theme.searchBg, borderColor: theme.searchBorder }]}>
          <Ionicons name="search" size={18} color={theme.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 0) {
                setIsSuggestionsVisible(true);
              } else {
                setIsSuggestionsVisible(false);
              }
            }}
            onBlur={() => setIsSuggestionsVisible(false)}
            placeholder="Search campus"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.searchAction}
              onPress={() => {
                setSearchQuery('');
                setIsSuggestionsVisible(false);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={18} color={theme.hero} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.searchAction} onPress={toggleThemeMode} activeOpacity={0.85}>
              <Ionicons name={themeMode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={18} color={theme.hero} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.mapInfoCard, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}>
        <View style={styles.mapInfoDot} />
        <View style={styles.mapInfoTextWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {activeLocation ? activeLocationLabel : 'Ready to navigate'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={2}>
            {activeLocation ? 'Marker selected. Tap Show on Map to recenter.' : 'Find a building, then tap a marker or direction button.'}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}
          onPress={handleDirectionPress}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-outline" size={18} color={theme.hero} />
          <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>Direction</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary, { backgroundColor: GOLD }]}
          onPress={handleStartPress}
          activeOpacity={0.85}
        >
          <Ionicons name="play-outline" size={18} color="#0F2444" />
          <Text style={[styles.actionButtonText, { color: '#0F2444' }]}>Start</Text>
        </TouchableOpacity>
        {activeLocation?.id ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}
            onPress={handleViewDetails}
            activeOpacity={0.85}
          >
            <Ionicons name="information-circle-outline" size={18} color={theme.hero} />
            <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>Details</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScreenWrapper
      backgroundColor={theme.background}
      statusBarStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
      paddingHorizontal={0}
      paddingTop={0}
      paddingBottom={0}
    >
      <View style={[styles.container, Platform.OS === 'web' ? styles.containerWeb : styles.containerMobile]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : Platform.OS === 'web' ? (
          <ScrollView style={styles.webContainer} contentContainerStyle={styles.webContent} keyboardShouldPersistTaps="handled">
            {searchHeaderCard}
            <View style={[styles.mapPreviewCard, { backgroundColor: theme.previewBg, borderColor: theme.border, shadowColor: theme.cardShadow }]}>
              <Ionicons name="map-outline" size={54} color={theme.hero} />
              <Text style={[styles.webTitle, { color: theme.textPrimary }]}>Campus Map Preview</Text>
              <Text style={[styles.webSubtitle, { color: theme.textMuted }]}>View locations available on mobile</Text>
            </View>
            {visibleLocations.map((building) => (
              <View key={building.id} style={[styles.buildingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.buildingCardMain}>
                  <Ionicons name="location-outline" size={24} color={theme.hero} />
                  <View style={styles.buildingInfo}>
                    <Text style={[styles.buildingName, { color: theme.textPrimary }]}>{building.name}</Text>
                    {typeof building.latitude === 'number' && typeof building.longitude === 'number' && (
                      <Text style={[styles.buildingCoords, { color: theme.textMuted }]}>
                        {building.latitude.toFixed(4)}
                        {"\u00b0"}N, {building.longitude.toFixed(4)}
                        {"\u00b0"}W
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.buildingActions}>
                  <TouchableOpacity
                    style={[styles.smallActionButton, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}
                    onPress={() => handleOpenDirection(building)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="navigate-outline" size={16} color={theme.hero} />
                    <Text style={[styles.smallActionText, { color: theme.textPrimary }]}>Direction</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallActionButton, { backgroundColor: theme.hero }]}
                    onPress={() => handleStartNavigation(building)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play-outline" size={16} color={theme.heroText} />
                    <Text style={[styles.smallActionText, { color: theme.heroText }]}>Start</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.mobileMapLayout, { backgroundColor: theme.background }]}>
            <Map
              style={styles.mobileMapFill}
              locations={mapMarkerLocations}
              selectedLocation={selectedMarkerLocation}
              routeCoordinates={routePath.length > 1 ? routePath : routeCoordinates}
              showsUserLocation={locationStatus === 'granted'}
              userLocation={currentLocation}
              onLocationPress={handleLocationSelect}
            />

            <View style={styles.mobileTopOverlay} pointerEvents="box-none">
              {/* ── Unified floating search + chip card ── */}
              <View style={[styles.mobileSearchCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow }]}>
                {/* Gold accent bar at top of card */}
                <View style={styles.mobileSearchCardAccent} />

                {/* Search row */}
                <View style={styles.mobileSearchRow}>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.mobileBackButton, { backgroundColor: theme.surfaceSoft }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
                  </TouchableOpacity>

                  <View style={[styles.mobileSearchBar, { backgroundColor: theme.searchBg }]}>
                    <Ionicons name="search" size={16} color={theme.searchIcon} />
                    <TextInput
                      value={searchQuery}
                      onChangeText={(text) => {
                        setSearchQuery(text);
                        setIsSuggestionsVisible(text.length > 0);
                      }}
                      onBlur={() => setIsSuggestionsVisible(false)}
                      placeholder="Search campus places…"
                      placeholderTextColor={theme.textMuted}
                      style={[styles.searchInput, { color: theme.textPrimary }]}
                    />
                    {searchQuery ? (
                      <TouchableOpacity
                        onPress={() => { setSearchQuery(''); setIsSuggestionsVisible(false); }}
                        activeOpacity={0.8}
                        style={styles.searchClearBtn}
                      >
                        <Ionicons name="close-circle" size={17} color={theme.textMuted} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={toggleThemeMode} activeOpacity={0.8} style={styles.searchClearBtn}>
                        <Ionicons name={themeMode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={17} color={theme.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Live badge */}
                  <View style={styles.mobileliveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={[styles.mobileLiveBadgeText, { color: theme.textPrimary }]}>Live</Text>
                  </View>
                </View>

                {/* Chip row — rounded-full, dark-slate active */}
                <View style={styles.mobileChipRow}>
                  {/* Navigation status chip */}
                  <View style={[
                    styles.mobileChip,
                    { borderColor: theme.chipBorder },
                    (navigationMode === 'active' || routeDestination)
                      ? { backgroundColor: theme.chipActiveBg, borderColor: theme.chipActiveBorder }
                      : { backgroundColor: theme.chipBg },
                  ]}>
                    <Ionicons
                      name="navigate"
                      size={12}
                      color={(navigationMode === 'active' || routeDestination) ? theme.chipActiveText : theme.chipText}
                    />
                    <Text style={[
                      styles.mobileChipText,
                      { color: (navigationMode === 'active' || routeDestination) ? theme.chipActiveText : theme.chipText },
                    ]} numberOfLines={1}>
                      {navigationMode === 'active' ? 'Navigating' : routeDestination ? 'Route set' : 'Ready'}
                    </Text>
                  </View>

                  {/* GPS chip */}
                  <View style={[
                    styles.mobileChip,
                    { backgroundColor: locationStatus === 'granted' ? '#DCFCE7' : theme.chipBg,
                      borderColor: locationStatus === 'granted' ? '#BBF7D0' : theme.chipBorder },
                  ]}>
                    <Ionicons
                      name={locationStatus === 'granted' ? 'location' : 'location-outline'}
                      size={12}
                      color={locationStatus === 'granted' ? '#16A34A' : theme.chipText}
                    />
                    <Text style={[
                      styles.mobileChipText,
                      { color: locationStatus === 'granted' ? '#16A34A' : theme.chipText },
                    ]}>
                      {locationStatus === 'granted' ? 'GPS' : 'No GPS'}
                    </Text>
                  </View>

                  {/* Places count chip */}
                  <View style={[styles.mobileChip, { backgroundColor: theme.chipBg, borderColor: theme.chipBorder }]}>
                    <Ionicons name="pin-outline" size={12} color={theme.chipText} />
                    <Text style={[styles.mobileChipText, { color: theme.chipText }]}>
                      {normalizedLocations.length} places
                    </Text>
                  </View>
                </View>
              </View>

              {isSuggestionsVisible && searchQuery.length > 0 && (
                <View style={[styles.suggestionsContainer, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.cardShadow }]}>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {visibleLocations.slice(0, 5).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                        onPress={() => handleSuggestionSelect(item)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.suggestionTextWrap}>
                          <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>
                            {item.name || item.names || item.title || item.building || item.category || 'Location'}
                          </Text>
                          {item.category || item.type ? (
                            <Text style={[styles.suggestionMeta, { color: theme.textMuted }]}>
                              {(item.category || item.type).toString()}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {routeDestination && navigationMode === 'active' && (
                <View style={[styles.mobileInstructionCard, { shadowColor: theme.cardShadow }]}>
                  <View style={styles.mobileInstructionHeader}>
                    <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                    <TouchableOpacity onPress={handleClearRoute} style={styles.activeCloseButton} activeOpacity={0.85}>
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.mobileInstructionTitle} numberOfLines={1}>{activeInstructionLabel}</Text>
                  <Text style={styles.mobileInstructionSubtitle} numberOfLines={1}>
                    {nextStep ? `Then ${lowerCaseFirst(nextStep.instruction)}` : 'Then continue on the highlighted path'}
                  </Text>
                </View>
              )}
            </View>

            <Animated.View
              style={[
                styles.mobileBottomSheet,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.cardShadow,
                  height: bottomSheetExpandedHeight,
                  transform: [{ translateY: bottomSheetTranslateY }],
                },
              ]}
            >
              {/* ── Drag handle at absolute top center ── */}
              <Pressable
                style={styles.mobileBottomHandleTouch}
                onPress={toggleBottomSheet}
                {...bottomSheetPanResponder.panHandlers}
              >
                <View style={styles.mobileBottomHandle} />
              </Pressable>

              <ScrollView
                style={styles.mobileBottomScroll}
                contentContainerStyle={styles.mobileBottomContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={!isBottomSheetCollapsed}
              >
                {/* Location name + clear */}
                <View style={styles.mobileBottomTitleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mobileBottomTitle, { color: theme.textPrimary }]} numberOfLines={2}>
                      {activeLocation ? activeLocationLabel : 'Explore Campus'}
                    </Text>
                    <Text style={[styles.mobileBottomSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                      {activeLocation
                        ? 'Tap Directions or Start to navigate'
                        : 'Tap a map marker to select a place'}
                    </Text>
                  </View>
                  {routeDestination && (
                    <TouchableOpacity
                      style={[styles.mobileClearRouteButton, { backgroundColor: theme.surfaceSoft }]}
                      onPress={handleClearRoute}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={16} color={theme.textPrimary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── Action row: Directions (bordered) + Start (gold) + Details ── */}
                <View style={styles.mobileActionRow}>
                  {/* Directions — transparent neutral bordered */}
                  <TouchableOpacity
                    style={[styles.mobileActionButton, styles.mobileDirectionBtn]}
                    onPress={handleDirectionPress}
                    activeOpacity={0.82}
                  >
                    <Ionicons name="navigate-outline" size={18} color={NAVY} />
                    <Text style={styles.mobileDirectionBtnText}>Directions</Text>
                  </TouchableOpacity>

                  {/* Start — golden-ochre primary */}
                  <TouchableOpacity
                    style={[styles.mobileActionButton, styles.mobileStartBtn]}
                    onPress={handleStartPress}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play" size={16} color="#0F2444" />
                    <Text style={styles.mobileStartBtnText}>Start</Text>
                  </TouchableOpacity>

                  {/* Details — secondary icon-only */}
                  {activeLocation?.id ? (
                    <TouchableOpacity
                      style={[styles.mobileActionButton, styles.mobileDetailBtn, { backgroundColor: theme.surfaceSoft }]}
                      onPress={handleViewDetails}
                      activeOpacity={0.82}
                    >
                      <Ionicons name="information-circle-outline" size={20} color={NAVY} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Route preview card */}
                {routeDestination && navigationMode === 'preview' && (
                  <View style={[styles.mobilePreviewCard, { backgroundColor: theme.surfaceSoft }]}>
                    {/* Travel mode chips */}
                    <View style={styles.previewModeRow}>
                      {[
                        { mode: 'driving', icon: 'car-outline',  label: 'Drive' },
                        { mode: 'walking', icon: 'walk-outline', label: 'Walk'  },
                      ].map(({ mode, icon, label }) => (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.previewModeChip,
                            travelMode === mode
                              ? { backgroundColor: theme.chipActiveBg, borderColor: theme.chipActiveBorder }
                              : { backgroundColor: theme.surface, borderColor: theme.chipBorder },
                          ]}
                          onPress={() => setTravelMode(mode)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name={icon} size={14} color={travelMode === mode ? theme.chipActiveText : theme.textMuted} />
                          <Text style={[styles.previewModeChipText, { color: travelMode === mode ? theme.chipActiveText : theme.textPrimary }]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.mobilePreviewMeta}>
                      <View>
                        <Text style={[styles.mobilePreviewDuration, { color: theme.textPrimary }]}>{routeDurationLabel}</Text>
                        <Text style={[styles.mobilePreviewDistance, { color: theme.textMuted }]}>{routeDistanceValue}</Text>
                      </View>
                      <View style={styles.previewSummaryRight}>
                        <Text style={[styles.previewSummaryLabel, { color: theme.textMuted }]}>Arrive by</Text>
                        <Text style={[styles.mobilePreviewEta, { color: theme.textPrimary }]}>{formatEtaTime(routeDurationSeconds)}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Active navigation metrics */}
                {routeDestination && navigationMode === 'active' && (
                  <View style={[styles.activeFooterCard, styles.mobileActiveFooterCard, { backgroundColor: theme.surfaceSoft, shadowColor: theme.cardShadow }]}>
                    <View style={styles.activeFooterMetric}>
                      <Text style={[styles.activeFooterValue, { color: theme.textPrimary }]}>{remainingDurationLabel}</Text>
                      <Text style={[styles.activeFooterLabel, { color: theme.textMuted }]}>{remainingDistanceLabel}</Text>
                    </View>
                    <View style={styles.activeFooterMetric}>
                      <Text style={[styles.activeFooterValue, { color: theme.textPrimary }]}>{etaTimeLabel}</Text>
                      <Text style={[styles.activeFooterLabel, { color: theme.textMuted }]}>ETA</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.activeEndButton, { backgroundColor: '#FEE2E2' }]}
                      onPress={handleClearRoute}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.activeEndButtonText, { color: '#DC2626' }]}>End</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </ScrollView>
            </Animated.View>
          </View>
        )}

      </View>

      <Modal
        visible={travelModeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTravelModeModal}
      >
        <Pressable style={styles.travelModeBackdrop} onPress={closeTravelModeModal}>
          <Pressable
            style={[
              styles.travelModeCard,
              { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.cardShadow },
            ]}
            onPress={() => {}}
          >
            <View style={[styles.travelModeIconWrap, { backgroundColor: theme.chipActiveBg }]}>
              <Ionicons name="navigate" size={22} color={theme.chipActiveText} />
            </View>
            <Text style={[styles.travelModeTitle, { color: theme.textPrimary }]}>Choose travel mode</Text>
            <Text style={[styles.travelModeSubtitle, { color: theme.textMuted }]}>Use driving for road routing or walking for pedestrian paths.</Text>

            <TouchableOpacity
              style={[styles.travelModeOption, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}
              onPress={() => handleTravelModeSelect('driving')}
              activeOpacity={0.85}
            >
              <View style={[styles.travelModeOptionIcon, { backgroundColor: theme.chipActiveBg }]}>
                <Ionicons name="car-outline" size={18} color={theme.chipActiveText} />
              </View>
              <View style={styles.travelModeOptionTextWrap}>
                <Text style={[styles.travelModeOptionTitle, { color: theme.textPrimary }]}>Driving</Text>
                <Text style={[styles.travelModeOptionMeta, { color: theme.textMuted }]}>Fastest road guidance</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.travelModeOption, { backgroundColor: theme.surfaceSoft, borderColor: theme.border }]}
              onPress={() => handleTravelModeSelect('walking')}
              activeOpacity={0.85}
            >
              <View style={[styles.travelModeOptionIcon, { backgroundColor: theme.chipActiveBg }]}>
                <Ionicons name="walk-outline" size={18} color={theme.chipActiveText} />
              </View>
              <View style={styles.travelModeOptionTextWrap}>
                <Text style={[styles.travelModeOptionTitle, { color: theme.textPrimary }]}>Walking</Text>
                <Text style={[styles.travelModeOptionMeta, { color: theme.textMuted }]}>Campus-friendly paths</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.travelModeCancelButton, { borderColor: theme.border }]}
              onPress={closeTravelModeModal}
              activeOpacity={0.85}
            >
              <Text style={[styles.travelModeCancelText, { color: theme.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerWeb: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  containerMobile: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  mobileMapLayout: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.light,
  },
  mobileMapFill: {
    ...StyleSheet.absoluteFillObject,
  },
  mobileTopOverlay: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    gap: 8,
  },
  // ── TOP FLOATING CARD ────────────────────────────────────────────────────────
  mobileSearchCard: {
    borderRadius: 24,          // rounded-2xl
    borderWidth: 0,
    padding: 16,               // 16px inset padding
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 28,
    elevation: 8,
    overflow: 'hidden',
  },
  mobileSearchCardAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: GOLD,
  },
  mobileSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  mobileBackButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  mobileSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 42,
    borderWidth: 0,
    gap: 8,
  },
  searchClearBtn: {
    padding: 2,
  },
  // Live badge
  mobileliveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
  },
  mobileLiveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  // Chip row — rounded-full chips
  mobileChipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  mobileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,           // rounded-full
    borderWidth: 1,
  },
  mobileChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Keep old chip names as aliases for web/non-refactored code
  mobileLivePill:            { minHeight: 38, paddingHorizontal: 10, borderRadius: 12 },
  mobileTopStatusRow:        { marginTop: 8, flexDirection: 'row', gap: 8 },
  mobileTopStatusChip:       { flex: 1, minHeight: 34, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, gap: 6 },
  mobileTopStatusText:       { fontSize: 12, fontWeight: '700' },
  mobileTopStatusMutedText:  { fontSize: 12, fontWeight: '600' },

  // ── Active navigation instruction banner ────────────────────────────────────
  mobileInstructionCard: {
    marginTop: 6,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: NAVY,
    borderTopWidth: 3,
    borderTopColor: GOLD,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
  mobileInstructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mobileInstructionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  mobileInstructionSubtitle: {
    marginTop: 2,
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  // ── BOTTOM ACTION SHEET ─────────────────────────────────────────────────────
  mobileBottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,    // rounded-t-[24px]
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,             // no border — shadow only
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
    overflow: 'hidden',
  },
  mobileBottomHandleTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  mobileBottomHandle: {
    width: 36,                  // thin pill, centered
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB', // light gray
  },
  mobileBottomScroll: {
    flex: 1,
  },
  mobileBottomContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  mobileBottomScroll:  { flex: 1 },
  mobileBottomContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },

  mobileBottomTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  mobileBottomTitle: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  mobileBottomSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  mobileClearRouteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },

  // ── ACTION ROW ────────────────────────────────────────────────────────────
  mobileActionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  mobileActionButton: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Directions — transparent + neutral border (spec: "clean transparent neutral bordered")
  mobileDirectionBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(26,54,93,0.18)',
  },
  mobileDirectionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  // Start — golden-ochre primary (spec: "primary golden-ochre brand color")
  mobileStartBtn: {
    flex: 1.4,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mobileStartBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2444',
  },
  // Details — compact icon-only pill
  mobileDetailBtn: {
    width: 50,
    flex: undefined,
    borderRadius: 14,
  },
  mobilePreviewCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  mobilePreviewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mobilePreviewDuration: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  mobilePreviewDistance: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  mobilePreviewEta: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
  },
  mobileActiveFooterCard: {
    marginTop: 12,
    marginBottom: 2,
  },
  searchHeader: {
    borderRadius: 26,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -60,
    top: -70,
  },
  searchHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  heroBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 5,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 15,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#38A169',
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#0F172A',
    fontSize: 15,
    paddingVertical: 0,
  },
  searchAction: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  mapInfoDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GOLD,
    marginRight: 10,
  },
  mapInfoTextWrap: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonPrimary: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  mapShell: {
    flex: 1,
  },
  mapShellContent: {
    paddingBottom: 18,
  },
  previewHeaderCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  previewHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  previewRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  previewRouteDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  previewRouteTextWrap: {
    flex: 1,
  },
  previewRouteLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewRouteMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  previewRouteDivider: {
    height: 1,
    marginVertical: 10,
  },
  activeHeaderCard: {
    borderRadius: 22,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: NAVY,
    borderTopWidth: 3,
    borderTopColor: GOLD,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  activeHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeHeaderInstruction: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  activeHeaderSecondary: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
  },
  activeHeaderHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.86)',
  },
  routeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  routeBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeBannerTextWrap: {
    flex: 1,
  },
  routeBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  routeBannerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  routeClearButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBottomCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  previewModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  previewModeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 38,
  },
  previewModeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  previewSummaryPrimary: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  previewSummarySecondary: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  previewSummaryRight: {
    alignItems: 'flex-end',
  },
  previewSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  previewSummaryEta: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
  },
  previewStartButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewStartButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  previewStepsWrap: {
    marginTop: 10,
  },
  previewStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 8,
    gap: 8,
  },
  previewStepIndex: {
    fontSize: 12,
    fontWeight: '800',
    width: 18,
  },
  previewStepInstruction: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  activeFooterCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  activeFooterMetric: {
    flex: 1,
  },
  activeFooterValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  activeFooterLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  activeEndButton: {
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeEndButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  travelModeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  travelModeCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  travelModeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  travelModeTitle: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  travelModeSubtitle: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  travelModeOption: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 58,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  travelModeOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelModeOptionTextWrap: {
    flex: 1,
  },
  travelModeOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  travelModeOptionMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  travelModeCancelButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelModeCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  directionsCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  directionsCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  directionStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  directionStepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  directionStepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  directionStepContent: {
    flex: 1,
    marginLeft: 10,
  },
  directionStepInstruction: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  directionStepMeta: {
    marginTop: 2,
    fontSize: 11,
  },
  mapCard: {
    width: '100%',
    minHeight: 320,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  mapOverlayTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pillBadgeMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  pillBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pillBadgeMutedText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSheet: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    marginBottom: 10,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  bottomSheetList: {
    gap: 10,
  },
  noResultsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  noResultsText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  sheetRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetRowText: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  sheetRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetRowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  sheetActionButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  directionButtonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  webContent: {
    padding: 20,
    paddingBottom: 26,
  },
  mapPreviewCard: {
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  webTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  webSubtitle: {
    fontSize: 14,
  },
  buildingCard: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  buildingCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buildingInfo: {
    marginLeft: 16,
    flex: 1,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buildingCoords: {
    fontSize: 12,
  },
  buildingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  smallActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  directionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  directionsContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: Dimensions.get('window').height * 0.6,
  },
  directionsCloseButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginRight: -8,
    marginTop: -8,
  },
  directionsCard: {
    marginTop: 16,
  },
  directionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  directionCompass: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    alignSelf: 'center',
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  compassArrow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassBearing: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  directionsInfo: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  directionsDescription: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  directionsFocusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  focusButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  suggestionsContainer: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: 200,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  suggestionMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

export default MapScreen;
