import type { Medication } from '../types/medication';

const BASE_URL = 'https://api.fda.gov/drug/label.json';

type OpenFdaRecord = {
  id?: string;
  set_id?: string;
  effective_time?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
  };
  active_ingredient?: string[];
  indications_and_usage?: string[];
  purpose?: string[];
  dosage_and_administration?: string[];
  warnings?: string[];
  warnings_and_cautions?: string[];
  adverse_reactions?: string[];
};

function getFirstBlock(values?: string[]): string {
  if (!values || values.length === 0) return 'Not available';
  return values[0];
}

function cleanSimpleText(raw?: string): string {
  if (!raw) return 'Not available';

  return raw
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanLabelText(raw?: string): string {
  if (!raw) return 'Not available';

  let text = raw
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    // remove FDA section headers like:
    // "1 INDICATIONS AND USAGE "
    // "2 DOSAGE AND ADMINISTRATION "
    // without eating the next real word
    .replace(/^\d+\s+(?:[A-Z]+(?:\s+[A-Z/&,-]+)+)\s+/, '')
    // remove bracket references like [see Warnings and Precautions]
    .replace(/\[(?:see|See)[^\]]*\]/g, '')
    // remove references like (2.1) or ( 2.1 )
    .replace(/\(\s*\d+(?:\.\d+)*\s*\)/g, '')
    // cut off huge table dumps / clinical-trial dump sections
    .replace(/Table\s+\d+[:.][\s\S]*/i, '')
    .replace(/Clinical Trials Experience[\s\S]*/i, '')
    // clean spaces before punctuation
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const s = sentence.replace(/\s+/g, ' ').trim();
    if (!s) continue;

    const key = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;

    seen.add(key);
    cleaned.push(s);
  }

  return cleaned.join(' ');
}

function chunkIntoParagraphs(text: string, sentencesPerParagraph = 2): string {
  const sentences = text.match(/[^.!?]+[.!?]?/g) ?? [text];
  const paragraphs: string[] = [];

  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(i, i + sentencesPerParagraph).join(' ').trim());
  }

  return paragraphs.join('\n\n');
}

function formatWarningsText(raw?: string): string {
  const cleaned = cleanLabelText(raw);
  if (cleaned === 'Not available') return cleaned;

  const withSectionBreaks = cleaned
    // put a paragraph break before subsection numbers like 5.1, 5.2, 5.3
    .replace(/\s+(?=\d+\.\d+\s+[A-Z])/g, '\n\n')
    // remove the subsection numbers themselves
    .replace(/\b\d+\.\d+\s+/g, '')
    .trim();

  // if subsection breaks were found, keep them
  if (withSectionBreaks.includes('\n\n')) {
    return withSectionBreaks;
  }

  // fallback: split into small paragraphs every 2 sentences
  return chunkIntoParagraphs(withSectionBreaks, 2);
}

function summarizeLabelText(raw?: string, maxSentences = 4): string {
  const cleaned = cleanLabelText(raw);
  if (cleaned === 'Not available') return cleaned;

  const sentences = cleaned.match(/[^.!?]+[.!?]?/g) ?? [cleaned];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

function formatDate(raw?: string): string {
  if (!raw || raw.length !== 8) return 'Not available';
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function toMedication(record: OpenFdaRecord, index: number): Medication {
  const brandName = record.openfda?.brand_name?.[0]?.trim() || '';
  const genericName = record.openfda?.generic_name?.[0]?.trim() || 'Not available';

  return {
    id: record.id || record.set_id || `${brandName || genericName}-${index}`,
    name: brandName || genericName || 'Unknown medication',
    genericName,
    activeIngredient: cleanSimpleText(getFirstBlock(record.active_ingredient)),
    uses: cleanLabelText(getFirstBlock(record.indications_and_usage ?? record.purpose)),
    dosage: cleanLabelText(getFirstBlock(record.dosage_and_administration)),
    warnings: formatWarningsText(getFirstBlock(record.warnings ?? record.warnings_and_cautions)),
    sideEffects: chunkIntoParagraphs(
      cleanLabelText(getFirstBlock(record.adverse_reactions)),
      2
    ),
    source: 'OpenFDA Drug Label API',
    lastUpdated: formatDate(record.effective_time),
  };
}

async function searchByField(
  field: 'openfda.brand_name' | 'openfda.generic_name',
  term: string
): Promise<Medication[]> {
  const query = encodeURIComponent(`${field}:"${term}"`);
  const url = `${BASE_URL}?search=${query}&limit=10`;

  const response = await fetch(url);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`OpenFDA request failed with status ${response.status}`);
  }

  const data = await response.json();
  const results: OpenFdaRecord[] = data.results ?? [];

  return results.map((item, index) => toMedication(item, index));
}

export async function searchMedicationsByName(term: string): Promise<Medication[]> {
  const cleanTerm = term.trim();

  if (!cleanTerm) {
    return [];
  }

  const [brandMatches, genericMatches] = await Promise.all([
    searchByField('openfda.brand_name', cleanTerm),
    searchByField('openfda.generic_name', cleanTerm),
  ]);

  const merged = [...brandMatches, ...genericMatches];
  const seen = new Set<string>();

  return merged.filter((item) => {
    const key = `${item.name}|${item.genericName}|${item.activeIngredient}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}