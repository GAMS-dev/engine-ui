import axios from "axios";
import React, { useState } from "react";
import { useContext } from "react";
import { useEffect } from "react";
import Select from 'react-select';
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { getResponseError } from "./util";

function generateDesc(name, perm, groups) {
    return `${name}${(perm && perm > 0) ?
        ` (${perm & 4 ? 'r' : ''}${perm & 2 ? 'w' : ''}${perm & 1 ? 'x' : ''})` :
        ''}${groups && groups.length ? ` [${groups.join(',')}]` : ''}`;
}

export const NamespacePermissionSelector = ({ namespacePermissions, setNamespacePermissions, includeGroups, highlight }) => {
    const [{ jwt, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const [isLoading, setIsLoading] = useState(false);
    const [nsId, setNsId] = useState(0);
    const [modifiedFlag, setModifiedFlag] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState(namespacePermissions ?
        namespacePermissions.sort((a, b) => ('' + a.name).localeCompare(b.name))[0].name : '');
    const [readAccess, setReadAccess] = useState(undefined);
    const [writeAccess, setWriteAccess] = useState(undefined);
    const [execAccess, setExecAccess] = useState(undefined);
    const [availableGroups, setAvailableGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);

    useEffect(() => {
        if (includeGroups !== true || selectedNamespace.length < 1) {
            return;
        }
        const fetchGroups = async () => {
            setIsLoading(true);
            try {
                const res = await axios.get(`${server}/namespaces/${encodeURIComponent(selectedNamespace)}/user-groups`);
                const availableGroupsTmp = res.data.map(group => ({ value: group.label, label: group.label }));
                const availableGroupLabels = res.data.map(group => group.label);
                setAvailableGroups(availableGroupsTmp);
                const nsIdTmp = namespacePermissions.findIndex(el => el.name === selectedNamespace);
                setSelectedGroups(() => {
                    if (namespacePermissions[nsIdTmp].groups == null) {
                        return [];
                    }
                    return namespacePermissions[nsIdTmp].groups
                        .filter((group) => availableGroupLabels.includes(group))
                        .map(group => ({ value: group, label: group }));
                });
            } catch (err) {
                setAlertMsg(`Problems while retrieving user groups. Error message: ${getResponseError(err)}.`);
                setAvailableGroups([]);
                setSelectedGroups([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGroups();
    }, [jwt, server, selectedNamespace, includeGroups, setAlertMsg, namespacePermissions, setIsLoading]);

    const updateNsPermissions = permBit => {
        const newNamespacePermissions = namespacePermissions;
        newNamespacePermissions[nsId].perm ^= permBit;
        if (modifiedFlag === false) {
            setModifiedFlag(true);
        }
        setNamespacePermissions(newNamespacePermissions);
    }
    const updateNsGroups = labels => {
        const newNamespacePermissions = namespacePermissions;
        newNamespacePermissions[nsId].groups = labels;
        if (modifiedFlag === false) {
            setModifiedFlag(true);
        }
        setNamespacePermissions(newNamespacePermissions);
    }
    const updateSelectedNamespace = e => {
        const newNsId = namespacePermissions.findIndex(el => el.name === e.target.value);
        setReadAccess((namespacePermissions[newNsId].perm & 4) !== 0);
        setWriteAccess((namespacePermissions[newNsId].perm & 2) !== 0);
        setExecAccess((namespacePermissions[newNsId].perm & 1) !== 0);
        setNsId(newNsId);
        setSelectedNamespace(e.target.value);
    }
    const updateReadAccess = e => {
        updateNsPermissions(4);
        setReadAccess(e.target.checked);
    }
    const updateWriteAccess = e => {
        updateNsPermissions(2);
        setWriteAccess(e.target.checked);
    }
    const updateExecAccess = e => {
        updateNsPermissions(1);
        setExecAccess(e.target.checked);
    }
    return (
        <>
            {namespacePermissions.length > 0 &&
                <div style={highlight === true ? {
                    background: '#f8f9fa',
                    padding: '10px'
                } : {}}>
                    <div className="form-group mt-3 mb-3">
                        <label htmlFor="toggleIncludeExclude">
                            {`Namespace${modifiedFlag ? " (*)" : ""}`}
                        </label>
                        <select id="namespace" className="form-control"
                            value={selectedNamespace}
                            onChange={updateSelectedNamespace}
                            disabled={isLoading}>
                            {namespacePermissions.sort((a, b) => ('' + a.name).localeCompare(b.name)).map(ns => (
                                <option key={ns.name} value={ns.name}>{generateDesc(ns.name, ns.perm, ns.groups)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>
                            Permissions
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input className="form-check-input" type="checkbox" id="cbReadAccess"
                            checked={readAccess === undefined ? (namespacePermissions[0].perm & 4) !== 0 : readAccess}
                            onChange={updateReadAccess}
                            disabled={isLoading || (namespacePermissions[nsId].maxPerm & 4) === 0} />
                        <label className="form-check-label" htmlFor="cbReadAccess">Read</label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input className="form-check-input" type="checkbox" id="cbWriteAccess"
                            checked={writeAccess === undefined ? (namespacePermissions[0].perm & 2) !== 0 : writeAccess}
                            onChange={updateWriteAccess}
                            disabled={isLoading || (namespacePermissions[nsId].maxPerm & 2) === 0} />
                        <label className="form-check-label" htmlFor="cbWriteAccess">Write</label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input className="form-check-input" type="checkbox" id="cbExecuteAccess"
                            checked={execAccess === undefined ? (namespacePermissions[0].perm & 1) !== 0 : execAccess}
                            onChange={updateExecAccess}
                            disabled={isLoading || (namespacePermissions[nsId].maxPerm & 1) === 0} />
                        <label className="form-check-label" htmlFor="cbExecuteAccess">Execute</label>
                    </div>
                    {includeGroups === true && availableGroups.length ?
                        <div className="form-group mt-3">
                            <label htmlFor="nsGroups">
                                User Groups
                            </label>
                            <Select
                                id="nsGroups"
                                value={selectedGroups}
                                isMulti={true}
                                isSearchable={true}
                                placeholder={'Select User Groups'}
                                isDisabled={isLoading}
                                closeMenuOnSelect={false}
                                blurInputOnSelect={false}
                                onChange={selected => {
                                    updateNsGroups(selected.map(group => group.value))
                                    setSelectedGroups(selected)
                                }}
                                options={availableGroups}
                            />
                        </div>
                        : <></>
                    }
                </div>
            }
        </>
    );
};

export default NamespacePermissionSelector;
