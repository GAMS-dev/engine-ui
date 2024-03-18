import React, { useContext, useEffect, useState } from "react";
import Select from "react-select";
import { UserSettingsContext, availableTablePageLengths } from "./UserSettingsContext";

const UserSettingsForm = () => {

    const [userSettings, setUserSettings] = useContext(UserSettingsContext)

    const availableMulitplierUnits = [{ value: "mults", label: "mults" }, { value: "multh", label: "multh" }]
    const [selectedMulitplierUnit, setSelectedMulitplierUnit] = useState(userSettings.mulitplierUnit)
    const [selectedTablePageLength, setSelectedTablePageLength] = useState(userSettings.tablePageLength)

    useEffect(() => {
        setUserSettings({
            mulitplierUnit: selectedMulitplierUnit,
            tablePageLength: selectedTablePageLength
        })
    }, [selectedMulitplierUnit, selectedTablePageLength, setUserSettings])

    return (
        <form>
            <div className="form-group mt-3 mb-3 ">
                <label htmlFor="selectMulitplierUnit">
                    Select multiplier unit
                </label>
                <Select
                    id="selectMulitplierUnit"
                    isClearable={false}
                    value={availableMulitplierUnits.find(type => type.value === selectedMulitplierUnit)}
                    isSearchable={true}
                    onChange={selected => setSelectedMulitplierUnit(selected.value)}
                    options={availableMulitplierUnits}
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
