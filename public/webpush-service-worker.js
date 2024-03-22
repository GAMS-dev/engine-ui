const getJobDescriptionString = (data) => {
  if (data.payload.tag) {
    let truncatedTag = data.payload.tag.substr(0, 11);
    if (truncatedTag.length > 10) {
      truncatedTag += '..'
    }
    return ` (${data.payload.tag})`
  }
  return ''
}
const formatDurationString = (duration) => {
  if (duration > 3600) {
    return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(duration / 3600)}h`
  }
  return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(duration)}s`
}
const eventPayloadMap = {
  JOB_FINISHED: {
    body: (data) => `Job${getJobDescriptionString(data)} finished with return code: ${data.payload.process_status}`,
    title: 'Job finished',
    actions: (data) => ([{
      action: `/jobs/${data.payload.token}`,
      title: 'Show details'
    }]),
    data: (data) => ({
      url: `/jobs/${data.payload.token}`
    })
  },
  HC_JOB_FINISHED: {
    body: (data) => `Hypercube job${getJobDescriptionString(data)} finished`,
    title: 'Hypercube job finished',
    actions: (data) => ([{
      action: `/jobs/hc:${data.payload.token}`,
      title: 'Show details'
    }]),
    data: (data) => ({
      url: `/jobs/hc:${data.payload.token}`
    })
  },
  JOB_OUT_OF_RESOURCES: {
    body: (data) => `Job${getJobDescriptionString(data)} out of resources${data.payload?.labels?.resource_warning ? ` (${data.payload?.labels?.resource_warning})` : ''}`,
    title: 'Job out of resources',
    actions: (data) => ([{
      action: `/jobs/${data.payload.token}`,
      title: 'Show details'
    }]),
    data: (data) => ({
      url: `/jobs/${data.payload.token}`
    })
  },
  HC_JOB_OUT_OF_RESOURCES: {
    body: (data) => `Hypercube job${getJobDescriptionString(data)} out of resources${data.payload?.labels?.resource_warning ? ` (${data.payload?.labels?.resource_warning})` : ''}`,
    title: 'Hypercube job out of resources',
    actions: (data) => ([{
      action: `/jobs/hc:${data.payload.token}`,
      title: 'Show details'
    }]),
    data: (data) => ({
      url: `/jobs/hc:${data.payload.token}`
    })
  },
  JOB_DURATION_THRESHOLD: {
    body: (data) => `Job${getJobDescriptionString(data)} running for more than ${formatDurationString(data.payload.threshold_level)}`,
    title: 'Job threshold reached',
    actions: (data) => ([{
      action: `/jobs/${data.payload.token}`,
      title: 'Show details'
    }]),
    data: (data) => ({
      url: `/jobs/${data.payload.token}`
    })
  },
  HC_JOB_DURATION_THRESHOLD: {
    body: (data) => `Hypercube job${getJobDescriptionString(data)} running for more than ${formatDurationString(data.payload.threshold_level)}`,
    title: 'Hypercube job threshold reached',
    actions: (data) => ([{
      action: `/jobs/hc:${data.payload.token}`,
      title: 'Show details'
    }]),
    data: (data) => ({
      url: `/jobs/hc:${data.payload.token}`
    })
  },
  VOLUME_QUOTA_THRESHOLD: {
    body: (data) => `Only ${formatDurationString(data.payload.threshold_level)} of your volume quota remain`,
    title: 'Running out of quota'
  }
}

self.addEventListener('push', (event) => {
  let notification = event.data.json();
  if (!eventPayloadMap.hasOwnProperty(notification.event)) {
    console.log(`No notification config set up for event of type: ${notification.event}.`);
    self.registration.showNotification(
      notification.event, {
      icon: 'logo192.png',
      body: notification.text
    })
    return;
  }
  const payload = eventPayloadMap[notification.event];
  self.registration.showNotification(
    payload.title, {
    icon: 'logo192.png',
    body: payload.body(notification),
    actions: payload.actions(notification),
    data: payload.data(notification)
  }
  );
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  let urlToOpen;
  if (event.action) {
    urlToOpen = event.action;
  } else {
    if (!event.notification.data?.url) {
      return;
    }
    urlToOpen = event.notification.data?.url
  }
  urlToOpen = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/')) + urlToOpen
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientsArr) => {
      // If a Window tab matching the targeted URL already exists, focus that;
      const hadWindowToFocus = clientsArr.some((windowClient) =>
        windowClient.url === urlToOpen
          ? (windowClient.focus(), true)
          : false,
      );
      // Otherwise, open a new tab to the applicable URL
      if (!hadWindowToFocus)
        clients
          .openWindow(urlToOpen);
    }),
  );
});
