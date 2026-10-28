// Horizon tags are told apart by their label, not by colour: green and red
// mean direction only, and amber means stale data.

import type { HorizonTagId } from '../../types/discover';

export const TAG_ORDER: HorizonTagId[] = ['long_term', 'swing', 'short_term', 'intraday'];

export const TAG_LABELS: Record<HorizonTagId, string> = {
  long_term: 'Long term',
  swing: 'Swing',
  short_term: 'Short term',
  intraday: 'Intraday',
};
