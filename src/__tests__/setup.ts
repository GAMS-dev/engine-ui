import '@testing-library/jest-dom';
import 'vitest-canvas-mock';
import { vi } from 'vitest';
import { configure } from '@testing-library/react';

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

globalThis.ResizeObserver = ResizeObserverMock;

// The default 1000ms is tuned for a fast local machine; CI runners are
// often slower/more contended, so waitFor/findBy* need more headroom there
// to avoid flaky timeouts on otherwise-correct, just-slower-to-settle tests.
configure({ asyncUtilTimeout: 5000 });
