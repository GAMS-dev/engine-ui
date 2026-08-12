import Select from 'react-select';
import { useSystemTheme } from '../util/theme';

// Drop-in replacement for react-select's default export that follows the OS
// light/dark preference, since react-select has no awareness of Bootstrap's
// data-bs-theme attribute.
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
};

const ThemedSelect = (props) => {
  const systemTheme = useSystemTheme();

  return (
    <Select
      {...props}
      theme={(base) => {
        const withOverrides = props.theme ? props.theme(base) : base;
        if (systemTheme !== 'dark') {
          return withOverrides;
        }
        return {
          ...withOverrides,
          colors: { ...withOverrides.colors, ...darkColors },
        };
      }}
    />
  );
};

export default ThemedSelect;
