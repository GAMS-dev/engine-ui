import React, { useState } from "react";

function generateDesc(name, perm) {
    return `${name}${(perm && perm > 0)? ` (${perm & 4? 'r' : ''}${perm & 2? 'w' : ''}${perm & 1? 'x': ''})` : ''}`;
}

export const NamespacePermissionSelector = props => {
    const {namespacePermissions, setNamespacePermissions} = props;

    const [nsId, setNsId] = useState(0);
    const [modifiedFlag, setModifiedFlag] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState("");
    const [readAccess, setReadAccess] = useState(undefined);
    const [writeAccess, setWriteAccess] = useState(undefined);
    const [execAccess, setExecAccess] = useState(undefined);

    const updateNsPermissions = permBit => {
        const newNamespacePermissions = namespacePermissions;
        newNamespacePermissions[nsId].perm ^= permBit;
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
            <>
                <div className="form-group mt-3 mb-3">
                    <label htmlFor="toggleIncludeExclude">
                        {`Namespace${modifiedFlag? " (*)":""}`}
                    </label>
                    <select id="namespace" className="form-control" value={selectedNamespace} onChange={updateSelectedNamespace}>
                        {namespacePermissions.map(ns => (
                            <option key={ns.name} value={ns.name}>{generateDesc(ns.name, ns.perm)}</option>
                        ))}
                    </select>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" id="cbReadAccess" 
                      checked={readAccess === undefined? (namespacePermissions[0].perm & 4) !== 0: readAccess} 
                      onChange={updateReadAccess} 
                      disabled={(namespacePermissions[nsId].maxPerm & 4) === 0}/>
                    <label className="form-check-label" htmlFor="cbReadAccess">Read</label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" id="cbWriteAccess" 
                      checked={writeAccess === undefined? (namespacePermissions[0].perm & 2) !== 0: writeAccess} 
                      onChange={updateWriteAccess} 
                      disabled={(namespacePermissions[nsId].maxPerm & 2) === 0}/>
                    <label className="form-check-label" htmlFor="cbWriteAccess">Write</label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" id="cbExecuteAccess"
                      checked={execAccess === undefined? (namespacePermissions[0].perm & 1) !== 0: execAccess} 
                      onChange={updateExecAccess} 
                      disabled={(namespacePermissions[nsId].maxPerm & 1) === 0}/>
                    <label className="form-check-label" htmlFor="cbExecuteAccess">Execute</label>
                </div>
            </>
        }
        </>
    );
};

export default NamespacePermissionSelector;
