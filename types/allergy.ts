export type AllergyCategory = 'Ingredient' | 'Medication' | 'Other';

export type AllergyItem = {
  id: string;
  name: string;
  category: AllergyCategory;
};