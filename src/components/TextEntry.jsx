import React from "react";
import { useParams } from "react-router-dom";

const TextEntry = () => {
  const { token, textEntry } = useParams();

  return <div className="container-fluid">token</div>;
};

export default TextEntry;
