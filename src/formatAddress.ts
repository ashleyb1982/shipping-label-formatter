import { RawAddress, NormalizedAddress } from './types';

// Aliases seen in the wild: spreadsheet exports, checkout forms, pasted
// emails. Keyed by a lowercased, period-stripped version of the input.
const COUNTRY_ALIASES: Record<string, string> = {
  us: 'US',
  usa: 'US',
  'united states': 'US',
  'united states of america': 'US',
  uk: 'GB',
  gb: 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  ca: 'CA',
  canada: 'CA',
};

export function collapseWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

// Title-cases on word boundaries, treating hyphens and apostrophes as part
// of a word so "MARY-JANE O'CONNOR" becomes "Mary-Jane O'Connor" rather than
// losing the internal capitals.
export function toTitleCase(input: string): string {
  const collapsed = collapseWhitespace(input);
  if (collapsed.length === 0) {
    return collapsed;
  }
  return collapsed
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_match, boundary: string, letter: string) => boundary + letter.toUpperCase());
}

export function normalizeCountry(input: string): string {
  const collapsed = collapseWhitespace(input);
  if (collapsed.length === 0) {
    return '';
  }
  const key = collapsed.toLowerCase().replace(/\./g, '');
  return COUNTRY_ALIASES[key] ?? collapsed.toUpperCase();
}

// Full US state, DC, and territory names as they'd be typed on a form,
// keyed by a lowercased, period-stripped version of the name. Abbreviations
// need no lookup: they're already the code once uppercased.
const US_STATE_NAMES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
  'puerto rico': 'PR',
  'american samoa': 'AS',
  guam: 'GU',
  'northern mariana islands': 'MP',
  'us virgin islands': 'VI',
  'virgin islands': 'VI',
};

export function normalizeState(input: string): string {
  const collapsed = collapseWhitespace(input);
  if (collapsed.length === 0) {
    return '';
  }
  const key = collapsed.toLowerCase().replace(/\./g, '');
  return US_STATE_NAMES[key] ?? collapsed.toUpperCase().replace(/\./g, '');
}

// US ZIP and ZIP+4 get their canonical dashed form. Anything else (postal
// codes from other countries) is left as trimmed, uppercased text, since
// formats vary too widely to guess at.
export function normalizePostalCode(input: string, country: string): string {
  const collapsed = collapseWhitespace(input);
  if (collapsed.length === 0) {
    return '';
  }
  if (country === 'US') {
    const digits = collapsed.replace(/[^0-9]/g, '');
    if (digits.length === 9) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    if (digits.length === 5) {
      return digits;
    }
  }
  return collapsed.toUpperCase();
}

// Formats 10-digit North American numbers as (XXX) XXX-XXXX. A leading
// country digit of 1 on an 11-digit number is dropped before formatting.
// Anything else is returned as digits only, since we can't safely guess
// the format of an international number.
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const rest = digits.slice(1);
    return `(${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
  }
  return digits;
}

// Turns whatever a form, spreadsheet, or pasted email produced into a
// consistent shape. Every field is optional on input and guaranteed to be
// a string (possibly empty) on output, so callers never have to branch on
// undefined before printing a label.
export function normalizeAddress(raw: RawAddress): NormalizedAddress {
  const country = normalizeCountry(raw.country ?? '');
  return {
    name: toTitleCase(raw.name ?? ''),
    company: toTitleCase(raw.company ?? ''),
    line1: collapseWhitespace(raw.line1 ?? ''),
    line2: collapseWhitespace(raw.line2 ?? ''),
    city: collapseWhitespace(raw.city ?? ''),
    state: normalizeState(raw.state ?? ''),
    postalCode: normalizePostalCode(raw.postalCode ?? '', country),
    country,
    phone: normalizePhone(raw.phone ?? ''),
  };
}
