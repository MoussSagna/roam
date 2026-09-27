const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * The geohash of a point (standard base-32 encoding): Ticketmaster's `geoPoint`, which replaces the deprecated
 * `latlong` parameter. Precision 9 is a cell of about 5 m — far below any search radius.
 */
export function geohash(latitude: number, longitude: number, precision = 9): string {
  const ranges = { lat: [-90, 90], lon: [-180, 180] };
  let hash = '';
  let bits = 0;
  let value = 0;
  let evenBit = true;
  while (hash.length < precision) {
    const range = evenBit ? ranges.lon : ranges.lat;
    const coordinate = evenBit ? longitude : latitude;
    const middle = (range[0] + range[1]) / 2;
    if (coordinate >= middle) {
      value = value * 2 + 1;
      range[0] = middle;
    } else {
      value *= 2;
      range[1] = middle;
    }
    evenBit = !evenBit;
    if (++bits === 5) {
      hash += BASE32[value];
      bits = 0;
      value = 0;
    }
  }
  return hash;
}
