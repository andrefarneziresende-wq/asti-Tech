const PLACES_API = "https://places.googleapis.com/v1";

function apiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY não configurada.");
  return key;
}

export interface PlaceResult {
  id: string;
  displayName: string;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  types: string[];
  rating?: number;
  userRatingCount?: number;
  photoNames: string[];
}

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  photos?: { name: string }[];
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
  "nextPageToken",
].join(",");

/**
 * Busca lugares (comércios/negócios) por texto livre, ex: "restaurantes em
 * Pirituba, São Paulo". Usa a API nova do Google Places (Text Search).
 */
export async function searchPlacesByText(
  query: string,
  pageToken?: string
): Promise<{ places: PlaceResult[]; nextPageToken?: string }> {
  const res = await fetch(`${PLACES_API}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "pt-BR",
      regionCode: "BR",
      ...(pageToken ? { pageToken } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar no Google Places (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string };

  const places: PlaceResult[] = (data.places ?? []).map((p) => ({
    id: p.id,
    displayName: p.displayName?.text ?? "Negócio sem nome identificado",
    formattedAddress: p.formattedAddress,
    nationalPhoneNumber: p.nationalPhoneNumber,
    websiteUri: p.websiteUri,
    types: p.types ?? [],
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    photoNames: (p.photos ?? []).map((photo) => photo.name),
  }));

  return { places, nextPageToken: data.nextPageToken };
}

/**
 * Resolve o nome de uma foto (ex: "places/xxx/photos/yyy") pra uma URL de
 * imagem de verdade, hospedada pelo Google, que pode ser usada diretamente
 * (ex: como source de visão da Claude) sem precisar da chave da API.
 */
export async function resolvePlacePhotoUrl(photoName: string, maxWidthPx = 800): Promise<string | null> {
  const res = await fetch(
    `${PLACES_API}/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${apiKey()}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { photoUri?: string };
  return data.photoUri ?? null;
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Cafeteria",
  bakery: "Padaria",
  bar: "Bar",
  hair_care: "Salão de beleza",
  beauty_salon: "Salão de beleza",
  spa: "Spa/Estética",
  gym: "Academia",
  clothing_store: "Loja de roupas",
  shoe_store: "Loja de calçados",
  furniture_store: "Loja de móveis",
  hardware_store: "Loja de materiais de construção",
  pet_store: "Pet shop",
  car_repair: "Oficina mecânica",
  dentist: "Consultório odontológico",
  doctor: "Consultório médico",
  physiotherapist: "Fisioterapia",
  veterinary_care: "Clínica veterinária",
  real_estate_agency: "Imobiliária",
  lawyer: "Escritório de advocacia",
  accounting: "Escritório de contabilidade",
  school: "Escola",
  supermarket: "Mercado",
  convenience_store: "Loja de conveniência",
  electrician: "Serviços elétricos",
  plumber: "Serviços de encanamento",
};

/** Traduz os "types" do Google Places pro primeiro rótulo reconhecível em português, com fallback pro tipo bruto. */
export function segmentFromTypes(types: string[]): string | undefined {
  for (const type of types) {
    if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  }
  return types[0]?.replace(/_/g, " ");
}
