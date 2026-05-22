import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { normalizeMapLocation, resolveLocationCoordinates } from '../services/mapService';
import googleMapsConfig from '../config/googleMaps';

const DEFAULT_CENTER = { latitude: 5.607, longitude: -0.172 };

function escapeForHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function CampusMap({
  locations = [],
  onLocationPress,
  style,
  selectedLocation = null,
  routeCoordinates = [],
  showsUserLocation = false,
  userLocation = null,
}) {
  const webviewRef = useRef(null);

  const normalizedLocations = useMemo(
    () => locations.map((l) => normalizeMapLocation(l)).filter(Boolean),
    [locations]
  );

  const selectedMarker = useMemo(() => normalizeMapLocation(selectedLocation), [selectedLocation]);

  const normalizedRouteCoordinates = useMemo(
    () =>
      (routeCoordinates || [])
        .map((point) => resolveLocationCoordinates(point))
        .filter(Boolean),
    [routeCoordinates]
  );

  // Push live user-location updates into the existing map WITHOUT remounting WebView
  useEffect(() => {
    if (!webviewRef.current || !showsUserLocation) return;
    const coord = userLocation ? resolveLocationCoordinates(userLocation) : null;
    if (!coord) return;
    const js = `
      if (typeof window.__updateUserLocation === 'function') {
        window.__updateUserLocation(${coord.latitude}, ${coord.longitude});
      }
      true;
    `;
    webviewRef.current.injectJavaScript(js);
  }, [userLocation, showsUserLocation]);

  const markers = normalizedLocations.map((loc) => ({
    id: loc.id ?? `${loc.latitude}-${loc.longitude}`,
    latitude: loc.latitude,
    longitude: loc.longitude,
    title: escapeForHtml(loc.name || loc.title || 'Campus location'),
    subtitle: escapeForHtml(loc.building || loc.category || loc.type || ''),
  }));

  const startCenter = selectedMarker || markers[0] || DEFAULT_CENTER;
  const apiKey = googleMapsConfig.GOOGLE_MAPS_API_KEY || '';
  const selectedMarkerId = selectedMarker?.id || null;

  // Initial user position injected into the HTML only once (avoids re-mount on every GPS tick)
  const initialUserCoord = showsUserLocation && userLocation
    ? resolveLocationCoordinates(userLocation)
    : null;

  const mapHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          #map { background: #e6edff; }
        </style>
        <script>
          const MARKERS           = ${JSON.stringify(markers)};
          const SELECTED_MARKER_ID = ${JSON.stringify(selectedMarkerId)};
          const ROUTE_PATH        = ${JSON.stringify(normalizedRouteCoordinates)};
          const INITIAL_USER_COORD = ${JSON.stringify(initialUserCoord)};

          let __map = null;
          let __userMarker = null;

          // Called by injectJavaScript on every GPS tick — no map remount needed
          window.__updateUserLocation = function(lat, lng) {
            if (!__map) return;
            const pos = { lat, lng };
            if (__userMarker) {
              __userMarker.setPosition(pos);
            } else {
              __userMarker = new google.maps.Marker({
                position: pos,
                map: __map,
                title: 'Your location',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#0EA5E9',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 3,
                  scale: 8,
                },
                zIndex: 999,
              });
            }
          };

          function initMap() {
            const center = { lat: ${startCenter.latitude}, lng: ${startCenter.longitude} };
            __map = new google.maps.Map(document.getElementById('map'), {
              center,
              zoom: 17,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            });

            const bounds = new google.maps.LatLngBounds();
            let hasBounds = false;

            // ── Markers ──────────────────────────────────────────────────────
            MARKERS.forEach(m => {
              const isSelected = SELECTED_MARKER_ID && m.id === SELECTED_MARKER_ID;
              const marker = new google.maps.Marker({
                position: { lat: m.latitude, lng: m.longitude },
                map: __map,
                title: m.title,
                icon: isSelected
                  ? {
                      path: google.maps.SymbolPath.CIRCLE,
                      fillColor: '#1D4ED8',
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 3,
                      scale: 10,
                    }
                  : {
                      path: google.maps.SymbolPath.CIRCLE,
                      fillColor: '#1A365D',
                      fillOpacity: 0.85,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
                      scale: 7,
                    },
              });

              bounds.extend(marker.getPosition());
              hasBounds = true;

              marker.addListener('click', () => {
                const payload = { type: 'markerClick', id: m.id };
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify(payload));
                }
              });
            });

            // ── Route polyline ────────────────────────────────────────────────
            if (ROUTE_PATH.length > 1) {
              const path = ROUTE_PATH.map(p => ({ lat: p.latitude, lng: p.longitude }));

              // Subtle shadow line
              new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: '#1A365D',
                strokeOpacity: 0.18,
                strokeWeight: 9,
                map: __map,
              });

              // Main route line
              new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: '#2563EB',
                strokeOpacity: 0.95,
                strokeWeight: 5,
                map: __map,
              });

              // Destination pin
              const dest = path[path.length - 1];
              new google.maps.Marker({
                position: dest,
                map: __map,
                title: 'Destination',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#DC2626',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 3,
                  scale: 9,
                },
                zIndex: 998,
              });

              path.forEach(p => { bounds.extend(p); hasBounds = true; });
            }

            // ── Initial user location ─────────────────────────────────────────
            if (INITIAL_USER_COORD) {
              window.__updateUserLocation(INITIAL_USER_COORD.latitude, INITIAL_USER_COORD.longitude);
              bounds.extend({ lat: INITIAL_USER_COORD.latitude, lng: INITIAL_USER_COORD.longitude });
              hasBounds = true;
            }

            if (hasBounds) {
              __map.fitBounds(bounds, { top: 80, right: 40, bottom: 80, left: 40 });
            }
          }
        </script>
        <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
      </head>
      <body>
        <div id="map"></div>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick') {
        const found = normalizedLocations.find(
          (loc) => (loc.id ?? `${loc.latitude}-${loc.longitude}`) === data.id
        );
        if (found && onLocationPress) onLocationPress(found.raw || found);
      }
    } catch (_) {}
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        onMessage={handleMessage}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#F8FAFF',
  },
});
