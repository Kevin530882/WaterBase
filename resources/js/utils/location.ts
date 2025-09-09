export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    village?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  importance?: number;
}

export const formatDisplayName = (result: NominatimResult): string => {
  const { address } = result;
  let parts: string[] = [];

  // Add specific location details
  if (address?.village) parts.push(address.village);
  if (address?.city) parts.push(address.city);
  if (address?.municipality && !address?.city) parts.push(address.municipality);
  if (address?.county && !parts.includes(address.county)) parts.push(address.county);

  // Always include state (region) and country if available
  if (address?.state) parts.push(address.state);
  if (address?.country) parts.push(address.country);

  return parts.length > 0 ? parts.join(', ') : result.display_name;
};