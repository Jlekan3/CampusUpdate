import { Alert, Linking, Platform } from 'react-native';

export const DEFAULT_CAMPUS_REGION = {
	latitude: 5.607,
	longitude: -0.172,
	latitudeDelta: 0.012,
	longitudeDelta: 0.012,
};

export const resolveCoordinate = (value) => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (value && typeof value.toNumber === 'function') {
		const converted = value.toNumber();
		return Number.isFinite(converted) ? converted : undefined;
	}

	const numericValue = Number(value);
	return Number.isFinite(numericValue) ? numericValue : undefined;
};

export const resolveLocationCoordinates = (location) => {
	if (!location) return null;

	const latitude = resolveCoordinate(
		location.latitude ?? location.coordinates?.latitude ?? location.location?.latitude
	);
	const longitude = resolveCoordinate(
		location.longitude ?? location.coordinates?.longitude ?? location.location?.longitude
	);

	if (typeof latitude !== 'number' || typeof longitude !== 'number') {
		return null;
	}

	return { latitude, longitude };
};

export const normalizeMapLocation = (location, fallbackTitle = 'Campus location') => {
	const coordinates = resolveLocationCoordinates(location);

	if (!coordinates) {
		return null;
	}

	return {
		id: location?.id ?? `${coordinates.latitude}-${coordinates.longitude}`,
		title: location?.name || location?.names || location?.title || fallbackTitle,
		subtitle: location?.building || location?.category || location?.type || '',
		description: location?.description || '',
		...coordinates,
		raw: location,
	};
};

export const buildMapRegion = (locations = [], selectedLocation = null, fallbackRegion = DEFAULT_CAMPUS_REGION) => {
	const normalized = [];

	if (selectedLocation) {
		const selectedCoordinates = resolveLocationCoordinates(selectedLocation);
		if (selectedCoordinates) {
			normalized.push(selectedCoordinates);
		}
	}

	locations.forEach((location) => {
		const coordinates = resolveLocationCoordinates(location);
		if (coordinates) {
			normalized.push(coordinates);
		}
	});

	if (normalized.length === 0) {
		return fallbackRegion;
	}

	const average = normalized.reduce(
		(accumulator, coordinates) => {
			accumulator.latitude += coordinates.latitude;
			accumulator.longitude += coordinates.longitude;
			return accumulator;
		},
		{ latitude: 0, longitude: 0 }
	);

	const latitude = average.latitude / normalized.length;
	const longitude = average.longitude / normalized.length;

	return {
		latitude,
		longitude,
		latitudeDelta: normalized.length > 1 ? 0.018 : 0.008,
		longitudeDelta: normalized.length > 1 ? 0.018 : 0.008,
	};
};

export const buildMapsUrl = (location) => {
	const coordinates = resolveLocationCoordinates(location);

	if (!coordinates) {
		return null;
	}

	const label = encodeURIComponent(
		location?.name || location?.names || location?.title || 'Campus location'
	);

	if (Platform.OS === 'ios') {
		return `http://maps.apple.com/?ll=${coordinates.latitude},${coordinates.longitude}&q=${label}`;
	}

	if (Platform.OS === 'android') {
		return `geo:${coordinates.latitude},${coordinates.longitude}?q=${coordinates.latitude},${coordinates.longitude}(${label})`;
	}

	return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
};

export const openLocationInMaps = async (location) => {
	const url = buildMapsUrl(location);
	const fallbackUrl = (() => {
		const coordinates = resolveLocationCoordinates(location);

		if (!coordinates) {
			return null;
		}

		return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
	})();

	if (!url) {
		Alert.alert('Unavailable', 'This location does not have valid coordinates.');
		return false;
	}

	let canOpen = false;

	try {
		canOpen = await Linking.canOpenURL(url);
	} catch (error) {
		canOpen = false;
	}

	if (!canOpen) {
		if (fallbackUrl) {
			await Linking.openURL(fallbackUrl);
			return true;
		}

		Alert.alert('Unavailable', 'No map app is available to open this location.');
		return false;
	}

	await Linking.openURL(url);
	return true;
};

const buildGoogleDirectionsUrl = (destinationCoordinates, originCoordinates = null) => {
	let url = `https://www.google.com/maps/dir/?api=1&destination=${destinationCoordinates.latitude},${destinationCoordinates.longitude}&travelmode=walking&dir_action=navigate`;

	if (originCoordinates) {
		url += `&origin=${originCoordinates.latitude},${originCoordinates.longitude}`;
	}

	return url;
};

export const openNavigationInMaps = async (destinationLocation, originLocation = null) => {
	const destinationCoordinates = resolveLocationCoordinates(destinationLocation);
	const originCoordinates = resolveLocationCoordinates(originLocation);

	if (!destinationCoordinates) {
		Alert.alert('Unavailable', 'This destination does not have valid coordinates.');
		return false;
	}

	const preferredUrls = [];

	if (Platform.OS === 'android') {
		preferredUrls.push(
			`google.navigation:q=${destinationCoordinates.latitude},${destinationCoordinates.longitude}&mode=w`
		);
	}

	if (Platform.OS === 'ios') {
		preferredUrls.push(
			`comgooglemaps://?daddr=${destinationCoordinates.latitude},${destinationCoordinates.longitude}&directionsmode=walking`
		);

		const appleSource = originCoordinates
			? `${originCoordinates.latitude},${originCoordinates.longitude}`
			: 'Current Location';

		preferredUrls.push(
			`http://maps.apple.com/?saddr=${encodeURIComponent(appleSource)}&daddr=${destinationCoordinates.latitude},${destinationCoordinates.longitude}&dirflg=w`
		);
	}

	preferredUrls.push(buildGoogleDirectionsUrl(destinationCoordinates, originCoordinates));

	for (const url of preferredUrls) {
		try {
			const supported = await Linking.canOpenURL(url);

			if (supported) {
				await Linking.openURL(url);
				return true;
			}

			if (!url.startsWith('http')) {
				await Linking.openURL(url);
				return true;
			}
		} catch (error) {
			console.log('Navigation launch failed', error);
		}
	}

	Alert.alert('Unavailable', 'No navigation app is available on this device.');
	return false;
};

const decodePolyline = (encoded) => {
	if (!encoded || typeof encoded !== 'string') {
		return [];
	}

	let index = 0;
	let latitude = 0;
	let longitude = 0;
	const coordinates = [];

	while (index < encoded.length) {
		let shift = 0;
		let result = 0;
		let byte;

		do {
			byte = encoded.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);

		const deltaLatitude = (result & 1) ? ~(result >> 1) : result >> 1;
		latitude += deltaLatitude;

		shift = 0;
		result = 0;

		do {
			byte = encoded.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);

		const deltaLongitude = (result & 1) ? ~(result >> 1) : result >> 1;
		longitude += deltaLongitude;

		coordinates.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
	}

	return coordinates;
};

const normalizeModifier = (modifier) => {
	if (!modifier) {
		return 'straight';
	}

	if (modifier === 'uturn') {
		return 'U-turn';
	}

	return modifier;
};

const appendRoadName = (instruction, roadName) => {
	if (!roadName) {
		return instruction;
	}

	return `${instruction} on ${roadName}`;
};

const buildStepInstruction = (step, isLastStep) => {
	const type = step?.maneuver?.type;
	const modifier = normalizeModifier(step?.maneuver?.modifier);
	const roadName = step?.name?.trim?.() || '';

	if (type === 'arrive' || isLastStep) {
		return 'You have arrived at your destination';
	}

	if (type === 'depart') {
		if (modifier === 'straight') {
			return appendRoadName('Head straight', roadName);
		}

		return appendRoadName(`Head ${modifier}`, roadName);
	}

	if (type === 'turn' || type === 'end of road') {
		if (modifier === 'U-turn') {
			return appendRoadName('Make a U-turn', roadName);
		}

		if (modifier === 'straight') {
			return appendRoadName('Continue straight', roadName);
		}

		return appendRoadName(`Turn ${modifier}`, roadName);
	}

	if (type === 'fork') {
		if (modifier === 'straight') {
			return appendRoadName('Keep straight', roadName);
		}

		return appendRoadName(`Keep ${modifier}`, roadName);
	}

	if (type === 'merge') {
		if (modifier === 'straight') {
			return appendRoadName('Merge ahead', roadName);
		}

		return appendRoadName(`Merge ${modifier}`, roadName);
	}

	if (type === 'roundabout' || type === 'rotary') {
		return appendRoadName('Enter the roundabout', roadName);
	}

	if (type === 'continue' || type === 'new name' || type === 'notification') {
		return appendRoadName('Continue', roadName);
	}

	return appendRoadName('Continue straight', roadName);
};

const normalizeRouteStep = (step, index, totalSteps) => {
	const location = step?.maneuver?.location;
	const longitude = resolveCoordinate(Array.isArray(location) ? location[0] : undefined);
	const latitude = resolveCoordinate(Array.isArray(location) ? location[1] : undefined);

	return {
		id: `step-${index}`,
		distance: Number.isFinite(step?.distance) ? step.distance : 0,
		duration: Number.isFinite(step?.duration) ? step.duration : 0,
		instruction: buildStepInstruction(step, index === totalSteps - 1),
		maneuverLocation:
			typeof latitude === 'number' && typeof longitude === 'number'
				? { latitude, longitude }
				: null,
	};
};

const resolveOsrmProfile = (travelMode = 'walking') => {
	const normalizedTravelMode = String(travelMode || 'walking').toLowerCase();

	if (normalizedTravelMode === 'driving' || normalizedTravelMode === 'drive') {
		return 'driving';
	}

	if (normalizedTravelMode === 'cycling' || normalizedTravelMode === 'bike') {
		return 'bike';
	}

	return 'foot';
};

const estimateDurationSeconds = (distanceMeters, travelMode) => {
	if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
		return 0;
	}

	const normalizedMode = String(travelMode || 'walking').toLowerCase();
	const speedMetersPerSecond = normalizedMode === 'driving'
		? 8.33
		: normalizedMode === 'cycling'
			? 4.17
			: 1.4;

	return distanceMeters / speedMetersPerSecond;
};

export const fetchRouteGuidance = async (startLocation, endLocation, options = {}) => {
	const startCoordinates = resolveLocationCoordinates(startLocation);
	const endCoordinates = resolveLocationCoordinates(endLocation);
	const profile = resolveOsrmProfile(options?.travelMode);

	if (!startCoordinates || !endCoordinates) {
		return { path: [], steps: [], distance: 0, duration: 0 };
	}

	// Request up to 3 alternatives so we can always select the shortest.
	// continue_straight=false lets OSRM prefer direct turns over U-turn
	// avoidance, which produces tighter campus-path routes.
	const url = [
		`https://router.project-osrm.org/route/v1/${profile}/`,
		`${startCoordinates.longitude},${startCoordinates.latitude}`,
		`;`,
		`${endCoordinates.longitude},${endCoordinates.latitude}`,
		`?overview=full&geometries=polyline&steps=true`,
		`&alternatives=3&continue_straight=false`,
	].join('');

	const response = await fetch(url);

	if (!response.ok) {
		return { path: [], steps: [], distance: 0, duration: 0 };
	}

	const data = await response.json();
	const routes = data?.routes;

	if (!routes || routes.length === 0) {
		return { path: [], steps: [], distance: 0, duration: 0 };
	}

	// Always take the shortest route by distance regardless of OSRM's ordering
	const route = [...routes].sort(
		(a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
	)[0];

	const encodedPolyline = route?.geometry;
	const path = encodedPolyline ? decodePolyline(encodedPolyline) : [];
	const rawSteps = (route.legs || []).flatMap((leg) => leg.steps || []);
	const steps = rawSteps.map((step, index) => normalizeRouteStep(step, index, rawSteps.length));
	const distance = Number.isFinite(route?.distance) ? route.distance : 0;
	const routeDuration = Number.isFinite(route?.duration) ? route.duration : 0;
	const estimatedDuration = estimateDurationSeconds(distance, options?.travelMode);
	const duration = estimatedDuration > 0 ? estimatedDuration : routeDuration;

	const stepScale = routeDuration > 0 && duration > 0
		? duration / routeDuration
		: 1;
	const scaledSteps = stepScale !== 1
		? steps.map((step) => ({
				...step,
				duration: Number.isFinite(step.duration) ? step.duration * stepScale : step.duration,
			}))
		: steps;

	return { path, steps: scaledSteps, distance, duration };
};

export const fetchRoutePath = async (startLocation, endLocation, options = {}) => {
	const guidance = await fetchRouteGuidance(startLocation, endLocation, options);
	return guidance.path;
};

// ─── Off-route detection helpers ─────────────────────────────────────────────

/**
 * Perpendicular distance (metres) from point P to the segment A→B.
 * Uses a flat-earth approximation — accurate enough for campus-scale distances.
 */
export const distanceToSegmentMeters = (pLat, pLng, aLat, aLng, bLat, bLng) => {
	const R = 6371000;
	const toRad = (v) => (v * Math.PI) / 180;

	const dAB = Math.sqrt(
		Math.pow((bLat - aLat) * toRad(1) * R, 2) +
		Math.pow((bLng - aLng) * toRad(1) * R * Math.cos(toRad(aLat)), 2),
	);
	if (dAB < 0.1) {
		// Degenerate segment — return distance to point A
		return Math.sqrt(
			Math.pow((pLat - aLat) * toRad(1) * R, 2) +
			Math.pow((pLng - aLng) * toRad(1) * R * Math.cos(toRad(aLat)), 2),
		);
	}

	// Parameter t ∈ [0,1] of the nearest point on segment A→B
	const t = Math.max(
		0,
		Math.min(
			1,
			(
				(pLat - aLat) * (bLat - aLat) +
				(pLng - aLng) * (bLng - aLng) * Math.pow(Math.cos(toRad(aLat)), 2)
			) / (
				Math.pow(bLat - aLat, 2) +
				Math.pow((bLng - aLng) * Math.cos(toRad(aLat)), 2)
			),
		),
	);

	const nLat = aLat + t * (bLat - aLat);
	const nLng = aLng + t * (bLng - aLng);

	return Math.sqrt(
		Math.pow((pLat - nLat) * toRad(1) * R, 2) +
		Math.pow((pLng - nLng) * toRad(1) * R * Math.cos(toRad(aLat)), 2),
	);
};

/**
 * Minimum distance (metres) from a point to the nearest segment of a polyline.
 */
export const minDistanceToPath = (lat, lng, path = []) => {
	if (!path || path.length === 0) return Infinity;
	if (path.length === 1) {
		const toRad = (v) => (v * Math.PI) / 180;
		const R = 6371000;
		return Math.sqrt(
			Math.pow((lat - path[0].latitude) * toRad(1) * R, 2) +
			Math.pow((lng - path[0].longitude) * toRad(1) * R * Math.cos(toRad(lat)), 2),
		);
	}
	let min = Infinity;
	for (let i = 0; i < path.length - 1; i++) {
		const d = distanceToSegmentMeters(
			lat, lng,
			path[i].latitude, path[i].longitude,
			path[i + 1].latitude, path[i + 1].longitude,
		);
		if (d < min) min = d;
	}
	return min;
};

/**
 * Absolute angular difference between two compass headings (0–180 °).
 */
export const headingDifference = (h1, h2) => {
	if (h1 == null || h2 == null) return 0;
	const diff = Math.abs((h1 % 360) - (h2 % 360));
	return diff > 180 ? 360 - diff : diff;
};

/**
 * Expected bearing (degrees) of the route segment nearest to the user.
 * Returns null if the path is too short to compute a bearing.
 */
export const expectedRouteHeading = (lat, lng, path = []) => {
	if (!path || path.length < 2) return null;
	let minDist = Infinity;
	let bestSegment = 0;
	for (let i = 0; i < path.length - 1; i++) {
		const d = distanceToSegmentMeters(
			lat, lng,
			path[i].latitude, path[i].longitude,
			path[i + 1].latitude, path[i + 1].longitude,
		);
		if (d < minDist) { minDist = d; bestSegment = i; }
	}
	const a = path[bestSegment];
	const b = path[bestSegment + 1];
	const toRad = (v) => (v * Math.PI) / 180;
	const dLng = toRad(b.longitude - a.longitude);
	const y = Math.sin(dLng) * Math.cos(toRad(b.latitude));
	const x =
		Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
		Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(dLng);
	return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};
