import React from "react";
import ClipLoader from "react-spinners/ClipLoader";

const SubmitButton = ({ isSubmitting, className, isDisabled, onClick, children }) => {

  return (
    <div className="d-grid gap-2">
      <button type="submit" className={`btn ${className ? className : "btn-lg btn-primary"}`}
        disabled={isSubmitting || isDisabled === true} onClick={onClick}>
        {isSubmitting ?
          <ClipLoader size={20} />
          :
          children
        }
      </button>
    </div>
  );
};

export default SubmitButton;
