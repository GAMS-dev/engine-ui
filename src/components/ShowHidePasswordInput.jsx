import { useState } from "react";
import { Eye, EyeOff } from "react-feather";

const ShowHidePasswordInput = ({ value, setValue,
    id, label, invalidFeedback,
    helpText, additionalClassesContainer,
    usePlaceholder, required, autoComplete, additionalAddons }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className={`form-group${additionalClassesContainer != null ? ` ${additionalClassesContainer}` : ''}`}>
            <label htmlFor={id} className={usePlaceholder === true ? "sr-only" : ""}>
                {label}
            </label>
            <div className="input-group">
                <input
                    type={isVisible ? "text" : "password"}
                    className={"form-control" + (invalidFeedback ? " is-invalid" : "")}
                    id={id}
                    name={id}
                    aria-describedby={helpText ? `${id}Help` : null}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    required={required === true}
                    autoComplete={autoComplete == null ? "off" : autoComplete}
                    placeholder={usePlaceholder === true ? label : null}
                />
                    <span className="input-group-text" style={{ "cursor": "pointer" }}
                        onClick={() => setIsVisible(visible => !visible)}>
                        {isVisible ?
                            <Eye /> :
                            <EyeOff />}
                    </span>
                    {additionalAddons}
                <div className="invalid-feedback">
                    {invalidFeedback ? invalidFeedback : ""}
                </div>
            </div>
            {helpText ?
                <small id={`${id}Help`} className="form-text text-muted">
                    {helpText}
                </small> :
                <></>}
        </div>
    );
};
export default ShowHidePasswordInput;
