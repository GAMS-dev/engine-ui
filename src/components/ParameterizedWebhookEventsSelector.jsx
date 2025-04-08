import React, { useContext } from "react";
import Select from 'react-select';
import { Button } from "react-bootstrap";
import { UserSettingsContext } from "./UserSettingsContext";

const ParameterizedWebhookEventsSelector = ({ parameterizedEvents, setParameterizedEvents,
    setIsValid, isSubmitting, validationErrors }) => {

    const [userSettings,] = useContext(UserSettingsContext)

    const allParameterizedEvents = [{ value: 'VOLUME_QUOTA_THRESHOLD', label: 'Volume quota threshold reached' },
    { value: 'JOB_DURATION_THRESHOLD', label: 'Job duration threshold reached' },
    { value: 'HC_JOB_DURATION_THRESHOLD', label: 'Hypercube job duration threshold reached' }];

    return (
        <>
            <div className="invalid-feedback text-center" style={{ display: validationErrors !== "" ? "block" : "none" }}>
                {validationErrors}
            </div>
            {parameterizedEvents.map((event, idx) => {
                const eventType = event.split('=', 1)[0];
                const eventParameter = parseInt(event.substring(event.indexOf('=') + 1));
                return <div key={`parameterized_event_${idx}`} className="row mb-1">
                    <div className="col-sm-6 col-12">
                        <Select
                            autosize={false}
                            isClearable={false}
                            isMulti={false}
                            isSearchable={true}
                            placeholder={'Event type'}
                            isDisabled={isSubmitting}
                            onChange={el => {
                                const newEvents = [...parameterizedEvents];
                                newEvents[idx] = `${el.value}=`;
                                setIsValid(false);
                                setParameterizedEvents(newEvents);
                            }}
                            value={allParameterizedEvents.filter(event => event.value === eventType)[0]}
                            options={allParameterizedEvents}
                        />
                    </div>
                    <div className="col-sm-5 col-11">
                        <input
                            type="number"
                            min="0"
                            className={"form-control" + (isNaN(eventParameter) ? " is-invalid" : "")}
                            placeholder={`Event trigger (in ${eventType === 'VOLUME_QUOTA_THRESHOLD' ? userSettings.quotaUnit : 'h'})`}
                            value={isNaN(eventParameter) ? '' : (eventType === 'VOLUME_QUOTA_THRESHOLD' ? eventParameter / userSettings.quotaConversionFactor : eventParameter / 3600)}
                            onChange={el => {
                                let newParam = parseFloat(el.target.value);
                                setIsValid(!isNaN(newParam));
                                const newEvents = [...parameterizedEvents];
                                if (!isNaN(newParam)) {
                                    if (eventType === 'VOLUME_QUOTA_THRESHOLD') {
                                        newParam *= userSettings.quotaConversionFactor;
                                    } else {
                                        newParam *= 3600;
                                    }
                                }

                                newEvents[idx] = `${eventType}=${newParam}`;
                                setParameterizedEvents(newEvents);
                            }}
                        />
                    </div>
                    <div className="col-1">
                        <button type="button" className="btn-close" aria-label="Close"
                            onClick={_ => {
                                const newEvents = [...parameterizedEvents];
                                newEvents.splice(idx, 1);
                                setParameterizedEvents(newEvents);
                                setIsValid(true);
                            }}>
                            <span className="visually-hidden">&times;</span>
                        </button>
                    </div>
                </div>
            })}
            <div className="row mb-3">
                <div className="col-12">
                    <Button onClick={() => {
                        const newEvents = [...parameterizedEvents];
                        newEvents.push(`${allParameterizedEvents[0].value}=`);
                        setParameterizedEvents(newEvents);
                        setIsValid(false);
                    }}>Add parameterized event</Button>
                </div>
            </div>
        </>
    );
}

export default ParameterizedWebhookEventsSelector;
