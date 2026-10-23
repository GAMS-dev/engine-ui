import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const TooltipBadge = ({ id, tooltip, className, children, ...props }) => (
  <OverlayTrigger
    placement="top"
    overlay={(overlayProps) => (
      <Tooltip id={id} {...overlayProps}>
        {tooltip}
      </Tooltip>
    )}
  >
    <span tabIndex={0} className={`badge ${className}`} {...props}>
      {children}
    </span>
  </OverlayTrigger>
);

export default TooltipBadge;
