import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import googleMapsConfig from '../config/googleMaps';

const DEFAULT_CENTER = {
  latitude: 40.2206,
  longitude: -74.7597,
};

function escapeForHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveCoordinate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value.toNumber === 'function') {
    const converted = value.toNumber();
    return Number.isFinite(converted) ? converted : undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

export default function OpenStreetMapMap({ locations = [] }) {
  const normalizedLocations = locations
    .map((loc) => ({
      ...loc,
      latitude: resolveCoordinate(loc.latitude ?? loc.coordinates?.latitude),
      longitude: resolveCoordinate(loc.longitude ?? loc.coordinates?.longitude),
    }))
    .filter((loc) => typeof loc.latitude === 'number' && typeof loc.longitude === 'number');

  const mapHtml = useMemo(() => {
    const markers = normalizedLocations.map((loc) => ({
      id: loc.id ?? `${loc.latitude}-${loc.longitude}`,
      latitude: loc.latitude,
      longitude: loc.longitude,
      title: escapeForHtml(loc.name || loc.title || 'Campus location'),
      subtitle: escapeForHtml(loc.building || loc.category || loc.type || ''),
    }));

    const startCenter = markers[0] || DEFAULT_CENTER;
    const markersJson = JSON.stringify(markers);
    const apiKey = googleMapsConfig.GOOGLE_MAPS_API_KEY || '';

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <style>
            html, body, #map { margin: 0; width: 100%; height: 100%; background: #e0f2fe; overflow: hidden; }
          </style>
          <script>
            const MARKERS = ${markersJson};
            function initMap(){
              const center = { lat: ${startCenter.latitude}, lng: ${startCenter.longitude} };
              const map = new google.maps.Map(document.getElementById('map'), { center, zoom: 15 });
              MARKERS.forEach(m => {
                const marker = new google.maps.Marker({ position: { lat: m.latitude, lng: m.longitude }, map, title: m.title });
                const info = new google.maps.InfoWindow({ content: '<div><strong>' + m.title + '</strong>' + (m.subtitle ? '<div>' + m.subtitle + '</div>' : '') + '</div>' });
                marker.addListener('click', () => info.open(map, marker));
              });
            }
          </script>
          <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
        </head>
        <body>
          <div id="map"></div>
        </body>
      </html>
    `;
  }, [normalizedLocations]);

  return (
    <WebView
      key={mapHtml}
      style={styles.map}
      originWhitelist={['*']}
      source={{ html: mapHtml }}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      mixedContentMode="always"
      nestedScrollEnabled
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: '#E0F2FE',
  },
});