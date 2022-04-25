import React, { useState, useContext, useEffect } from "react";
import Select from 'react-select';
import axios from "axios";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import { getResponseError } from "./util";

const JobAccessGroupsSelector = props => {
    const [{ jwt, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const { value, onChange, namespace, groupWhitelist } = props;

    const [availableUserGroups, setAvailableUserGroups] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [userGroupsLoaded, setUserGroupsLoaded] = useState("");

    useEffect(() => {
        const loadUserGroups = async () => {
            try {
                const userGroupData = await axios.get(`${server}/namespaces/${encodeURIComponent(namespace)}/user-groups`);
                let availableGroupsTmp = userGroupData.data.map(el => el.label);
                if (groupWhitelist != null) {
                    availableGroupsTmp.push(...groupWhitelist);
                    availableGroupsTmp = [...new Set(availableGroupsTmp)];
                }
                setAvailableUserGroups(availableGroupsTmp
                    .sort((a, b) => ('' + a).localeCompare(b))
                    .map(el => ({ label: el, value: el })));
                setUserGroupsLoaded(namespace);
                if (isInitialized) {
                    onChange([]);
                } else {
                    setIsInitialized(true);
                }
            } catch (err) {
                setAlertMsg(`Problems retrieving user groups. Error message: ${getResponseError(err)}.`);
            }
        }
        if (namespace !== "" && userGroupsLoaded !== namespace) {
            loadUserGroups();
        }
    }, [jwt, server, userGroupsLoaded, namespace, groupWhitelist, onChange, setAlertMsg, isInitialized]);

    return (userGroupsLoaded === namespace ?
        <div className="form-group">
            {availableUserGroups.length === 0 ?
                (props.hideIfNoGroupsAvailable === true ? <></> : "No groups available") :
                <>
                    <label htmlFor="access-groups">
                        Select access groups
                    </label>
                    <Select
                        id="access-groups"
                        isClearable={true}
                        isMulti={true}
                        isSearchable={true}
                        closeMenuOnSelect={false}
                        blurInputOnSelect={false}
                        isLoading={userGroupsLoaded !== namespace}
                        onChange={selected => onChange(selected)}
                        value={value}
                        options={availableUserGroups}
                    />
                </>
            }
        </div> : <></>
    );
};

export default JobAccessGroupsSelector;
