import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collapseWhitespace,
  toTitleCase,
  normalizeCountry,
  normalizeState,
  normalizePostalCode,
  normalizePhone,
  normalizeAddressLines,
  normalizeAddress,
} from './formatAddress';

test('collapseWhitespace trims and collapses interior runs', () => {
  assert.equal(collapseWhitespace('  acme   supply co  '), 'acme supply co');
  assert.equal(collapseWhitespace('\t\nfoo\n\tbar\t'), 'foo bar');
  assert.equal(collapseWhitespace(''), '');
  assert.equal(collapseWhitespace('   '), '');
});

test('toTitleCase capitalizes each word without losing hyphen/apostrophe boundaries', () => {
  assert.equal(toTitleCase("MARY-JANE O'CONNOR"), "Mary-Jane O'Connor");
  assert.equal(toTitleCase('john smith'), 'John Smith');
  assert.equal(toTitleCase('  acme   supply co  '), 'Acme Supply Co');
  assert.equal(toTitleCase(''), '');
});

test('normalizeCountry maps known aliases case- and punctuation-insensitively', () => {
  assert.equal(normalizeCountry('usa'), 'US');
  assert.equal(normalizeCountry('U.S.A.'), 'US');
  assert.equal(normalizeCountry('United States of America'), 'US');
  assert.equal(normalizeCountry('uk'), 'GB');
  assert.equal(normalizeCountry('Great Britain'), 'GB');
  assert.equal(normalizeCountry('canada'), 'CA');
  assert.equal(normalizeCountry(''), '');
});

test('normalizeCountry passes unrecognized input through uppercased', () => {
  assert.equal(normalizeCountry('mexico'), 'MEXICO');
  assert.equal(normalizeCountry('  fr  '), 'FR');
});

test('normalizeState uppercases and strips periods', () => {
  assert.equal(normalizeState('il'), 'IL');
  assert.equal(normalizeState('  wa  '), 'WA');
  assert.equal(normalizeState('D.C.'), 'DC');
  assert.equal(normalizeState(''), '');
});

test('normalizeState maps full US state, DC, and territory names to their code', () => {
  assert.equal(normalizeState('illinois'), 'IL');
  assert.equal(normalizeState('Illinois'), 'IL');
  assert.equal(normalizeState('  new york  '), 'NY');
  assert.equal(normalizeState('NEW HAMPSHIRE'), 'NH');
  assert.equal(normalizeState('District of Columbia'), 'DC');
  assert.equal(normalizeState('puerto rico'), 'PR');
  assert.equal(normalizeState('virgin islands'), 'VI');
});

test('normalizeState passes unrecognized names through uppercased', () => {
  assert.equal(normalizeState('ontario'), 'ONTARIO');
});

test('normalizePostalCode formats US ZIP and ZIP+4', () => {
  assert.equal(normalizePostalCode('62701', 'US'), '62701');
  assert.equal(normalizePostalCode('627010007', 'US'), '62701-0007');
  assert.equal(normalizePostalCode('62701-0007', 'US'), '62701-0007');
  assert.equal(normalizePostalCode('62701 0007', 'US'), '62701-0007');
});

test('normalizePostalCode leaves malformed US codes as trimmed uppercase text', () => {
  assert.equal(normalizePostalCode('6270', 'US'), '6270');
  assert.equal(normalizePostalCode('', 'US'), '');
});

test('normalizePostalCode leaves non-US codes untouched aside from trim/case', () => {
  assert.equal(normalizePostalCode('sw1a 1aa', 'GB'), 'SW1A 1AA');
  assert.equal(normalizePostalCode('  k1a0b1  ', 'CA'), 'K1A0B1');
});

test('normalizePhone formats 10-digit North American numbers', () => {
  assert.equal(normalizePhone('555.123.4567'), '(555) 123-4567');
  assert.equal(normalizePhone('(555) 123 4567'), '(555) 123-4567');
  assert.equal(normalizePhone('5551234567'), '(555) 123-4567');
});

test('normalizePhone drops a leading country digit of 1 on 11-digit numbers', () => {
  assert.equal(normalizePhone('1-555-123-4567'), '(555) 123-4567');
  assert.equal(normalizePhone('15551234567'), '(555) 123-4567');
});

test('normalizePhone returns digits only for shapes it cannot confidently format', () => {
  assert.equal(normalizePhone('+44 20 7946 0958'), '442079460958');
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone('21-555-123-4567'), '215551234567');
});

test('normalizeAddressLines splits a trailing unit designator off of line1 when line2 is empty', () => {
  assert.deepEqual(normalizeAddressLines('123 Main St Apt 4B', ''), { line1: '123 Main St', line2: 'Apt 4B' });
  assert.deepEqual(normalizeAddressLines('123 Main St, Suite 200', ''), { line1: '123 Main St', line2: 'Ste 200' });
  assert.deepEqual(normalizeAddressLines('123 Main St Ste. 200', ''), { line1: '123 Main St', line2: 'Ste 200' });
  assert.deepEqual(normalizeAddressLines('123 Main St #4B', ''), { line1: '123 Main St', line2: '#4B' });
  assert.deepEqual(normalizeAddressLines('123 Main St Unit 12', ''), { line1: '123 Main St', line2: 'Unit 12' });
});

test('normalizeAddressLines leaves line1 alone when line2 already carries the unit', () => {
  assert.deepEqual(normalizeAddressLines('123 Main St', 'apt 4b'), { line1: '123 Main St', line2: 'apt 4b' });
});

test('normalizeAddressLines does not mistake a street name for a unit designator', () => {
  assert.deepEqual(normalizeAddressLines('4500 Units Dr', ''), { line1: '4500 Units Dr', line2: '' });
});

test('normalizeAddressLines canonicalizes PO box spellings and drops any separate line2', () => {
  assert.deepEqual(normalizeAddressLines('PO Box 123', ''), { line1: 'PO Box 123', line2: '' });
  assert.deepEqual(normalizeAddressLines('P.O. Box 123', ''), { line1: 'PO Box 123', line2: '' });
  assert.deepEqual(normalizeAddressLines('post office box 123', ''), { line1: 'PO Box 123', line2: '' });
  assert.deepEqual(normalizeAddressLines('p o box 4b', ''), { line1: 'PO Box 4B', line2: '' });
});

test('normalizeAddress fills every field with a string even when raw input is empty', () => {
  const result = normalizeAddress({});
  assert.deepEqual(result, {
    name: '',
    company: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });
});

test('normalizeAddress composes the field-level normalizers, including country-aware postal codes', () => {
  const result = normalizeAddress({
    name: "MARY-JANE O'CONNOR",
    company: '  acme   supply co  ',
    line1: '  123 Main St  ',
    city: 'Springfield',
    state: 'il',
    postalCode: '627010007',
    country: 'United States of America',
    phone: '555.123.4567',
  });
  assert.deepEqual(result, {
    name: "Mary-Jane O'Connor",
    company: 'Acme Supply Co',
    line1: '123 Main St',
    line2: '',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701-0007',
    country: 'US',
    phone: '(555) 123-4567',
  });
});
