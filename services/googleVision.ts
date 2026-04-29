import { searchMedicationsByName } from './openFda';
import type { Medication } from '../types/medication';

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;

type VisionApiResponse = {
  responses?: Array<{
    textAnnotations?: Array<{
      description?: string;
    }>;
    fullTextAnnotation?: {
      text?: string;
    };
    error?: {
      message?: string;
    };
  }>;
};

type ImageSearchResult = {
  ocrText: string;
  matchedTerm: string | null;
  results: Medication[];
};

const STOPWORDS = new Set([
  'tablets',
  'tablet',
  'capsules',
  'capsule',
  'caplets',
  'pain',
  'reliever',
  'fever',
  'reducer',
  'medicine',
  'drug',
  'allergy',
  'antihistamine',
  'children',
  'adult',
  'extra',
  'strength',
  'hcl',
  'usp',
  'mg',
  'ml',
]);

function sanitizeCandidate(value: string): string {
  return value
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s?(mg|mcg|g|ml)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchCandidates(ocrText: string): string[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => sanitizeCandidate(line))
    .filter(Boolean);

  const seen = new Set<string>();
  const candidates: string[] = [];

  const push = (value: string) => {
    const cleaned = sanitizeCandidate(value);
    const lower = cleaned.toLowerCase();

    if (!cleaned) return;
    if (seen.has(lower)) return;
    if (STOPWORDS.has(lower)) return;
    if (/^\d+$/.test(cleaned)) return;

    seen.add(lower);
    candidates.push(cleaned);
  };

  for (const line of lines.slice(0, 8)) {
    push(line);

    for (const word of line.split(' ')) {
      const normalized = word.toLowerCase();
      if (word.length >= 4 && !STOPWORDS.has(normalized)) {
        push(word);
      }
    }
  }

  return candidates;
}

export async function extractTextFromImageBase64(base64: string): Promise<string> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_VISION_API_KEY');
  }

  const response = await fetch(`${VISION_URL}?key=${GOOGLE_VISION_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: {
            content: base64,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision API failed with status ${response.status}`);
  }

  const data: VisionApiResponse = await response.json();
  const first = data.responses?.[0];

  if (first?.error?.message) {
    throw new Error(first.error.message);
  }

  return (
    first?.fullTextAnnotation?.text ||
    first?.textAnnotations?.[0]?.description ||
    ''
  ).trim();
}

export async function identifyMedicationByImage(
  base64: string
): Promise<ImageSearchResult> {
  const ocrText = await extractTextFromImageBase64(base64);

  if (!ocrText) {
    return {
      ocrText: '',
      matchedTerm: null,
      results: [],
    };
  }

  const candidates = buildSearchCandidates(ocrText);

  for (const candidate of candidates) {
    const results = await searchMedicationsByName(candidate);
    if (results.length > 0) {
      return {
        ocrText,
        matchedTerm: candidate,
        results,
      };
    }
  }

  return {
    ocrText,
    matchedTerm: null,
    results: [],
  };
}