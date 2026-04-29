import type { AllergyItem } from '../types/allergy';

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

export function medicationToIngredientList(
  activeIngredient?: string
): string[] {
  if (!activeIngredient || activeIngredient === 'Not available') {
    return [];
  }

  return activeIngredient
    .split(/,|;|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function findAllergyConflicts(
  activeIngredients: string[],
  allergies: AllergyItem[]
): string[] {
  const normalizedAllergies = allergies.map((item) => normalize(item.name));

  return activeIngredients.filter((ingredient) => {
    const ing = normalize(ingredient);

    return normalizedAllergies.some((allergy) => {
      return ing === allergy || ing.includes(allergy) || allergy.includes(ing);
    });
  });
}