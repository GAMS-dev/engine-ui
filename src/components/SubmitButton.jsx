import React from "react";
import ClipLoader from "react-spinners/ClipLoader";

const SubmitButton = props => {

  return (
    <button type="submit" className={`btn ${props.className ? props.className : "btn-lg btn-primary btn-block"}`}
      disabled={props.isSubmitting} onClick={props.onClick}>
      {props.isSubmitting ?
        <ClipLoader size={20} />
        :
        props.children
      }
    </button>
  );
};

export default SubmitButton;
