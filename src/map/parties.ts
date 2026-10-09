// The single source of each party's name and colour.
import { textOn } from './map';
import type { Party, Theme } from './types';

export type PartyGroup = 'Labor' | 'Coalition' | 'Others';

export interface PartyInfo {
  code: Party;
  name: string;
  /** What the party counts toward when deciding who governs. */
  group: PartyGroup;
  colour: string;
  textColour: string;
}

/** Each party's colour in each theme. */
export const PARTY_COLOURS: Record<Party, Record<Theme, string>> = {
  ALP: { dark: '#e51f30', light: '#e01f2f' },
  LIB: { dark: '#166ff3', light: '#0a52bd' },
  NAT: { dark: '#0a6b45', light: '#004d33' },
  GRN: { dark: '#2fd866', light: '#10c25b' },
  ONP: { dark: '#ee7017', light: '#c75300' },
  IND: { dark: '#c4cf00', light: '#c4cf00' },
  OTH: { dark: '#a855f7', light: '#a855f7' },
};

export const PARTIES: Record<Party, PartyInfo> = {
  ALP: { code: 'ALP', name: 'Labor', group: 'Labor', colour: partyColour('ALP'), textColour: partyTextColour('ALP') },
  LIB: { code: 'LIB', name: 'Liberal', group: 'Coalition', colour: partyColour('LIB'), textColour: partyTextColour('LIB') },
  NAT: { code: 'NAT', name: 'Nationals', group: 'Coalition', colour: partyColour('NAT'), textColour: partyTextColour('NAT') },
  GRN: { code: 'GRN', name: 'Greens', group: 'Others', colour: partyColour('GRN'), textColour: partyTextColour('GRN') },
  ONP: { code: 'ONP', name: 'One Nation', group: 'Others', colour: partyColour('ONP'), textColour: partyTextColour('ONP') },
  IND: { code: 'IND', name: 'Independent', group: 'Others', colour: partyColour('IND'), textColour: partyTextColour('IND') },
  OTH: { code: 'OTH', name: 'Others', group: 'Others', colour: partyColour('OTH'), textColour: partyTextColour('OTH') },
};

export const TOTAL_SEATS = 88;
export const MAJORITY = 45;

export function partyColour(party: Party, theme: Theme = 'light'): string {
  return PARTY_COLOURS[party][theme];
}

export function partyTextColour(party: Party, theme: Theme = 'light'): string {
  return textOn(partyColour(party, theme));
}
