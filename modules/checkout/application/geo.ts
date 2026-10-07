/**
 * Turns a Nominatim (OpenStreetMap) search hit into the pieces the address form fills.
 * Kept pure so the mapping is easy to prove without the network.
 */
export type GeoAddressSuggestion = {
  label: string;
  line1: string;
  city: string;
  region: string | null;
  postalCode: string | null;
};

type NominatimAddress = {
  road?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  county?: string;
  postcode?: string;
};

export function mapNominatimResult(result: {
  display_name?: string;
  address?: NominatimAddress;
}): GeoAddressSuggestion {
  const address = result.address ?? {};
  const road = [address.road, address.house_number].filter(Boolean).join(" ");
  const line1 = road || address.neighbourhood || address.suburb || result.display_name?.split(",")[0] || "";
  const city = address.city ?? address.town ?? address.village ?? address.county ?? "";

  return {
    label: result.display_name ?? line1,
    line1,
    city,
    region: address.state ?? null,
    postalCode: address.postcode ?? null,
  };
}
