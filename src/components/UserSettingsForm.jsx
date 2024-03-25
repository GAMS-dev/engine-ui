import React, { useContext, useEffect, useState } from "react";
import Select from "react-select";
import { UserSettingsContext, availableTablePageLengths } from "./UserSettingsContext";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { Info } from "react-feather";

const UserSettingsForm = () => {

    const [userSettings, setUserSettings] = useContext(UserSettingsContext)

    const availableQuotaUnits = [{ value: "mults", label: "mults" }, { value: "multh", label: "multh" }]
    const [selectedQuotaUnit, setSelectedQuotaUnit] = useState(userSettings.quotaUnit)
    const [selectedTablePageLength, setSelectedTablePageLength] = useState(userSettings.tablePageLength)

    useEffect(() => {
        setUserSettings({
            quotaUnit: selectedQuotaUnit,
            tablePageLength: selectedTablePageLength
        })
    }, [selectedQuotaUnit, selectedTablePageLength, setUserSettings])

    return (
        <form>
            <div className="form-group mt-3 mb-3 ">
                <label htmlFor="selectQuotaUnit">
                    Select quota unit
                    <span className="ms-1" >
                        <OverlayTrigger placement="bottom"
                            overlay={<Tooltip id="tooltip">
                                If multh is selected, all quota values are divided by 3600 (multiplier * hour). Otherwise, the quota is calculated by (multiplier * seconds).
                            </Tooltip>}>
                            <Info />
                        </OverlayTrigger>
                    </span>
                </label>

                <Select
                    id="selectQuotaUnit"
                    isClearable={false}
                    value={availableQuotaUnits.find(type => type.value === selectedQuotaUnit)}
                    isSearchable={true}
                    onChange={selected => setSelectedQuotaUnit(selected.value)}
                    options={availableQuotaUnits}
                />
            </div>
            <div className="form-group mt-3 mb-3 ">
                <label htmlFor="tablePageLength">
                    Select table page length
                </label>
                <Select
                    id="tablePageLength"
                    isClearable={false}
                    value={availableTablePageLengths.find(type => type.value === selectedTablePageLength)}
                    isSearchable={true}
                    onChange={selected => setSelectedTablePageLength(selected.value)}
                    options={availableTablePageLengths}
                />
            </div>
        </form>

    )
}

export default UserSettingsForm;
