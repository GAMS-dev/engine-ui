import { useContext } from "react";
import Select from "react-select";
import DefaultInstanceSelector from "./DefaultInstanceSelector";
import { useOutletContext } from "react-router-dom";
import ServerInfoContext from "../contexts/ServerInfoContext";
import { availableTablePageLengths } from "../util/constants";

const UserSettingsFormGeneral = () => {
    const [serverInfo] = useContext(ServerInfoContext);
    const { selectedTablePageLength, setSelectedTablePageLength } = useOutletContext();

    return (
        <form>
            <div className="form-group mt-3 mb-3">
                <label htmlFor="tablePageLengthInput">
                    Default table page length
                </label>
                <Select
                    id="tablePageLength"
                    inputId="tablePageLengthInput"
                    isClearable={false}
                    value={availableTablePageLengths.filter(type => type.value === selectedTablePageLength)[0]}
                    isSearchable={true}
                    onChange={selected => setSelectedTablePageLength(selected.value)}
                    options={availableTablePageLengths}
                />
            </div>
            {serverInfo.in_kubernetes === true ? <DefaultInstanceSelector className={"form-group mt-3 mb-3"} /> : <></>}
        </form>
    )
}

export default UserSettingsFormGeneral;
