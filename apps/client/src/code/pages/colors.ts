import { once } from 'lodash';

export const colorNames = once(
  () =>
    [
      'grey',
      'red',
      'brown',
      'orange',
      'yellow',
      'green',
      'teal',
      'sky',
      'blue',
      'violet',
      'purple',
      'pink', // fuchsia
    ] as const,
);

export type ColorName = ReturnType<typeof colorNames>[number];

export const colorMap = once(
  (): Record<string, Record<ColorName, string>> => ({
    ui: {
      grey: '#616161',
      red: '#AA0E0E',
      brown: '#7E3207',
      orange: '#AF5400',
      yellow: '#C29800',
      green: '#18990D',
      teal: '#00959E',
      sky: '#0284C7',
      blue: '#1135B6',
      violet: '#5E00D6',
      purple: '#7E22CE',
      pink: '#9C00B6',
    },

    arrows: {
      grey: '#858585',
      red: '#B80909',
      brown: '#81370E',
      orange: '#CC6200',
      yellow: '#C19700',
      green: '#13A906',
      teal: '#14B8A6',
      sky: '#0EA5E9',
      blue: '#1D4ED8',
      violet: '#7F2DFF',
      purple: '#9C29FF',
      pink: '#C91CDA',
    },

    notes: {
      grey: '#2F2F2F',
      red: '#6C1313',
      brown: '#542D11',
      orange: '#7B2F07',
      yellow: '#776109',
      green: '#0E5428',
      teal: '#08564E',
      sky: '#065072',
      blue: '#102C7A',
      violet: '#3E177A',
      purple: '#4B1972',
      pink: '#61116B',
    },
  }),
);

export function colorNameToColorHex(
  type: 'ui' | 'arrows' | 'notes',
  colorName: any,
): string {
  return (colorMap()[type] as any)[colorName] ?? colorMap()[type].grey;
}

export function colorHexToColorName(
  type: 'ui' | 'arrows' | 'notes',
  colorHex: any,
): ColorName {
  const colorName = Object.keys(colorMap()[type]).find(
    (colorName) =>
      (colorMap()[type] as any)[colorName].toLowerCase() ===
      colorHex?.toLowerCase(),
  );

  if (colorName != null) {
    return colorName as ColorName;
  }

  return 'grey';
}
