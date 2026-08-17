import { ClipLoader } from 'react-spinners';
import { useSystemTheme } from '../util/theme';

// Drop-in replacement for react-spinners' ClipLoader that follows the OS
// light/dark preference: its hardcoded default color (#000000) has poor
// contrast against dark mode's dark gray backgrounds.
const ThemedClipLoader = ({ color, ...rest }) => {
  const systemTheme = useSystemTheme();

  return (
    <ClipLoader
      color={color ?? (systemTheme === 'dark' ? '#e8e9eb' : '#000000')}
      {...rest}
    />
  );
};

export default ThemedClipLoader;
