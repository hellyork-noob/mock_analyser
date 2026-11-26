import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
// Render beside the main layout, outside cards whose backdrop-filter creates
// a containing block for fixed descendants. Keep the app's theme inheritance.
export default function ModalPortal({ children }: {
    children: ReactNode;
}) {
    const layer = useRef<HTMLDivElement>(null);
    const host = document.querySelector<HTMLElement>(".app") ?? document.body;
    useEffect(() => {
        const previousFocus = document.activeElement as HTMLElement | null;
        const main = host.querySelector<HTMLElement>(":scope > main");
        const previousBodyOverflow = document.body.style.overflow;
        const previousMainOverflow = main?.style.overflow;
        document.body.style.overflow = "hidden";
        if (main)
            main.style.overflow = "hidden";
        const focusable = () => Array.from(layer.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
        focusable()[0]?.focus({ preventScroll: true });
        const trapFocus = (event: KeyboardEvent) => {
            if (event.key !== "Tab")
                return;
            const elements = focusable();
            const first = elements[0], last = elements[elements.length - 1];
            if (!first)
                return;
            if (event.shiftKey && (document.activeElement === first || !layer.current?.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && (document.activeElement === last || !layer.current?.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", trapFocus);
        return () => {
            document.removeEventListener("keydown", trapFocus);
            document.body.style.overflow = previousBodyOverflow;
            if (main)
                main.style.overflow = previousMainOverflow ?? "";
            if (previousFocus?.isConnected)
                previousFocus.focus({ preventScroll: true });
        };
    }, [host]);
    return createPortal(<div className="modal-layer" ref={layer}>{children}</div>, host);
}
