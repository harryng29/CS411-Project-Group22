import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { getSelectedMedication } from '../services/medicationStore';
import {
  searchNearbyPharmacies,
  searchNearbyPharmaciesByText,
} from '../services/pharmacySearch';
import type { Pharmacy } from '../types/pharmacy';

function PharmacyCard({
  pharmacy,
  onDirections,
  onCall,
}: {
  pharmacy: Pharmacy;
  onDirections: () => void;
  onCall: () => void;
}) {
  return (
    <View style={styles.pharmacyCard}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
          <Text style={styles.pharmacyAddress}>{pharmacy.address}</Text>
        </View>

        <Text
          style={[
            styles.stockBadge,
            pharmacy.stockStatus === 'In Stock' && styles.stockBadgeGreen,
            pharmacy.stockStatus === 'Limited' && styles.stockBadgeOrange,
          ]}
        >
          {pharmacy.stockStatus}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color="#6b7280" />
          <Text style={styles.metaText}>
            {pharmacy.distanceMiles != null
              ? `${pharmacy.distanceMiles} mi`
              : 'Distance unavailable'}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#6b7280" />
          <Text style={styles.metaText}>
            {pharmacy.openNow == null
              ? 'Hours unavailable'
              : pharmacy.openNow
              ? 'Open now'
              : 'Closed now'}
          </Text>
        </View>
      </View>

      {pharmacy.priceLabel ? (
        <Text style={styles.priceText}>{pharmacy.priceLabel}</Text>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={onDirections}>
          <Ionicons name="navigate-outline" size={16} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Directions</Text>
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            !pharmacy.phone && styles.secondaryButtonDisabled,
          ]}
          onPress={onCall}
        >
          <Ionicons
            name="call-outline"
            size={16}
            color={pharmacy.phone ? '#6b7280' : '#c4c4c4'}
          />
          <Text
            style={[
              styles.secondaryButtonText,
              !pharmacy.phone && styles.secondaryButtonTextDisabled,
            ]}
          >
            Call
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function FindPharmacyScreen() {
  const medication = getSelectedMedication();
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [message, setMessage] = useState('');
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [needsManualLocation, setNeedsManualLocation] = useState(false);
  const [canAskAgainLocation, setCanAskAgainLocation] = useState(true);

  const inStockCount = useMemo(
    () => pharmacies.filter((item) => item.stockStatus === 'In Stock').length,
    [pharmacies]
  );

  useEffect(() => {
    if (!medication) {
        setLoading(false);
        return;
    }

    loadNearbyPharmacies();
    }, []);

    useFocusEffect(
    useCallback(() => {
        if (!medication) return;

        refreshLocationPermissionState();
    }, [medication])
    );

  async function refreshLocationPermissionState() {
    try {
        const permission = await Location.getForegroundPermissionsAsync();

        if (permission.status === 'granted') {
        setShowLocationBanner(false);
        setNeedsManualLocation(false);
        setCanAskAgainLocation(true);
        return;
        }

        setShowLocationBanner(true);
        setNeedsManualLocation(true);
        setCanAskAgainLocation(permission.canAskAgain ?? true);
    } catch (error) {
        console.error(error);
    }
    }

    async function loadNearbyPharmaciesByCoords(latitude: number, longitude: number) {
    if (!medication) return;

    const results = await searchNearbyPharmacies(
        medication.name,
        latitude,
        longitude
    );

    setPharmacies(results);

    if (results.length === 0) {
        setMessage(
        'No pharmacies found near your location. Try expanding your search area.'
        );
    } else {
        setMessage('');
    }
    }

    async function loadNearbyPharmacies() {
    if (!medication) return;

    try {
        setLoading(true);
        setMessage('');
        setShowLocationBanner(false);
        setNeedsManualLocation(false);

        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
        setShowLocationBanner(true);
        setNeedsManualLocation(true);
        setCanAskAgainLocation(permission.canAskAgain ?? true);
        setMessage('Enter a ZIP code or city to search nearby pharmacies.');
        setPharmacies([]);
        return;
        }

        const current = await Location.getCurrentPositionAsync({});

        await loadNearbyPharmaciesByCoords(
        current.coords.latitude,
        current.coords.longitude
        );
    } catch (error) {
        console.error(error);
        setMessage(
        'Unable to retrieve pharmacy data right now. Please try again later.'
        );
    } finally {
        setLoading(false);
    }
    }

    async function handleUseCurrentLocation() {
    if (!medication) return;

    try {
        setLoading(true);
        setMessage('');

        const currentPermission = await Location.getForegroundPermissionsAsync();

        if (currentPermission.status === 'granted') {
        const current = await Location.getCurrentPositionAsync({});
        setShowLocationBanner(false);
        setNeedsManualLocation(false);
        await loadNearbyPharmaciesByCoords(
            current.coords.latitude,
            current.coords.longitude
        );
        return;
        }

        if (currentPermission.canAskAgain) {
        const requested = await Location.requestForegroundPermissionsAsync();

        if (requested.status === 'granted') {
            const current = await Location.getCurrentPositionAsync({});
            setShowLocationBanner(false);
            setNeedsManualLocation(false);
            setCanAskAgainLocation(true);
            await loadNearbyPharmaciesByCoords(
            current.coords.latitude,
            current.coords.longitude
            );
            return;
        }

        setShowLocationBanner(true);
        setNeedsManualLocation(true);
        setCanAskAgainLocation(requested.canAskAgain ?? true);
        setMessage('Enter a ZIP code or city to search nearby pharmacies.');
        return;
        }

        Alert.alert(
        'Location permission needed',
        'Enable location access in Settings to use your current location.',
        [
            { text: 'Cancel', style: 'cancel' },
            {
            text: 'Open Settings',
            onPress: () => {
                Linking.openSettings();
            },
            },
        ]
        );
    } catch (error) {
        console.error(error);
        setMessage(
        'Unable to retrieve pharmacy data right now. Please try again later.'
        );
    } finally {
        setLoading(false);
    }
    }

  async function handleManualSearch() {
    if (!medication) return;

    const trimmed = manualLocation.trim();

    if (!trimmed) {
      Alert.alert('Missing location', 'Please enter a ZIP code or city.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const results = await searchNearbyPharmaciesByText(
        medication.name,
        trimmed
      );

      setPharmacies(results);

      if (results.length === 0) {
        setMessage(
          'No pharmacies found near that location. Try another ZIP code or city.'
        );
      }
    } catch (error) {
      console.error(error);
      setMessage(
        'Unable to retrieve pharmacy data right now. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDirections(pharmacy: Pharmacy) {
    try {
      const url =
        pharmacy.mapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${pharmacy.name} ${pharmacy.address}`
        )}`;

      await Linking.openURL(url);
    } catch (error) {
      console.error(error);
      Alert.alert('Unable to open maps', 'Please try again.');
    }
  }

  async function handleCall(pharmacy: Pharmacy) {
    if (!pharmacy.phone) {
      Alert.alert(
        'Phone unavailable',
        'This pharmacy phone number is not available yet.'
      );
      return;
    }

    try {
      await Linking.openURL(`tel:${pharmacy.phone}`);
    } catch (error) {
      console.error(error);
      Alert.alert('Unable to start call', 'Please try again.');
    }
  }

  if (!medication) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.deviceFrame}>
          <View style={styles.headerRow}>
            <Pressable style={styles.headerIconButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </Pressable>
            <Text style={styles.headerTitle}>Find Pharmacy</Text>
            <View style={styles.headerIconButton} />
          </View>

          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No medication selected</Text>
            <Text style={styles.emptyStateText}>
              Please go back and select a medication first.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.deviceFrame}>
        <View style={styles.headerRow}>
          <Pressable style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Find Pharmacy</Text>
            <Text style={styles.headerSubtitle}>{medication.name}</Text>
          </View>

          <View style={styles.headerIconButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {showLocationBanner && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                Unable to access your location. Showing nearby pharmacies.
              </Text>
            </View>
          )}

          {needsManualLocation && (
            <View style={styles.manualCard}>
                <Text style={styles.manualTitle}>Search by ZIP code or city</Text>
                <Text style={styles.manualSubtitle}>
                Enter a ZIP code or city to find pharmacies near that area, or switch back to
                current location.
                </Text>

                <Pressable style={styles.locationRetryButton} onPress={handleUseCurrentLocation}>
                <Ionicons
                    name={canAskAgainLocation ? 'locate-outline' : 'settings-outline'}
                    size={16}
                    color="#2563eb"
                />
                <Text style={styles.locationRetryButtonText}>
                    {canAskAgainLocation ? 'Use Current Location' : 'Enable Location in Settings'}
                </Text>
                </Pressable>

                <View style={styles.manualInputRow}>
                <Ionicons name="location-outline" size={18} color="#9ca3af" />
                <TextInput
                    value={manualLocation}
                    onChangeText={setManualLocation}
                    placeholder="Enter ZIP code or city..."
                    placeholderTextColor="#9ca3af"
                    style={styles.manualInput}
                    returnKeyType="search"
                    onSubmitEditing={handleManualSearch}
                />
                </View>

                <Pressable style={styles.searchButton} onPress={handleManualSearch}>
                <Text style={styles.searchButtonText}>Search Nearby Pharmacies</Text>
                </Pressable>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Nearby Pharmacies ({inStockCount} in stock)
                </Text>
              </View>

              {pharmacies.length > 0 ? (
                pharmacies.map((item) => (
                  <PharmacyCard
                    key={item.id}
                    pharmacy={item}
                    onDirections={() => handleDirections(item)}
                    onCall={() => handleCall(item)}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No pharmacies found</Text>
                  <Text style={styles.emptyStateText}>
                    {message || 'Try again later.'}
                  </Text>
                </View>
              )}

              {message && pharmacies.length > 0 ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>{message}</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f5f9',
  },
  deviceFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#f3f5f9',
  },
  headerRow: {
    height: 54,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  banner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#a16207',
  },
  manualCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  manualTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  manualSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 12,
  },
  manualInputRow: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  searchButton: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  pharmacyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  pharmacyAddress: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
    marginTop: 4,
  },
  stockBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  stockBadgeGreen: {
    color: '#16a34a',
  },
  stockBadgeOrange: {
    color: '#d97706',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  priceText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    width: 92,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  secondaryButtonTextDisabled: {
    color: '#c4c4c4',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    marginTop: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
    marginTop: 6,
  },
  messageBox: {
    marginTop: 6,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  messageText: {
    fontSize: 13,
    color: '#1d4ed8',
  },
  locationRetryButton: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
    locationRetryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
});