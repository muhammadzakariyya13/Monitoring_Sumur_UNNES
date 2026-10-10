"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import styles from "./custom-select.module.css";

type Option = { value: string; label: string };
type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  placeholder?: string;
};

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  placeholder = "Pilih…",
}: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 260,
  });
  const expanded = open && !disabled;
  const selected = options.findIndex((option) => option.value === value);

  const placeMenu = useCallback(() => {
    if (!trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
    const rightEdge = leftEdge + (viewport?.width ?? innerWidth) - 16;
    const topEdge = (viewport?.offsetTop ?? 0) + 8;
    let bottomEdge = topEdge + (viewport?.height ?? innerHeight) - 16;
    // Hindari navigasi tetap milik aplikasi pada layar HP.
    const navigation = document
      .querySelector(".bottom-nav")
      ?.getBoundingClientRect();
    if (navigation && navigation.height > 0)
      bottomEdge = Math.min(bottomEdge, navigation.top - 8);
    const below = Math.max(0, bottomEdge - rect.bottom - 4);
    const above = Math.max(0, rect.top - topEdge - 4);
    const desired = Math.min(260, options.length * 44 + 10);
    const flip = below < desired && above > below;
    const height = Math.min(desired, flip ? above : below);
    const width = Math.min(Math.max(rect.width, 180), rightEdge - leftEdge);
    setPosition({
      left: Math.max(leftEdge, Math.min(rect.left, rightEdge - width)),
      top: Math.max(
        topEdge,
        Math.min(
          flip ? rect.top - height - 4 : rect.bottom + 4,
          bottomEdge - height,
        ),
      ),
      width,
      maxHeight: height,
    });
  }, [options.length]);

  function show(index = Math.max(0, selected)) {
    if (disabled || !options.length) return;
    window.dispatchEvent(new CustomEvent("tirta-select-open", { detail: id }));
    setPortalTarget(trigger.current?.closest("dialog") ?? document.body);
    placeMenu();
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    if (!options[index]) return;
    setOpen(false);
    trigger.current?.focus();
    onChange(options[index].value);
  }

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const other = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    const reposition = () => placeMenu();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("tirta-select-open", other);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
    const observer = new ResizeObserver(reposition);
    if (trigger.current) observer.observe(trigger.current);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("tirta-select-open", other);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
      observer.disconnect();
    };
  }, [expanded, id, placeMenu]);

  useEffect(() => {
    if (expanded)
      menu.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, expanded]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Escape") {
      if (expanded) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)
    ) {
      event.preventDefault();
      if (!expanded) {
        show(event.key === "End" ? options.length - 1 : Math.max(0, selected));
        return;
      }
      if (event.key === "Enter" || event.key === " ") choose(active);
      else if (event.key === "Home") setActive(0);
      else if (event.key === "End") setActive(options.length - 1);
      else
        setActive(
          (index) =>
            (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
            options.length,
        );
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      search.current = {
        text:
          (now - search.current.at < 700 ? search.current.text : "") +
          event.key.toLocaleLowerCase(),
        at: now,
      };
      const index = options.findIndex((option) =>
        option.label.toLocaleLowerCase().startsWith(search.current.text),
      );
      if (index >= 0) {
        if (!expanded) show(index);
        else setActive(index);
      }
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-controls={expanded ? id : undefined}
        aria-activedescendant={expanded ? `${id}-${active}` : undefined}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        onClick={() => (expanded ? setOpen(false) : show())}
      >
        <span>{options[selected]?.label ?? placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {expanded &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="listbox"
            aria-label={ariaLabel}
            className={styles.menu}
            style={position}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={value === option.value}
                className={`${styles.option} ${active === index ? styles.active : ""}`}
                onPointerDown={(event) => event.preventDefault()}
                onPointerMove={(event) => {
                  if (event.pointerType === "mouse") setActive(index);
                }}
                onClick={(event) => {
                  event.preventDefault();
                  choose(index);
                }}
              >
                <span className={styles.check}>
                  {value === option.value && (
                    <Check size={16} aria-hidden="true" />
                  )}
                </span>
                <span title={option.label}>{option.label}</span>
              </div>
            ))}
          </div>,
          portalTarget ?? document.body,
        )}
    </>
  );
}
