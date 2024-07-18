import React, { useEffect, useRef } from 'react';

function useClickOutside<T extends HTMLElement>(handler: () => void): React.RefObject<T> {
    const ref = useRef<T>(null);

    useEffect(() => {
        const listener = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                handler();
            }
        };

        document.addEventListener('mousedown', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
        };
    }, [handler]);

    return ref;
}

export default useClickOutside;