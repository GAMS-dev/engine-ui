import { useContext, useEffect, useState } from 'react';
import Select from 'react-select';
import UserSettingsContext from '../contexts/UserSettingsContext';
import AuthContext from '../contexts/AuthContext';
import { Alert, Form } from 'react-bootstrap';
import {
  allEvents,
  getPushSubscription,
  subscribe,
  unsubscribe,
  webpushSupported,
} from '../util/webpush';
import ParameterizedWebhookEventsSelector from './ParameterizedWebhookEventsSelector';
import SubmitButton from './SubmitButton';
import AlertContext from '../contexts/AlertContext';
import { isMobileDevice } from '../util/util';
import { Share } from 'react-feather';
import ServerConfigContext from '../contexts/ServerConfigContext';
import { useOutletContext } from 'react-router-dom';

const UserSettingsFormWebPush = () => {
  const [{ server, roles }] = useContext(AuthContext);
  const [userSettings] = useContext(UserSettingsContext);
  const [serverConfig] = useContext(ServerConfigContext);
  const [, setAlertMsg] = useContext(AlertContext);
  const { setWebpushSettingsJSON } = useOutletContext();

  const [webPushIsSubmitting, setWebPushIsSubmitting] = useState(false);
  const [webPushEvents, setWebPushEvents] = useState(
    userSettings.webPush
      ? JSON.parse(userSettings.webPush)['events']
      : [allEvents[0]],
  );
  const [webPushParameterizedEvents, setWebPushParameterizedEvents] = useState(
    userSettings.webPush
      ? JSON.parse(userSettings.webPush)['parameterized_events']
      : [],
  );
  const [webPushParameterizedEventsValid, setWebPushParameterizedEventsValid] =
    useState(true);
  const [webPushSubmissionErrorMsg, setWebPushSubmissionErrorMsg] =
    useState('');
  const [showNotificationForm, setShowNotificationForm] = useState(false);

  useEffect(() => {
    const checkForPushSubscription = async () => {
      const { pushSubscription } = await getPushSubscription(server);
      setShowNotificationForm(pushSubscription != null);
    };
    if (webpushSupported()) {
      checkForPushSubscription();
    }
  }, [server]);

  const toggleNotifications = async (enable) => {
    setWebPushSubmissionErrorMsg('');
    if (enable) {
      setShowNotificationForm(true);
      return;
    }
    try {
      const { pushSubscription } = await getPushSubscription(server);
      if (pushSubscription) {
        await unsubscribe(server, pushSubscription, true);
      }
      setWebpushSettingsJSON(null);
      setShowNotificationForm(false);
    } catch (err) {
      setWebPushSubmissionErrorMsg(err.message);
    }
  };

  const updateNotifications = async () => {
    setWebPushIsSubmitting(true);
    setWebPushSubmissionErrorMsg('');
    try {
      await subscribe(server, webPushEvents, webPushParameterizedEvents);
      setWebpushSettingsJSON(
        JSON.stringify({
          events: webPushEvents,
          parameterized_events: webPushParameterizedEvents,
        }),
      );
      setAlertMsg('success:Notification settings updated');
    } catch (err) {
      setWebPushSubmissionErrorMsg(err.message);
      setWebpushSettingsJSON(null);
    }
    setWebPushIsSubmitting(false);
  };

  return (
    <>
      {serverConfig.webhook_access === 'ENABLED' ||
      (serverConfig.webhook_access === 'ADMIN_ONLY' &&
        roles?.includes('admin')) ? (
        webpushSupported() ? (
          <form
            className="m-auto"
            onSubmit={(e) => {
              e.preventDefault();
              updateNotifications();
              return false;
            }}
          >
            <div
              className="invalid-feedback text-center"
              style={{
                display: webPushSubmissionErrorMsg !== '' ? 'block' : 'none',
              }}
            >
              {webPushSubmissionErrorMsg}
            </div>
            <fieldset disabled={webPushIsSubmitting}>
              <Form.Check
                type="switch"
                id="enableNotificationsSwitch"
                label="Enable notifications"
                className="mt-3"
                checked={showNotificationForm}
                onChange={(e) => toggleNotifications(e.target.checked)}
              />
              {showNotificationForm ? (
                <>
                  <div className="mt-3 mb-3">
                    <label htmlFor="webPushEvents">
                      Events for which notification should be triggered
                    </label>
                    <Select
                      inputId="webPushEvents"
                      isClearable={true}
                      isMulti={true}
                      isSearchable={true}
                      placeholder={'Events'}
                      isDisabled={webPushIsSubmitting}
                      closeMenuOnSelect={false}
                      onChange={(el) => setWebPushEvents(el)}
                      value={webPushEvents}
                      options={allEvents}
                    />
                  </div>
                  <ParameterizedWebhookEventsSelector
                    parameterizedEvents={webPushParameterizedEvents}
                    setParameterizedEvents={setWebPushParameterizedEvents}
                    setIsValid={setWebPushParameterizedEventsValid}
                    isSubmitting={webPushIsSubmitting}
                  />
                  <div className="mt-3">
                    <SubmitButton
                      isSubmitting={webPushIsSubmitting}
                      isDisabled={!webPushParameterizedEventsValid}
                    >
                      Update
                    </SubmitButton>
                  </div>
                </>
              ) : (
                <></>
              )}
            </fieldset>
          </form>
        ) : (
          <Alert variant="danger" className="mt-3">
            Push notifications are not supported by your browser.
            {isMobileDevice() ? (
              <>
                {' '}
                You may need to install the app first (e.g.on iOS by tapping the
                &quot; Share&quot; <Share size={14} /> button and selecting
                &quot; Add to home screen&quot;).
              </>
            ) : (
              ''
            )}
          </Alert>
        )
      ) : (
        <Alert variant="danger" className="mt-3">
          Push notifications require webhooks to be enabled.
        </Alert>
      )}
    </>
  );
};

export default UserSettingsFormWebPush;
