import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { normalizeMapLocation } from '../services/mapService';

const MapWeb = ({ locations = [] }) => {
	const normalizedLocations = locations.map((location) => normalizeMapLocation(location)).filter(Boolean);

	return (
		<View style={styles.container}>
			<View style={styles.hero}>
				<Ionicons name="map" size={44} color={COLORS.primary} />
				<Text style={styles.title}>Interactive map available on mobile</Text>
				<Text style={styles.subtitle}>Open the app on iOS or Android to place markers on the campus map.</Text>
			</View>

			<FlatList
				data={normalizedLocations}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				renderItem={({ item }) => (
					<View style={styles.row}>
						<View style={styles.dot} />
						<View style={styles.rowText}>
							<Text style={styles.rowTitle}>{item.title}</Text>
							<Text style={styles.rowSubtitle} numberOfLines={1}>
								{item.subtitle || 'Campus location'}
							</Text>
						</View>
					</View>
				)}
				ListEmptyComponent={<Text style={styles.empty}>No mapped locations yet.</Text>}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFF',
	},
	hero: {
		padding: 18,
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#DDE7FF',
	},
	title: {
		marginTop: 12,
		fontSize: 18,
		fontWeight: '700',
		color: '#0B1B3B',
		textAlign: 'center',
	},
	subtitle: {
		marginTop: 6,
		fontSize: 13,
		color: '#5B6B8A',
		textAlign: 'center',
	},
	listContent: {
		padding: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 14,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#DDE7FF',
	},
	dot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#1D4ED8',
	},
	rowText: {
		flex: 1,
		marginLeft: 12,
	},
	rowTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0B1B3B',
	},
	rowSubtitle: {
		marginTop: 2,
		fontSize: 12,
		color: '#5B6B8A',
	},
	empty: {
		marginTop: 20,
		textAlign: 'center',
		color: '#5B6B8A',
	},
});

export default MapWeb;
