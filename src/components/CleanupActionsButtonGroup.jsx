import React from "react";

const HousekeepingActionsButtonGroup = props => {
  const { filename, setDataToRemove, setShowDeleteConfirmDialog } = props;

  const setDeleteId = () => {
    setDataToRemove([filename]);
    setShowDeleteConfirmDialog(true);
  }

  return (
    <div className="btn-group">
      <button className="btn btn-sm btn-outline-danger" onClick={setDeleteId}>Delete</button>
    </div>
  );
};
export default HousekeepingActionsButtonGroup;
