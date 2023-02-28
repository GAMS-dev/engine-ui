import React from "react";
import ClipLoader from "react-spinners/ClipLoader";

const SubmitButton = ({ isSubmitting, className, isDisabled, onClick, children }) => {

  return (
    <button type="submit" className={`btn ${className ? className : "btn-lg btn-primary btn-block"}`}
      disabled={isSubmitting || isDisabled === true} onClick={onClick}>
      {isSubmitting ?
        <ClipLoader size={20} />
        :
        children
      }
    </button>
  );
};

export default SubmitButton;
