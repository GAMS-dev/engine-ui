import axios from "axios";
import { getResponseError, urlB64ToUint8Array } from "./util";


const webpushSupported = () => (('serviceWorker' in navigator) && ('PushManager' in window) && ('showNotification' in ServiceWorkerRegistration.prototype))

const allEvents = [{ value: 'ALL', label: 'All events' },
{ value: 'JOB_FINISHED', label: 'Job finished' },
{ value: 'HC_JOB_FINISHED', label: 'Hypercube job finished' },
{ value: 'JOB_OUT_OF_RESOURCES', label: 'Job out of resources' },
{ value: 'HC_JOB_OUT_OF_RESOURCES', label: 'Hypercube job out of resources' }
];

const subscribe = async (server, events, parameterizedEvents) => {
    if (!webpushSupported()) {
        throw new Error('Push messaging isn\'t supported.');
    }
    const permission = await window.Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Push messaging request was denied.');
    }
    try {
        let serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();
        if (!serviceWorkerRegistration) {
            serviceWorkerRegistration = await navigator.serviceWorker.register(`${server}/webpush-service-worker.js`);
        }
        let pushSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
        let unsubscribePromise;
        if (pushSubscription) {
            unsubscribePromise = unsubscribe(pushSubscription, server, true)
        }
        const webhookSubmissionForm = new FormData();
        webhookSubmissionForm.append("recursive", false);
        webhookSubmissionForm.append("content_type", "json");
        webhookSubmissionForm.append("insecure_ssl", false);
        if (events) {
            for (let i = 0; i < events.length; i++) {
                webhookSubmissionForm.append("events", events[i].value);
            }
        }
        if (parameterizedEvents) {
            parameterizedEvents.forEach(parameterizedEvent => {
                webhookSubmissionForm.append("parameterized_events", parameterizedEvent);
            })
        }
        const webhookRespPromise = axios.post(`${server}/users/webhooks`, webhookSubmissionForm);
        const vapidInfo = await axios.get(`${server}/users/webhooks/webpush/vapid`);
        const applicationServerKey = urlB64ToUint8Array(
            vapidInfo.data['application_server_key']
        )
        const options = { applicationServerKey, userVisibleOnly: true };
        if (unsubscribePromise) {
            await unsubscribePromise;
        }
        pushSubscription = await serviceWorkerRegistration.pushManager.subscribe(options);
        pushSubscription = pushSubscription.toJSON()
        const webhookResp = await webhookRespPromise;
        const webhookId = webhookResp.data.id;
        await axios.post(`${server}/users/webhooks/webpush`, {
            webhook_id: webhookId,
            endpoint: pushSubscription.endpoint,
            key_p256dh: pushSubscription.keys?.p256dh,
            key_auth: pushSubscription.keys?.auth
        });
    }
    catch (err) {
        throw new Error(`Problems subscribing to webhook. Error message: ${getResponseError(err)}`);
    }
}
const unsubscribe = async (pushSubscription, server, deleteWebhook) => {
    try {
        await axios.delete(`${server}/users/webhooks/webpush`, {
            params: {
                endpoint: pushSubscription.endpoint,
                delete_webhook: deleteWebhook === true
            }
        });
    }
    catch (err) {
        if (err?.response?.status !== 404) {
            console.error('Webpush subscription could not be deleted as it was not found.')
        } else {
            throw new Error(`Problems deleting webpush subscription. Error message: ${getResponseError(err)}`);
        }
    }
    await pushSubscription.unsubscribe();
}
export {
    webpushSupported, subscribe, unsubscribe, allEvents
}
