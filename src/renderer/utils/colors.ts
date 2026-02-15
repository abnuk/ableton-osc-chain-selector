/**
 * Ableton Live color palette (color_index → hex).
 * These are the 70 standard Ableton clip/chain colors.
 */
const ABLETON_COLORS: string[] = [
  '#FF94A6', '#FF3636', '#CC0000', '#5B0000', '#FF8C00',
  '#FF5400', '#D86A00', '#6B3300', '#FFFE00', '#EDFF00',
  '#CCFF00', '#5BCC00', '#00FF00', '#00FF5B', '#00CC00',
  '#005B00', '#00FFFF', '#00D8FF', '#00A1D8', '#005B6B',
  '#0000FF', '#0056FF', '#0000CC', '#00005B', '#FF00FF',
  '#FF00A1', '#D800CC', '#5B005B', '#FF94A6', '#FF6B6B',
  '#D86B6B', '#A14F4F', '#FFB68C', '#FFA14F', '#D8834F',
  '#A16B4F', '#FFFF6B', '#EDFF4F', '#CCFF4F', '#A1CC4F',
  '#6BFF4F', '#4FFFB6', '#4FCC6B', '#4FA14F', '#6BFFED',
  '#4FD8ED', '#4FA1CC', '#4F6BA1', '#6B6BFF', '#4F4FFF',
  '#4F4FCC', '#4F4FA1', '#FF6BFF', '#FF4FD8', '#CC4FA1',
  '#A14F6B', '#BFBFBF', '#A1A1A1', '#6B6B6B', '#4F4F4F',
  '#3C3C3C', '#282828', '#191919', '#EBEBEB', '#DBDBDB',
  '#C4C4C4', '#A1A1A1', '#808080', '#606060', '#404040',
];

export function abletonColorFromIndex(index: number): string {
  if (index >= 0 && index < ABLETON_COLORS.length) {
    return ABLETON_COLORS[index];
  }
  return '#808080';
}
