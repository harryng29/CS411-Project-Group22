import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSelectedMedication } from '../services/medicationStore';

import { loadAllergies } from '../services/allergyStorage';
import type { AllergyItem } from '../types/allergy';
import { findAllergyConflicts, medicationToIngredientList } from '../utils/allergyMatch';

type DetailTab = 'uses' | 'warnings' | 'dosage';

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

function toSentences(text: string) {
  return (text.match(/[^.!?]+[.!?]?/g) ?? [text])
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function buildParagraphs(text: string, tab: DetailTab) {
  if (!text || text === 'Not available') return ['Not available'];

  const existingBlocks = text
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (existingBlocks.length > 1) {
    return existingBlocks;
  }

  const sentences = toSentences(text);
  const chunkSize = tab === 'warnings' ? 1 : 2;
  const paragraphs: string[] = [];

  for (let i = 0; i < sentences.length; i += chunkSize) {
    paragraphs.push(sentences.slice(i, i + chunkSize).join(' ').trim());
  }

  return paragraphs;
}

function DetailTabButton({
  label,
  icon,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={styles.tabButton}
    >
      <View style={styles.tabButtonInner}>
        <Ionicons
          name={icon}
          size={14}
          color={active ? '#2563eb' : '#6b7280'}
        />
        <Text
          style={[
            styles.tabLabel,
            active && styles.tabLabelActive,
            disabled && styles.tabLabelDisabled,
          ]}
        >
          {label}
        </Text>
      </View>

      <View
        style={[
          styles.tabUnderline,
          active && styles.tabUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

export default function DetailsScreen() {
  const medication = getSelectedMedication();
  const [activeTab, setActiveTab] = useState<DetailTab>('uses');
  const [expanded, setExpanded] = useState(false);

  const [allergies, setAllergies] = useState<AllergyItem[]>([]);

  useEffect(() => {
    const init = async () => {
      const stored = await loadAllergies();
      setAllergies(stored);
    };

    init();
  }, []);

  const activeIngredients = useMemo(() => {
    return medicationToIngredientList(medication?.activeIngredient);
  }, [medication]);

  const conflicts = useMemo(() => {
    return findAllergyConflicts(activeIngredients, allergies);
  }, [activeIngredients, allergies]);

  const hasAllergyConflict = conflicts.length > 0;

  const fullContent = useMemo(() => {
    if (!medication) return 'Not available';

    if (activeTab === 'warnings') {
      return medication.warnings || 'Not available';
    }

    if (activeTab === 'dosage') {
      return medication.dosage || 'Not available';
    }

    return medication.uses || 'Not available';
  }, [activeTab, medication]);

  const paragraphs = useMemo(
    () => buildParagraphs(fullContent, activeTab),
    [fullContent, activeTab]
  );

  const previewCount = activeTab === 'warnings' ? 3 : 2;

  const canToggle =
    fullContent !== 'Not available' && paragraphs.length > previewCount;

  const visibleParagraphs =
    !canToggle || expanded
      ? paragraphs
      : paragraphs.slice(0, previewCount);

  if (!medication) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.deviceFrame}>
          <View style={styles.headerRow}>
            <Pressable style={styles.headerIconButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </Pressable>
            <Text style={styles.headerTitle}>Medication Details</Text>
            <View style={styles.headerIconButton} />
          </View>

          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Could not load medication details.</Text>
            <Text style={styles.errorText}>
              Please go back and select a medication again.
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

          <Text style={styles.headerTitle}>Medication Details</Text>

          <View style={styles.headerIconButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.thumb}>
                <Ionicons name="medkit" size={30} color="#2563eb" />
              </View>

              <View style={styles.heroTextBlock}>
                <Text style={styles.medicationName}>{medication.name}</Text>
                <Text style={styles.genericName}>{medication.genericName}</Text>

                <View style={styles.badgesRow}>
                  <View style={styles.fdaBadge}>
                    <Text style={styles.fdaBadgeText}>FDA Approved</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.activeIngredientBox}>
              <Text style={styles.activeIngredientLabel}>ACTIVE INGREDIENTS</Text>
              <Text style={styles.activeIngredientValue}>
                {medication.activeIngredient || 'Not available'}
              </Text>
            </View>
          </View>

          {hasAllergyConflict && (
            <View style={styles.warningBanner}>
              <View style={styles.warningBannerHeader}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#dc2626"
                />
                <Text style={styles.warningBannerTitle}>ALLERGY WARNING</Text>
              </View>
              <Text style={styles.warningBannerText}>
                This medication contains ingredients you may be allergic to:
              </Text>
              <Text style={styles.warningBannerConflict}>
                {conflicts.join(', ')}
              </Text>
              <Text style={styles.warningBannerText}>
                DO NOT TAKE without consulting your healthcare provider.
              </Text>
            </View>
          )}

          <Pressable
            style={styles.primaryAction}
            onPress={() => router.push('/findPharmacy')}
          >
            <Ionicons name="location-outline" size={16} color="#ffffff" />
            <Text style={styles.primaryActionText}>Find Nearby Pharmacies</Text>
          </Pressable>

          <View style={styles.tabsRow}>
            <DetailTabButton
              label="Uses"
              icon="document-text-outline"
              active={activeTab === 'uses'}
              onPress={() => {
                setActiveTab('uses');
                setExpanded(false);
              }}
            />
            <DetailTabButton
              label="Warnings"
              icon="alert-circle-outline"
              active={activeTab === 'warnings'}
              onPress={() => {
                setActiveTab('warnings');
                setExpanded(false);
              }}
            />
            <DetailTabButton
              label="Dosage"
              icon="medkit-outline"
              active={activeTab === 'dosage'}
              onPress={() => {
                setActiveTab('dosage');
                setExpanded(false);
              }}
            />
          </View>

          <View style={styles.contentCard}>
            {visibleParagraphs.map((paragraph, index) =>
              activeTab === 'warnings' && paragraph !== 'Not available' ? (
                <View
                  key={index}
                  style={[
                    styles.bulletRow,
                    index > 0 && styles.contentParagraph,
                  ]}
                >
                  <Text style={styles.bullet}>•</Text>
                  <Text style={[styles.contentText, styles.bulletText]}>
                    {paragraph}
                  </Text>
                </View>
              ) : (
                <Text
                  key={index}
                  style={[
                    styles.contentText,
                    index > 0 && styles.contentParagraph,
                  ]}
                >
                  {paragraph}
                </Text>
              )
            )}

            {canToggle && (
              <Pressable onPress={() => setExpanded(!expanded)}>
                <Text style={styles.toggleText}>
                  {expanded ? 'Show less' : 'Show more'}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.footerMeta}>
            Information source: {medication.source} · Last updated: {medication.lastUpdated}
          </Text>
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              This app is informational only and does not provide medical diagnosis,
              treatment advice, or doctor consultation. Please consult a healthcare
              professional when appropriate.
            </Text>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    padding: 14,
  },
  thumb: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  medicationName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  genericName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  fdaBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fdaBadgeText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '700',
  },
  activeIngredientBox: {
    backgroundColor: '#f8fbff',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activeIngredientLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  activeIngredientValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  warningBanner: {
    marginTop: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 12,
  },
  warningBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  warningBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  warningBannerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#7f1d1d',
  },
  primaryAction: {
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  tabsRow: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#2563eb',
  },
  tabLabelDisabled: {
    color: '#9ca3af',
  },
  tabUnderline: {
    height: 2,
    width: '70%',
    backgroundColor: 'transparent',
    borderRadius: 999,
  },
  tabUnderlineActive: {
    backgroundColor: '#2563eb',
  },
  contentCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 14,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  contentParagraph: {
    marginTop: 12,
  },
  toggleText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  footerMeta: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 17,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 8,
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
  errorBox: {
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorText: {
    marginTop: 8,
    fontSize: 15,
    color: '#475569',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bullet: {
    fontSize: 16,
    lineHeight: 22,
    color: '#2563eb',
    marginRight: 8,
  },

  bulletText: {
    flex: 1,
  },

  warningBannerConflict: {
    fontSize: 13,
    lineHeight: 20,
    color: '#dc2626',
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
  },

  disclaimerCard: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 12,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
  },
});