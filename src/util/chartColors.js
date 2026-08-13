// Categorical palette for charts with many distinct series/slices (usage by
// user, instance, pool label, ...). Based on the Okabe-Ito colorblind-safe
// palette, with the orange and near-black swapped for the app's own brand
// orange/secondary so charts still read as "on brand", and extended with two
// additional colors (from Paul Tol's muted palette) that stay visually
// distinct from the rest for a couple of extra categories.
export const CHART_COLORS = [
  '#f39619', // brand orange
  '#0072b2', // blue
  '#009e73', // bluish green
  '#d55e00', // vermillion
  '#cc79a7', // reddish purple
  '#56b4e9', // sky blue
  '#f0e442', // yellow
  '#494d55', // brand secondary (dark slate)
  '#882255', // wine
  '#999933', // olive
];

export const withAlpha = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
