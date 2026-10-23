"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { CustomSelect } from "./custom-select";
import { useUiCopy } from "./use-ui-copy";
import styles from "./date-picker.module.css";

// Calendar arithmetic uses UTC civil dates; values remain YYYY-MM-DD (WIB filter dates).
function date(value: string) {
  return new Date(`${value}T12:00:00Z`);
}
function iso(value: Date) {
  return value.toISOString().slice(0, 10);
}
function move(value: string, days: number) {
  const result = date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return iso(result);
}
function month(value: string, offset: number) {
  const result = date(value),
    day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + offset);
  const last = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return iso(result);
}

export function DatePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const { locale, uiText } = useUiCopy();
  const heading = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);
  const [view, setView] = useState(value);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const current = date(view || today);
  const year = current.getUTCFullYear(),
    index = current.getUTCMonth();
  const first = new Date(Date.UTC(year, index, 1));
  const start = move(iso(first), -((first.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => move(start, i));
  const format = (day: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
      date(day),
    );
  const close = () => setOpen(false);
  const choose = (day: string) => {
    onChange(day);
    close();
  };
  const navigate = (day: string) => {
    setView(day);
    setActive(day);
  };

  useEffect(() => {
    const element = dialog.current;
    if (!open) {
      element?.close();
      return;
    }
    element?.showModal();
    const button = trigger.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      element?.close();
      button?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (open)
      dialog.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)
        ?.focus();
  }, [open, active]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    let target: string | undefined;
    if (event.key === "ArrowLeft") target = move(day, -1);
    if (event.key === "ArrowRight") target = move(day, 1);
    if (event.key === "ArrowUp") target = move(day, -7);
    if (event.key === "ArrowDown") target = move(day, 7);
    if (event.key === "Home")
      target = move(day, -((date(day).getUTCDay() + 6) % 7));
    if (event.key === "End")
      target = move(day, 6 - ((date(day).getUTCDay() + 6) % 7));
    if (event.key === "PageUp") target = month(day, event.shiftKey ? -12 : -1);
    if (event.key === "PageDown") target = month(day, event.shiftKey ? 12 : 1);
    if (target) {
      event.preventDefault();
      navigate(target);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        data-value={value}
        aria-label={uiText(ariaLabel)}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          const initial = value || today;
          navigate(initial);
          setOpen(true);
        }}
      >
        <span>
          {value
            ? format(value, { day: "2-digit", month: "short", year: "numeric" })
            : uiText("Pilih tanggal")}
        </span>
        <CalendarDays size={17} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={heading}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <header className={styles.heading}>
          <h2 id={heading}>{uiText(ariaLabel)}</h2>
          <button type="button" aria-label={uiText("Tutup")} onClick={close}>
            <X size={19} />
          </button>
        </header>
        <div className={styles.navigation}>
          <button
            type="button"
            aria-label={uiText("Bulan sebelumnya")}
            onClick={() => navigate(month(view || today, -1))}
          >
            <ChevronLeft size={19} />
          </button>
          <CustomSelect
            compact
            ariaLabel={uiText("Bulan")}
            value={String(index)}
            onChange={(value) =>
              navigate(iso(new Date(Date.UTC(year, Number(value), 1))))
            }
            options={Array.from({ length: 12 }, (_, i) => ({
              value: String(i),
              label: format(iso(new Date(Date.UTC(year, i, 1))), {
                month: "long",
              }),
            }))}
          />
          <CustomSelect
            compact
            ariaLabel={uiText("Tahun")}
            value={String(year)}
            onChange={(value) =>
              navigate(iso(new Date(Date.UTC(Number(value), index, 1))))
            }
            options={Array.from({ length: 201 }, (_, i) => year - 100 + i)
              .filter((y) => y > 99 && y < 10000)
              .map((y) => ({ value: String(y), label: String(y) }))}
          />
          <button
            type="button"
            aria-label={uiText("Bulan berikutnya")}
            onClick={() => navigate(month(view || today, 1))}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <div
          role="grid"
          aria-label={format(view || today, { month: "long", year: "numeric" })}
          className={styles.grid}
        >
          <div role="row" className={styles.weekdays}>
            {Array.from({ length: 7 }, (_, i) => (
              <span role="columnheader" key={i}>
                {format(move("2026-01-05", i), { weekday: "short" })}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, row) => (
            <div role="row" className={styles.week} key={row}>
              {days.slice(row * 7, row * 7 + 7).map((day) => (
                <button
                  type="button"
                  role="gridcell"
                  key={day}
                  data-date={day}
                  data-outside={date(day).getUTCMonth() !== index}
                  aria-selected={day === value}
                  aria-current={day === today ? "date" : undefined}
                  aria-label={format(day, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  tabIndex={day === active ? 0 : -1}
                  onKeyDown={(event) => onKeyDown(event, day)}
                  onClick={() => choose(day)}
                >
                  {date(day).getUTCDate()}
                </button>
              ))}
            </div>
          ))}
        </div>
        <footer className={styles.footer}>
          <button type="button" onClick={close}>
            {uiText("Batal")}
          </button>
          <button type="button" onClick={() => choose(today)}>
            {uiText("Hari ini")}
          </button>
        </footer>
      </dialog>
    </>
  );
}
