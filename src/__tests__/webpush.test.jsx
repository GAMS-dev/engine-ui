import axios from 'axios';
import {
  webpushSupported,
  getPushSubscription,
  subscribe,
  unsubscribe,
  allEvents,
} from '../util/webpush';

vi.mock('axios');

describe('webpush', () => {
  const originalServiceWorkerRegistration = global.ServiceWorkerRegistration;

  afterEach(() => {
    delete navigator.serviceWorker;
    delete window.PushManager;
    delete window.Notification;
    if (originalServiceWorkerRegistration) {
      global.ServiceWorkerRegistration = originalServiceWorkerRegistration;
    } else {
      delete global.ServiceWorkerRegistration;
    }
    vi.clearAllMocks();
  });

  const makeSupported = () => {
    navigator.serviceWorker = {};
    window.PushManager = function () {};
    global.ServiceWorkerRegistration = function () {};
    global.ServiceWorkerRegistration.prototype.showNotification = () => {};
  };

  describe('webpushSupported', () => {
    it('returns false when serviceWorker is not in navigator', () => {
      delete navigator.serviceWorker;
      expect(webpushSupported()).toBe(false);
    });

    it('returns false when PushManager is not in window', () => {
      navigator.serviceWorker = {};
      delete window.PushManager;
      expect(webpushSupported()).toBe(false);
    });

    it('returns false when showNotification is missing on ServiceWorkerRegistration', () => {
      navigator.serviceWorker = {};
      window.PushManager = function () {};
      global.ServiceWorkerRegistration = function () {};
      expect(webpushSupported()).toBe(false);
    });

    it('returns true when all Push APIs are supported', () => {
      makeSupported();
      expect(webpushSupported()).toBe(true);
    });
  });

  describe('allEvents', () => {
    it('exports the expected list of event options', () => {
      expect(allEvents).toEqual([
        { value: 'ALL', label: 'All events' },
        { value: 'JOB_FINISHED', label: 'Job finished' },
        { value: 'HC_JOB_FINISHED', label: 'Hypercube job finished' },
        { value: 'JOB_OUT_OF_RESOURCES', label: 'Job out of resources' },
        {
          value: 'HC_JOB_OUT_OF_RESOURCES',
          label: 'Hypercube job out of resources',
        },
      ]);
    });
  });

  describe('getPushSubscription', () => {
    it('returns the existing registration and subscription without registering a new worker', async () => {
      const pushSubscription = { endpoint: 'https://existing' };
      const registration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(pushSubscription),
        },
      };
      navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue(registration),
        register: vi.fn(),
      };

      const result = await getPushSubscription('https://server/api');

      expect(result.serviceWorkerRegistration).toBe(registration);
      expect(result.pushSubscription).toBe(pushSubscription);
      expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
    });

    it('registers the service worker when no registration exists yet', async () => {
      const registration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
        },
      };
      navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register: vi.fn().mockResolvedValue(registration),
      };

      const result = await getPushSubscription('https://server/api');

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
        'https://server/webpush-service-worker.js',
      );
      expect(result.serviceWorkerRegistration).toBe(registration);
      expect(result.pushSubscription).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('throws when push messaging is not supported', async () => {
      delete navigator.serviceWorker;
      await expect(subscribe('https://server/api')).rejects.toThrow(
        "Push messaging isn't supported.",
      );
    });

    it('throws when notification permission is denied', async () => {
      makeSupported();
      window.Notification = {
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };

      await expect(subscribe('https://server/api')).rejects.toThrow(
        'Push messaging request was denied.',
      );
    });

    const setupSubscribeHappyPath = ({ existingSubscription } = {}) => {
      makeSupported();
      const oldSubscription = existingSubscription
        ? {
            endpoint: 'https://old-endpoint',
            unsubscribe: vi.fn().mockResolvedValue(true),
          }
        : null;
      const newSubscriptionJSON = {
        endpoint: 'https://new-endpoint',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      };
      const registration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(oldSubscription),
          subscribe: vi.fn().mockResolvedValue({
            toJSON: () => newSubscriptionJSON,
          }),
        },
      };
      navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue(registration),
        register: vi.fn(),
      };
      window.Notification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };

      axios.post.mockImplementation((url) => {
        if (url === 'https://server/api/users/webhooks') {
          return Promise.resolve({ data: { id: 'webhook-1' } });
        }
        if (url === 'https://server/api/users/webhooks/webpush') {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error(`unexpected post to ${url}`));
      });
      axios.get.mockResolvedValue({
        data: { application_server_key: 'AAAA' },
      });
      axios.delete.mockResolvedValue({});

      return { oldSubscription, registration, newSubscriptionJSON };
    };

    it('subscribes successfully when no previous subscription exists', async () => {
      const { registration } = setupSubscribeHappyPath({
        existingSubscription: false,
      });

      await subscribe('https://server/api', [allEvents[1]], ['param_event']);

      expect(axios.delete).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(
        'https://server/api/users/webhooks',
        expect.any(FormData),
      );
      expect(axios.get).toHaveBeenCalledWith(
        'https://server/api/users/webhooks/webpush/vapid',
      );
      expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
        applicationServerKey: expect.any(Uint8Array),
        userVisibleOnly: true,
      });
      expect(axios.post).toHaveBeenCalledWith(
        'https://server/api/users/webhooks/webpush',
        {
          webhook_id: 'webhook-1',
          endpoint: 'https://new-endpoint',
          key_p256dh: 'p256dh-key',
          key_auth: 'auth-key',
        },
      );
    });

    it('unsubscribes any existing subscription before creating the new one', async () => {
      const { oldSubscription } = setupSubscribeHappyPath({
        existingSubscription: true,
      });

      await subscribe('https://server/api', undefined, undefined);

      expect(axios.delete).toHaveBeenCalledWith(
        'https://server/api/users/webhooks/webpush',
        {
          params: {
            endpoint: 'https://old-endpoint',
            delete_webhook: true,
          },
        },
      );
      expect(oldSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('handles a subscription missing key material gracefully', async () => {
      makeSupported();
      window.Notification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      const registration = {
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue({
            toJSON: () => ({ endpoint: 'https://new-endpoint' }),
          }),
        },
      };
      navigator.serviceWorker = {
        getRegistration: vi.fn().mockResolvedValue(registration),
        register: vi.fn(),
      };
      axios.post.mockImplementation((url) => {
        if (url === 'https://server/api/users/webhooks') {
          return Promise.resolve({ data: { id: 'webhook-1' } });
        }
        return Promise.resolve({ data: {} });
      });
      axios.get.mockResolvedValue({
        data: { application_server_key: 'AAAA' },
      });

      await subscribe('https://server/api');

      expect(axios.post).toHaveBeenCalledWith(
        'https://server/api/users/webhooks/webpush',
        {
          webhook_id: 'webhook-1',
          endpoint: 'https://new-endpoint',
          key_p256dh: undefined,
          key_auth: undefined,
        },
      );
    });

    it('wraps errors thrown while subscribing', async () => {
      makeSupported();
      window.Notification = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      navigator.serviceWorker = {
        getRegistration: vi.fn().mockRejectedValue(new Error('boom')),
        register: vi.fn(),
      };

      await expect(subscribe('https://server/api')).rejects.toThrow(
        'Problems subscribing to webhook. Error message: boom',
      );
    });
  });

  describe('unsubscribe', () => {
    it('deletes the webhook subscription and unsubscribes locally', async () => {
      axios.delete.mockResolvedValue({});
      const pushSubscription = {
        endpoint: 'https://endpoint',
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      await unsubscribe('https://server/api', pushSubscription, true);

      expect(axios.delete).toHaveBeenCalledWith(
        'https://server/api/users/webhooks/webpush',
        {
          params: { endpoint: 'https://endpoint', delete_webhook: true },
        },
      );
      expect(pushSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('defaults delete_webhook to false when not explicitly true', async () => {
      axios.delete.mockResolvedValue({});
      const pushSubscription = {
        endpoint: 'https://endpoint',
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      await unsubscribe('https://server/api', pushSubscription);

      expect(axios.delete).toHaveBeenCalledWith(
        'https://server/api/users/webhooks/webpush',
        {
          params: { endpoint: 'https://endpoint', delete_webhook: false },
        },
      );
    });

    it('logs and continues when the subscription is already gone (404)', async () => {
      axios.delete.mockRejectedValue({ response: { status: 404 } });
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const pushSubscription = {
        endpoint: 'https://endpoint',
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      await unsubscribe('https://server/api', pushSubscription, true);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Web Push subscription could not be deleted as it was not found.',
      );
      expect(pushSubscription.unsubscribe).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('throws a wrapped error for non-404 failures and does not unsubscribe locally', async () => {
      axios.delete.mockRejectedValue(new Error('server exploded'));
      const pushSubscription = {
        endpoint: 'https://endpoint',
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      await expect(
        unsubscribe('https://server/api', pushSubscription, true),
      ).rejects.toThrow(
        'Problems deleting Web Push subscription. Error message: server exploded',
      );
      expect(pushSubscription.unsubscribe).not.toHaveBeenCalled();
    });
  });
});
