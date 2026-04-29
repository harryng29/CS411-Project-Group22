import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AllergyItem } from '../types/allergy';

const ALLERGY_KEY = 'medtrack_guest_allergies';

export async function loadAllergies(): Promise<AllergyItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ALLERGY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load allergies:', error);
    return [];
  }
}

export async function saveAllergies(allergies: AllergyItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ALLERGY_KEY, JSON.stringify(allergies));
  } catch (error) {
    console.error('Failed to save allergies:', error);
  }
}

export async function clearAllergies(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ALLERGY_KEY);
  } catch (error) {
    console.error('Failed to clear allergies:', error);
  }
}