import { createRoot } from 'react-dom/client';
import App from './App';
import './gams_bootstrap.scss';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import AuthProvider from './providers/AuthProvider';

const root = createRoot(document.getElementById('root'));

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
