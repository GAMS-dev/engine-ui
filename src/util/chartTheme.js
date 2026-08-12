import { useEffect } from 'react';
import { Chart as ChartJS } from 'chart.js';
import { useSystemTheme } from './theme';

// Chart.js renders to canvas, so it can't pick up CSS variables/dark mode on
// its own. Chart.defaults.color/borderColor are the global fallbacks used by
// tick labels, legend labels, axis titles, and grid lines respectively,
// unless a chart's own options override them - setting them here covers
// every chart in the app without touching each one's options individually.
const useChartTheme = () => {
  const theme = useSystemTheme();

  useEffect(() => {
    const isDark = theme === 'dark';
    ChartJS.defaults.color = isDark ? '#c9cdd3' : '#666666';
    ChartJS.defaults.borderColor = isDark
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(0, 0, 0, 0.1)';
  }, [theme]);

  return theme;
};

export { useChartTheme };
