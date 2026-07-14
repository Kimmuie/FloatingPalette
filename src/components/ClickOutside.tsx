import { useEffect, useRef } from "react";
import type { ReactNode, RefObject, CSSProperties } from "react";

interface ClickOutsideProps {
  children: ReactNode;
  onOutsideClick: () => void;
  ignoreRefs?: RefObject<HTMLElement>[];
  className?: string;
  style?: CSSProperties;
}

const ClickOutside = ({ children, onOutsideClick, ignoreRefs = [], className = "", style = {} }: ClickOutsideProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node) &&
        !ignoreRefs.some((r) => r.current?.contains(event.target as Node))
      ) {
        onOutsideClick();
      }
    }
    document.addEventListener("dblclick", handleClickOutside);
    return () => {
      document.removeEventListener("dblclick", handleClickOutside);
    };
  }, [onOutsideClick, ignoreRefs]);

  return <div ref={ref} className={className} style={style}>{children}</div>;
};

export default ClickOutside;