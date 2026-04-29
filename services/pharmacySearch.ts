import type { Pharmacy } from '../types/pharmacy';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

type PlaceLike = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
};

type NearbySearchResponse = {
  places?: PlaceLike[];
};

type TextSearchResponse = {
  places?: PlaceLike[];
};

type PlaceDetailsResponse = {
  nationalPhoneNumber?: string;
  regularOpeningHours?: {
    openNow?: boolean;
  };
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function simulatedStock(index: number): 'In Stock' | 'Limited' | 'Unknown' {
  if (index % 3 === 0) return 'In Stock';
  if (index % 3 === 1) return 'Limited';
  return 'Unknown';
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function detectPharmacyChain(pharmacyName: string):
  | 'cvs'
  | 'walgreens'
  | 'riteaid'
  | 'walmart'
  | 'target'
  | 'costco'
  | 'default' {
  const lower = pharmacyName.toLowerCase();

  if (lower.includes('cvs')) return 'cvs';
  if (lower.includes('walgreens')) return 'walgreens';
  if (lower.includes('rite aid')) return 'riteaid';
  if (lower.includes('walmart')) return 'walmart';
  if (lower.includes('target')) return 'target';
  if (lower.includes('costco')) return 'costco';

  return 'default';
}

function getBasePriceForMedication(
  medicationName: string,
  chain: ReturnType<typeof detectPharmacyChain>
): number {
  const med = medicationName.toLowerCase();

  const priceTable = {
    advil: {
      cvs: 12.49,
      walgreens: 11.99,
      riteaid: 12.79,
      walmart: 9.88,
      target: 10.99,
      costco: 8.99,
      default: 11.49,
    },
    ibuprofen: {
      cvs: 10.99,
      walgreens: 10.49,
      riteaid: 11.29,
      walmart: 8.94,
      target: 9.79,
      costco: 8.49,
      default: 9.99,
    },
    tylenol: {
      cvs: 11.99,
      walgreens: 11.49,
      riteaid: 12.29,
      walmart: 9.47,
      target: 10.79,
      costco: 8.79,
      default: 10.99,
    },
    acetaminophen: {
      cvs: 10.49,
      walgreens: 9.99,
      riteaid: 10.79,
      walmart: 8.47,
      target: 9.49,
      costco: 7.99,
      default: 9.49,
    },
    claritin: {
      cvs: 24.99,
      walgreens: 23.49,
      riteaid: 25.29,
      walmart: 19.88,
      target: 21.99,
      costco: 18.99,
      default: 22.99,
    },
    loratadine: {
      cvs: 18.99,
      walgreens: 17.99,
      riteaid: 19.49,
      walmart: 13.88,
      target: 15.99,
      costco: 12.99,
      default: 16.99,
    },
    benadryl: {
      cvs: 10.99,
      walgreens: 10.49,
      riteaid: 11.29,
      walmart: 8.94,
      target: 9.99,
      costco: 8.49,
      default: 9.99,
    },
    diphenhydramine: {
      cvs: 9.99,
      walgreens: 9.49,
      riteaid: 10.29,
      walmart: 7.98,
      target: 8.99,
      costco: 7.79,
      default: 8.99,
    },
    default: {
      cvs: 14.49,
      walgreens: 13.99,
      riteaid: 14.79,
      walmart: 11.98,
      target: 12.99,
      costco: 10.99,
      default: 12.49,
    },
  };

  if (med.includes('advil')) return priceTable.advil[chain];
  if (med.includes('ibuprofen')) return priceTable.ibuprofen[chain];
  if (med.includes('tylenol')) return priceTable.tylenol[chain];
  if (med.includes('acetaminophen')) return priceTable.acetaminophen[chain];
  if (med.includes('claritin')) return priceTable.claritin[chain];
  if (med.includes('loratadine')) return priceTable.loratadine[chain];
  if (med.includes('benadryl')) return priceTable.benadryl[chain];
  if (med.includes('diphenhydramine')) return priceTable.diphenhydramine[chain];

  return priceTable.default[chain];
}

function simulatedPrice(medicationName: string, pharmacyName: string): string {
  const chain = detectPharmacyChain(pharmacyName);
  const basePrice = getBasePriceForMedication(medicationName, chain);

  const variationOptions = [-0.5, -0.25, 0, 0.25, 0.5];
  const hash = hashString(`${medicationName}-${pharmacyName}`);
  const variation = variationOptions[hash % variationOptions.length];

  const price = Math.max(4.99, basePrice + variation);

  return `$${price.toFixed(2)} for ${medicationName}`;
}

async function getPlaceDetails(placeId: string) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY ?? '',
        'X-Goog-FieldMask':
          'nationalPhoneNumber,regularOpeningHours.openNow',
      },
    }
  );

  if (!response.ok) {
    return { phone: null, openNow: null };
  }

  const data: PlaceDetailsResponse = await response.json();

  return {
    phone: data.nationalPhoneNumber ?? null,
    openNow: data.regularOpeningHours?.openNow ?? null,
  };
}

async function buildPharmacy(
  place: PlaceLike,
  index: number,
  medicationName: string,
  origin?: { latitude: number; longitude: number }
): Promise<Pharmacy> {
  const lat = place.location?.latitude ?? 0;
  const lng = place.location?.longitude ?? 0;

  const details = place.id
    ? await getPlaceDetails(place.id)
    : { phone: null, openNow: null };

  return {
    id: place.id ?? `${index}`,
    name: place.displayName?.text ?? 'Unknown Pharmacy',
    address: place.formattedAddress ?? 'Address unavailable',
    latitude: lat,
    longitude: lng,
    distanceMiles:
      origin && lat && lng
        ? distanceMiles(origin.latitude, origin.longitude, lat, lng)
        : null,
    openNow: details.openNow,
    phone: details.phone,
    mapsUrl: place.googleMapsUri ?? null,
    stockStatus: simulatedStock(index),
    priceLabel: simulatedPrice(
      medicationName,
      place.displayName?.text ?? 'Unknown Pharmacy'
    ),              
  };
}

export async function searchNearbyPharmacies(
  medicationName: string,
  latitude: number,
  longitude: number
): Promise<Pharmacy[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  }

  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri',
      },
      body: JSON.stringify({
        includedTypes: ['pharmacy'],
        maxResultCount: 10,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: 5000,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Nearby search failed: ${response.status}`);
  }

  const data: NearbySearchResponse = await response.json();
  const places = data.places ?? [];

  return Promise.all(
    places.map((place, index) =>
      buildPharmacy(place, index, medicationName, { latitude, longitude })
    )
  );
}

export async function searchNearbyPharmaciesByText(
  medicationName: string,
  locationText: string
): Promise<Pharmacy[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
  }

  const trimmed = locationText.trim();

  if (!trimmed) {
    throw new Error('Please enter a ZIP code or city.');
  }

  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: `pharmacy near ${trimmed}`,
        maxResultCount: 10,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Text search failed: ${response.status}`);
  }

  const data: TextSearchResponse = await response.json();
  const places = data.places ?? [];

  return Promise.all(
    places.map((place, index) =>
      buildPharmacy(place, index, medicationName)
    )
  );
}