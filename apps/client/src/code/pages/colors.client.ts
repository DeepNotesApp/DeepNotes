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
      'blue',
      'purple',
      'pink',
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
      blue: '#1135B6',
      purple: '#5E00D6',
      pink: '#9C00B6',
    },

    arrows: {
      grey: '#858585',
      red: '#B80909',
      brown: '#81370E',
      orange: '#CC6200',
      yellow: '#C19700',
      green: '#13A906',
      teal: '#00B1BC',
      blue: '#0739EB',
      purple: '#6F16DF',
      pink: '#A30FBB',
    },

    notes: {
      grey: '#2F2F2F',
      red: '#610000',
      brown: '#542D11',
      orange: '#8A4B00',
      yellow: '#756200',
      green: '#025302',
      teal: '#00524D',
      blue: '#001873',
      purple: '#330075',
      pink: '#660062',
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
