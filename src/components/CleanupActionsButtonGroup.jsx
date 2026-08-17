const HousekeepingActionsButtonGroup = ({
  token,
  type,
  username,
  setDataToRemove,
  setShowDeleteConfirmDialog,
}) => {
  const setDeleteId = () => {
    setDataToRemove([{ token: token, type: type, username: username }]);
    setShowDeleteConfirmDialog(true);
  };

  return (
    <div className="btn-group">
      <button className="btn btn-sm btn-outline-danger" onClick={setDeleteId}>
        Delete
      </button>
    </div>
  );
};
export default HousekeepingActionsButtonGroup;
