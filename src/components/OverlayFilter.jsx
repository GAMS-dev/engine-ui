import { useState, useRef, useEffect } from 'react';
import { OverlayTrigger, Tooltip, FormControl } from 'react-bootstrap';
import { Filter } from 'lucide-react';

const OverlayFilter = ({ width, filterKey, onChange, resetFilter }) => {
  const [showTT, setShowTT] = useState(false);
  const [filterVal, setFilterVal] = useState('');
  const target = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setFilterVal('');
  }, [resetFilter]);

  useEffect(() => {
    if (!showTT) {
      return;
    }
    // Focusing as soon as the input mounts (e.g. via autoFocus) can jump the
    // page's scroll position: the overlay is rendered in a portal and only
    // gets positioned next to its trigger by Popper on a later frame, so at
    // the moment of focus it can briefly sit wherever the portal happens to
    // be in the DOM flow - the very bottom of a long table, for one.
    // preventScroll stops the browser from scrolling to chase that.
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [showTT]);

  return (
    <>
      <OverlayTrigger
        placement="bottom"
        show={showTT}
        rootClose
        trigger="click"
        onToggle={() => setShowTT(!showTT)}
        overlay={
          <Tooltip>
            <FormControl
              ref={inputRef}
              placeholder="Filter"
              aria-label="Filter"
              value={filterVal}
              onChange={(e) => {
                setFilterVal(e.target.value);
                onChange(filterKey, e.target.value);
              }}
            />
          </Tooltip>
        }
      >
        <span ref={target}>
          <Filter size={width} />
        </span>
      </OverlayTrigger>
    </>
  );
};

export default OverlayFilter;
