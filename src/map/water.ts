import type { WaterBody } from './types';

export const WATER: readonly WaterBody[] = [
  {
    name: 'Port Phillip Bay',
    cells: [
      { col: 2, row: 7 },
      { col: 3, row: 7 },
      { col: 4, row: 7 },
      { col: 5, row: 7 },
      { col: 4, row: 8 },
      { col: 5, row: 8 },
      { col: 6, row: 8 },
      { col: 5, row: 9 },
      { col: 6, row: 9 },
      { col: 7, row: 9 },
      { col: 6, row: 10 },
    ],
    nameCell: { col: 5, row: 8 },
  },
  {
    name: 'Western Port Bay',
    cells: [{ col: 10, row: 10 }],
    nameCell: { col: 10, row: 10 },
  },
];
