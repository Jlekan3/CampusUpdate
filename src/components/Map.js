import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { normalizeMapLocation, resolveLocationCoordinates } from '../services/mapService';
import googleMapsConfig from '../config/googleMaps';
import { COLORS } from '../utils/constants';

const DEFAULT_CENTER = { latitude: 40.2206, longitude: -74.7597 };

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

  const userCoordinate = useMemo(() => {
    if (!showsUserLocation) {
      return null;
    }

    return resolveLocationCoordinates(userLocation);
  }, [showsUserLocation, userLocation]);

  const markers = normalizedLocations.map((loc) => ({
    id: loc.id ?? `${loc.latitude}-${loc.longitude}`,
    latitude: loc.latitude,
    longitude: loc.longitude,
    title: escapeForHtml(loc.name || loc.title || 'Campus location'),
    subtitle: escapeForHtml(loc.building || loc.category || loc.type || ''),
  }));

  const startCenter = markers[0] || DEFAULT_CENTER;
  const apiKey = googleMapsConfig.GOOGLE_MAPS_API_KEY || '';
  const selectedMarkerId = selectedMarker?.id || null;

  const mapHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>html,body,#map{height:100%;margin:0;padding:0;}#map{background:#e6edff}</style>
        <script>
          const MARKERS = ${JSON.stringify(markers)};
          const SELECTED_MARKER_ID = ${JSON.stringify(selectedMarkerId)};
          const ROUTE_PATH = ${JSON.stringify(normalizedRouteCoordinates)};
          const USER_COORDINATE = ${JSON.stringify(userCoordinate)};

          function initMap(){
            const center = { lat: ${startCenter.latitude}, lng: ${startCenter.longitude} };
            const map = new google.maps.Map(document.getElementById('map'), {
              center,
              zoom: 15,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            });

            const bounds = new google.maps.LatLngBounds();
            let hasBounds = false;

            MARKERS.forEach(m => {
              const isSelected = SELECTED_MARKER_ID && m.id === SELECTED_MARKER_ID;
              const marker = new google.maps.Marker({
                position: { lat: m.latitude, lng: m.longitude },
                map,
                title: m.title,
                icon: isSelected
                  ? {
                      path: google.maps.SymbolPath.CIRCLE,
                      fillColor: '#1D4ED8',
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
                      scale: 8,
                    }
                  : undefined,
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

            if (ROUTE_PATH.length > 1) {
              const path = ROUTE_PATH.map(point => ({ lat: point.latitude, lng: point.longitude }));

              new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: '#2563EB',
                strokeOpacity: 0.92,
                strokeWeight: 5,
                map,
              });

              path.forEach(point => {
                bounds.extend(point);
                hasBounds = true;
              });
            }

            if (USER_COORDINATE) {
              const userPoint = { lat: USER_COORDINATE.latitude, lng: USER_COORDINATE.longitude };
              new google.maps.Marker({
                position: userPoint,
                map,
                title: 'Your location',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#0EA5E9',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 3,
                  scale: 7,
                },
                zIndex: 999,
              });

              bounds.extend(userPoint);
              hasBounds = true;
            }

            if (hasBounds) {
              map.fitBounds(bounds, 56);
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
        const found = normalizedLocations.find((loc) => (loc.id ?? `${loc.latitude}-${loc.longitude}`) === data.id);
        if (found && onLocationPress) onLocationPress(found.raw || found);
      }
    } catch (e) {
      // ignore malformed messages
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView key={mapHtml} originWhitelist={["*"]} source={{ html: mapHtml }} onMessage={handleMessage} />
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
