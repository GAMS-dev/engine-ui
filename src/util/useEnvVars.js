import { useCallback, useState } from 'react';

// An invalid row is kept out of `json`, so block submission on `isValid`.
const useEnvVars = () => {
  const [env, setEnv] = useState({ json: '', isValid: true });
  const onChange = useCallback(
    (json, isValid) => setEnv({ json, isValid }),
    [],
  );
  return [env, onChange];
};

export default useEnvVars;
