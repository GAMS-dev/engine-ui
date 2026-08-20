import Select from 'react-select';
import { useSystemTheme } from '../util/theme';

// Drop-in replacement for react-select's default export that follows the OS
// light/dark preference, since react-select has no awareness of Bootstrap's
// data-bs-theme attribute, and that uses our brand orange instead of
// react-select's default blue for focus/selection states.
const PRIMARY = 'var(--bs-primary, #f39619)';

// Selected-option text color is drawn from `neutral0` (react-select assumes
// it's always the lightest neutral), and the focused/hovered-but-unselected
// option background comes from `primary25`. Both need a value tuned per
// theme rather than reused verbatim from the other palette.
const primaryColors = {
  primary: PRIMARY,
  primary75: '#c47f10',
  primary50: 'rgba(243, 150, 25, 0.5)',
  primary25: 'rgba(243, 150, 25, 0.16)',
};

const darkColors = {
  neutral0: '#2b2f36',
  neutral5: '#323740',
  neutral10: '#3a3f49',
  neutral20: '#4a4f59',
  neutral30: '#5a5f69',
  neutral40: '#6c7280',
  neutral50: '#8a8f99',
  neutral60: '#a3a8b3',
  neutral70: '#bcc0c9',
  neutral80: '#e8e9eb',
  neutral90: '#f5f5f6',
  // react-select's default primary25 is a pale, near-white tint meant to
  // sit under dark text on a light page. Reused as-is in dark mode, it
  // barely differs from the light-gray option text sitting on top of it.
  // A more saturated, more opaque tint keeps that same text readable here.
  primary25: 'rgba(243, 150, 25, 0.35)',
};

const ThemedSelect = ({ theme, ...rest }) => {
  const systemTheme = useSystemTheme();

  return (
    <Select
      {...rest}
      theme={(base) => {
        const withOverrides = theme ? theme(base) : base;
        return {
          ...withOverrides,
          colors: {
            ...withOverrides.colors,
            ...primaryColors,
            ...(systemTheme === 'dark' ? darkColors : {}),
          },
        };
      }}
    />
  );
};

export default ThemedSelect;
