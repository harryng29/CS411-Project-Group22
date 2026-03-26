import type { Medication } from '../types/medication';

let selectedMedication: Medication | null = null;

export function setSelectedMedication(medication: Medication) {
  selectedMedication = medication;
}

export function getSelectedMedication() {
  return selectedMedication;
}