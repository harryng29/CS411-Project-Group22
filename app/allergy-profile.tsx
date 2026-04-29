import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { loadAllergies, saveAllergies } from '../services/allergyStorage';
import type { AllergyCategory, AllergyItem } from '../types/allergy';

const COMMON_ALLERGIES: { name: string; category: AllergyCategory }[] = [
  { name: 'Sulfa drugs', category: 'Medication' },
  { name: 'Codeine', category: 'Ingredient' },
  { name: 'Latex', category: 'Other' },
  { name: 'Diphenhydramine', category: 'Ingredient' },
  { name: 'Naproxen', category: 'Ingredient' },
  { name: 'Amoxicillin', category: 'Medication' },
  { name: 'Aspirin', category: 'Ingredient' },
  { name: 'Ibuprofen', category: 'Ingredient' },
  { name: 'Acetaminophen', category: 'Ingredient' },
];

export default function AllergyProfileScreen() {
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<AllergyCategory>('Ingredient');
  const [searchCommon, setSearchCommon] = useState('');

  useEffect(() => {
    const init = async () => {
      const stored = await loadAllergies();
      setAllergies(stored);
    };

    init();
  }, []);

  const filteredCommon = useMemo(() => {
    return COMMON_ALLERGIES.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchCommon.toLowerCase());

      const alreadyAdded = allergies.some(
        (allergy) => allergy.name.toLowerCase() === item.name.toLowerCase()
      );

      return matchesSearch && !alreadyAdded;
    });
  }, [searchCommon, allergies]);

  const addAllergy = async (name: string, category: AllergyCategory) => {
    const trimmed = name.trim();

    if (!trimmed) {
      Alert.alert('Please enter an allergy name.');
      return;
    }

    const exists = allergies.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      Alert.alert('This allergy is already in your profile.');
      return;
    }

    const newItem: AllergyItem = {
      id: Date.now().toString(),
      name: trimmed,
      category,
    };

    const updated = [newItem, ...allergies];
    setAllergies(updated);
    await saveAllergies(updated);
    setCustomName('');
  };

  const removeAllergy = async (id: string) => {
    const updated = allergies.filter((item) => item.id !== id);
    setAllergies(updated);
    await saveAllergies(updated);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.deviceFrame}>
        <View style={styles.headerRow}>
          <Pressable style={styles.headerIconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>

          <Text style={styles.headerTitle}>Allergy Profile</Text>

          <View style={styles.headerIconButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Why add allergies?</Text>
            <Text style={styles.infoText}>
              We alert you when searching medications that contain ingredients you may
              be allergic to.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Your Allergies ({allergies.length})</Text>

          {allergies.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No allergies on file.</Text>
            </View>
          ) : (
            allergies.map((item) => (
              <View key={item.id} style={styles.allergyRow}>
                <View>
                  <Text style={styles.allergyName}>{item.name}</Text>
                  <Text style={styles.allergyCategory}>{item.category}</Text>
                </View>

                <Pressable onPress={() => removeAllergy(item.id)}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Add Custom Allergy</Text>

          <View style={styles.card}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="Enter allergy name..."
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            <View style={styles.categoryRow}>
              {(['Ingredient', 'Medication', 'Other'] as AllergyCategory[]).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.categoryChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.addButton}
              onPress={() => addAllergy(customName, selectedCategory)}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Common Allergies</Text>

          <View style={styles.card}>
            <TextInput
              value={searchCommon}
              onChangeText={setSearchCommon}
              placeholder="Search common allergies..."
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            {filteredCommon.map((item) => (
              <View key={item.name} style={styles.commonRow}>
                <View>
                  <Text style={styles.commonName}>{item.name}</Text>
                  <Text style={styles.commonCategory}>{item.category}</Text>
                </View>

                <Pressable onPress={() => addAllergy(item.name, item.category)}>
                  <Text style={styles.plusText}>+</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              Important: This allergy information helps reduce risk in your medication
              searches. Always consult your healthcare provider or pharmacist before
              taking any medication.
            </Text>
          </View>
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
  infoCard: {
    backgroundColor: '#eef5ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4b5563',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  allergyRow: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allergyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  allergyCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  removeText: {
    fontSize: 24,
    color: '#ef4444',
    paddingHorizontal: 8,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  categoryChipSelected: {
    backgroundColor: '#dbeafe',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryChipTextSelected: {
    color: '#2563eb',
  },
  addButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  commonRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commonName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  commonCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  plusText: {
    fontSize: 24,
    color: '#2563eb',
    paddingHorizontal: 8,
  },
  noteCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#a16207',
  },
});