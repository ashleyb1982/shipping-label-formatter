# shipping-label-formatter

Shipping addresses collected from checkout forms, spreadsheet imports, and
pasted emails are never consistent. Some arrive in ALL CAPS, some have
double spaces, some spell out "United States of America" and others write
"USA", phone numbers show up as `555.123.4567` or `(555) 123 4567`, and ZIP
codes come with or without the trailing four digits. Printing a label or
handing this data to a carrier API on top of that mess produces ugly or
outright invalid labels.

This library takes that raw input and turns it into one consistent, typed
shape. Every normalization function is pure: same input, same output, no
hidden state, nothing mutated. That makes each one trivial to unit test and
safe to compose.

## Usage

```ts
import { normalizeAddress } from './src';

const raw = {
  name: 'MARY-JANE O\'CONNOR',
  company: '  acme   supply co  ',
  line1: '123 Main St',
  city: 'Springfield',
  state: 'il',
  postalCode: '627010007',
  country: 'United States of America',
  phone: '555.123.4567',
};

const label = normalizeAddress(raw);

// {
//   name: "Mary-Jane O'Connor",
//   company: 'Acme Supply Co',
//   line1: '123 Main St',
//   line2: '',
//   city: 'Springfield',
//   state: 'IL',
//   postalCode: '62701-0007',
//   country: 'US',
//   phone: '(555) 123-4567',
// }
```

The individual pieces (`toTitleCase`, `normalizeCountry`, `normalizeState`,
`normalizePostalCode`, `normalizePhone`, `normalizeAddressLines`,
`collapseWhitespace`) are exported separately so you can reuse or test them
on their own.

## Design notes

- Missing fields never produce `undefined` on output; every field is at
  least an empty string, so callers don't need null checks before printing.
- Postal code and phone formatting is only applied when the shape of the
  input matches a format we're confident about (US ZIP/ZIP+4, 10 or
  11-digit North American phone numbers). Anything else is passed through
  cleaned up but unchanged, rather than guessed at.
- Street lines (`line1`, `line2`) are whitespace-normalized but not
  title-cased, since address lines mix directionals, unit codes, and
  abbreviations (`NE`, `STE 4B`, `PO BOX`) that a generic title-case pass
  would mangle.
- When `line2` is blank, `normalizeAddress` looks for a trailing unit
  designator on `line1` (`Apt`, `Suite`/`Ste`, `Unit`, `Bldg`, `Fl`, `Rm`,
  `Dept`, or a bare `#`) and moves it to `line2` under a canonical
  abbreviation, e.g. `"123 Main St Suite 200"` becomes `line1: "123 Main
  St"`, `line2: "Ste 200"`. If `line2` is already populated, `line1` is
  left untouched. A `line1` that is nothing but a PO box (`PO Box`,
  `P.O. Box`, `Post Office Box`, any case) is rewritten to the canonical
  `"PO Box <number>"` form. This is exported on its own as
  `normalizeAddressLines`.
- `normalizeState` recognizes full US state, DC, and territory names
  ("Illinois", "District of Columbia", "Puerto Rico") in addition to
  abbreviations, and maps them to the two-letter code. Anything else is
  passed through uppercased rather than guessed at.

## Status

Early skeleton. Each pure function has unit test coverage
(`src/formatAddress.test.ts`, run with `npm test`) but no build step has
been run against a published package yet. See the design notes above for
known gaps: no non-US postal code validation, no label formatter, no CLI.

## License

MIT
