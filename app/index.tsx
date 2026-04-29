import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setSelectedMedication } from '../services/medicationStore';
import { searchMedicationsByName } from '../services/openFda';
import type { Medication } from '../types/medication';

import { useFocusEffect } from '@react-navigation/native';
import { loadAllergies } from '../services/allergyStorage';
import type { AllergyItem } from '../types/allergy';

import { useAuth } from '../contexts/AuthContext';

import * as ImagePicker from 'expo-image-picker';
import { identifyMedicationByImage } from '../services/googleVision';

const POPULAR_MEDICATIONS = [
  {
    title: 'Advil',
    subtitle: 'Ibuprofen',
    icon: 'bandage-outline' as const,
    background: '#dbeafe',
  },
  {
    title: 'Tylenol',
    subtitle: 'Acetaminophen',
    icon: 'medkit-outline' as const,
    background: '#ffedd5',
  },
  {
    title: 'Claritin',
    subtitle: 'Loratadine',
    icon: 'water-outline' as const,
    background: '#dbeafe',
  },
  {
    title: 'Benadryl',
    subtitle: 'Diphenhydramine HCl',
    icon: 'flower-outline' as const,
    background: '#fae8ff',
  },
];

function BottomNavItem({
  icon,
  label,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
}) {
  return (
    <View style={styles.bottomNavItem}>
      <Ionicons
        name={icon}
        size={20}
        color={active ? '#2563eb' : '#9ca3af'}
      />
      <Text style={[styles.bottomNavText, active && styles.bottomNavTextActive]}>
        {label}
      </Text>
    </View>
  );
}

function PopularMedicationCard({
  title,
  subtitle,
  icon,
  background,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.popularCard} onPress={onPress}>
      <View style={[styles.popularImage, { backgroundColor: background }]}>
        <Ionicons name={icon} size={28} color="#2563eb" />
      </View>
      <View style={styles.popularTextBlock}>
        <Text style={styles.popularTitle}>{title}</Text>
        <Text style={styles.popularSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const { user } = useAuth();

  const handleAllergyBannerPress = () => {
    if (user) {
      router.push('/allergy-profile');
    } else {
      router.replace('/profile');
    }
  };

  const [searchMode, setSearchMode] = useState<'text' | 'image'>('text');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [ocrPreview, setOcrPreview] = useState('');

  const authSessionKey = user?.uid ?? 'signed-out';
  const [showCameraAccessPrompt, setShowCameraAccessPrompt] = useState(true);

  useEffect(() => {
    setShowCameraAccessPrompt(true);
    setSelectedImageUri(null);
    setOcrPreview('');
    setResults([]);
    setMessage('');
    setIsError(false);
  }, [authSessionKey]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const refreshAllergies = async () => {
        const stored = await loadAllergies();
        if (mounted) {
          setAllergies(stored);
        }
      };

      refreshAllergies();

      return () => {
        mounted = false;
      };
    }, [])
  );

  function openDetails(item: Medication) {
    setSelectedMedication(item);
    router.push('/details');
  }

  async function runSearch(termOverride?: string) {
    const term = (termOverride ?? query).trim();
    setQuery(term);

    if (!term) {
      setResults([]);
      setIsError(true);
      setMessage('Please enter a medication name.');
      return;
    }

    try {
      setLoading(true);
      setIsError(false);
      setMessage('');

      const meds = await searchMedicationsByName(term);
      setResults(meds);

      if (meds.length === 0) {
        setIsError(true);
        setMessage('No matches found. Try another spelling or a similar name.');
      }
    } catch {
      setResults([]);
      setIsError(true);
      setMessage('Unable to retrieve medication data right now.');
    } finally {
      setLoading(false);
    }
  }

  async function openPopularMedication(term: string) {
    try {
      setLoading(true);
      setIsError(false);
      setMessage('');
      setQuery(term);

      const meds = await searchMedicationsByName(term);

      if (meds.length === 0) {
        setIsError(true);
        setMessage('No details were found for that medication right now.');
        return;
      }

      openDetails(meds[0]);
    } catch {
      setIsError(true);
      setMessage('Unable to retrieve medication data right now.');
    } finally {
      setLoading(false);
    }
  }

  function switchToTextSearch() {
    setSearchMode('text');
    setMessage('');
    setIsError(false);
  }

  function switchToImageSearch() {
    setSearchMode('image');
    setMessage('');
    setIsError(false);
  }

  function handleTakePhotoPress() {
    if (showCameraAccessPrompt) {
      Alert.alert(
        'Camera Search',
        'MedTrack can use the camera to help search for medication from an image.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: () => {
              setShowCameraAccessPrompt(false);
              takePhoto();
            },
          },
        ]
      );

      return;
    }

    takePhoto();
  }

  function promptImageSource() {
    Alert.alert('Image Search', 'Choose image source', [
      { text: 'Take Photo', onPress: handleTakePhotoPress },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function runImageSearchFromAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) {
      setResults([]);
      setIsError(true);
      setMessage('Could not read the image. Please try a clearer photo or use text search.');
      return;
    }

    try {
      setLoading(true);
      setResults([]);
      setMessage('');
      setIsError(false);
      setSelectedImageUri(asset.uri);

      const { ocrText, matchedTerm, results } = await identifyMedicationByImage(asset.base64);

      setOcrPreview(ocrText);

      if (results.length === 0) {
        setIsError(true);
        setMessage(
          ocrText
            ? 'No matching medication found. Please try a clearer photo or use text search.'
            : 'Could not read the image. Please try a clearer photo or use text search.'
        );
        return;
      }

      setResults(results);

      if (matchedTerm) {
        setMessage(`Image search matched: ${matchedTerm}`);
        setIsError(false);
      }
    } catch (error) {
      console.error(error);
      setResults([]);
      setIsError(true);
      setMessage('Unable to identify the medication right now.');
    } finally {
      setLoading(false);
    }
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setIsError(true);
      setMessage('Photo library access denied. Please use text search instead.');
      switchToTextSearch();
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      await runImageSearchFromAsset(result.assets[0]);
    }
  }

  async function takePhoto() {
    try {
      const currentPermission = await ImagePicker.getCameraPermissionsAsync();

      let finalPermission = currentPermission;

      if (!currentPermission.granted) {
        if (!currentPermission.canAskAgain) {
          setIsError(true);
          setMessage(
            'Camera access is blocked. Open Settings to allow camera access, or use text search instead.'
          );

          Alert.alert(
            'Camera Access Needed',
            'Camera access is currently blocked for MedTrack. Open Settings to allow camera access.',
            [
              {
                text: 'Use Text Search',
                style: 'cancel',
                onPress: switchToTextSearch,
              },
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
            ]
          );

          return;
        }

        finalPermission = await ImagePicker.requestCameraPermissionsAsync();
      }

      if (!finalPermission.granted) {
        setIsError(true);
        setMessage('Camera access denied. Please allow camera access or use text search instead.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        await runImageSearchFromAsset(result.assets[0]);
      }
    } catch (error) {
      console.error(error);
      setIsError(true);
      setMessage('Unable to open the camera right now. Please use text search instead.');
    }
  }

  const hasAllergies = allergies.length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.deviceFrame}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>MedTrack</Text>
            <Text style={styles.heroSubtitle}>
              Intelligent Medication Identification &amp; Tracking
            </Text>
          </View>

          <View style={styles.searchCard}>
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeTab, searchMode === 'text' && styles.modeTabActive]}
                onPress={switchToTextSearch}
              >
                <Ionicons
                  name="search-outline"
                  size={14}
                  color={searchMode === 'text' ? '#ffffff' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    searchMode === 'text' && styles.modeTabTextActive,
                  ]}
                >
                  Text Search
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modeTab, searchMode === 'image' && styles.modeTabActive]}
                onPress={switchToImageSearch}
              >
                <Ionicons
                  name="camera-outline"
                  size={14}
                  color={searchMode === 'image' ? '#ffffff' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    searchMode === 'image' && styles.modeTabTextActive,
                  ]}
                >
                  Image Search
                </Text>
              </Pressable>
            </View>

            {searchMode === 'text' ? (
              <View style={styles.inputRow}>
                <Ionicons name="search-outline" size={18} color="#9ca3af" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search medication name or ingredient..."
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  returnKeyType="search"
                  onSubmitEditing={() => runSearch()}
                />
                <Pressable onPress={() => runSearch()} style={styles.inputAction}>
                  <Ionicons name="arrow-forward" size={16} color="#2563eb" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.imageUploadCard} onPress={promptImageSource}>
                {selectedImageUri ? (
                  <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={30} color="#9ca3af" />
                  </View>
                )}

                <Text style={styles.imageUploadTitle}>Upload medication image</Text>
                <Text style={styles.imageUploadSubtitle}>
                  Take a photo or select from gallery
                </Text>

                {ocrPreview ? (
                  <Text style={styles.ocrPreview} numberOfLines={3}>
                    OCR preview: {ocrPreview}
                  </Text>
                ) : null}
              </Pressable>
            )}
            </View>

          <Pressable style={styles.banner} onPress={handleAllergyBannerPress}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={hasAllergies ? '#2563eb' : '#d97706'}
              style={styles.bannerIcon}
            />
            <View style={styles.bannerTextBlock}>
              <Text style={styles.bannerTitle}>
                {hasAllergies
                  ? `${allergies.length} allerg${allergies.length === 1 ? 'y' : 'ies'} on file`
                  : 'No allergies on file'}
              </Text>
              <Text style={styles.bannerText}>
                {hasAllergies
                  ? 'Your allergy profile is active for personalized warnings'
                  : 'Add your allergies in your profile to get personalized warnings'}
              </Text>
            </View>
          </Pressable>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" />
            </View>
          ) : results.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Search Results</Text>
                <Text style={styles.sectionMeta}>{results.length} found</Text>
              </View>

              {results.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.resultCard}
                  onPress={() => openDetails(item)}
                >
                  <View style={styles.resultTextBlock}>
                    <Text style={styles.resultTitle}>{item.name}</Text>
                    <Text style={styles.resultSubtitle}>
                      {item.genericName || 'Unknown generic name'}
                    </Text>
                    <Text style={styles.resultCaption}>
                      {item.activeIngredient && item.activeIngredient !== 'Not available'
                        ? item.activeIngredient
                        : 'Tap to view medication details'}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#9ca3af"
                  />
                </Pressable>
              ))}
            </View>
          ) : null}

          {message ? (
            <View style={[styles.messageBox, isError && styles.messageBoxError]}>
              <Text style={[styles.messageText, isError && styles.messageTextError]}>
                {message}
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Medications</Text>
            </View>

            <View style={styles.popularGrid}>
              {POPULAR_MEDICATIONS.map((item) => (
                <PopularMedicationCard
                  key={item.title}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  background={item.background}
                  onPress={() => openPopularMedication(item.title)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <BottomNavItem icon="home-outline" label="Home" active />
          <Pressable onPress={() => router.replace('/profile')}>
            <BottomNavItem icon="person-outline" label="Profile" />
          </Pressable>
        </View>
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
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 62,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#dbeafe',
    marginTop: 4,
  },
  searchCard: {
    marginHorizontal: 14,
    marginTop: -36,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: '#2563eb',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  modeTabTextActive: {
    color: '#ffffff',
  },
  inputRow: {
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
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  inputAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  banner: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerIcon: {
    marginTop: 2,
  },
  bannerTextBlock: {
    flex: 1,
    marginLeft: 8,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#a16207',
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: 28,
  },
  section: {
    marginHorizontal: 14,
    marginTop: 16,
  },
  sectionHeader: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 3,
  },
  resultCaption: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  messageBox: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  messageBoxError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  messageText: {
    fontSize: 13,
    color: '#1d4ed8',
  },
  messageTextError: {
    color: '#b91c1c',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  popularCard: {
    width: '48.4%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  popularImage: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularTextBlock: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  popularSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  bottomNav: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
  },
  bottomNavItem: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.95,
  },
  bottomNavText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  bottomNavTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  imageUploadCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },
  imageUploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  imageUploadSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  ocrPreview: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#4b5563',
    textAlign: 'center',
  },
});