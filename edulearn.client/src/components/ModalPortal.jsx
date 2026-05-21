import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * ModalPortal — renders children directly into document.body
 * so they are never clipped by any scroll container.
 * Usage: wrap any modal JSX with <ModalPortal>...</ModalPortal>
 */
export default function ModalPortal({ children }) {
    const el = useRef(document.createElement('div'));

    useEffect(() => {
        const portalRoot = document.body;
        portalRoot.appendChild(el.current);
        // Lock body scroll while portal is mounted
        document.body.style.overflow = 'hidden';
        return () => {
            portalRoot.removeChild(el.current);
            document.body.style.overflow = '';
        };
    }, []);

    return createPortal(children, el.current);
}
