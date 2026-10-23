"use client";
import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement } from "react";
import { useUiPreferences } from "./ui-preferences";
import { translateUi } from "@/lib/ui-copy";

/** Translate presentation copy only: never change callbacks, values, IDs, or filter state.
 * Dictionary keys are the original Indonesian copy. translate="no" protects data values.
 * This walks React elements before rendering; it never edits DOM text or calls components.
 */
function localizeTree(node: ReactNode, translate: (text: string) => string): ReactNode {
  if (typeof node === "string") return translate(node);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props;
  if (props.translate === "no") return node;
  const next: Record<string, unknown> = {};
  for (const key of ["aria-label", "aria-valuetext", "ariaLabel", "placeholder", "title", "subtitle", "alt", "data-label", "message"]) {
    if (typeof props[key] === "string") next[key] = translate(props[key]);
  }
  if (Array.isArray(props.options)) next.options = props.options.map(option =>
    option && typeof option === "object" && "label" in option && option.translate !== false ? { ...option, label: translate(String(option.label)) } : option);
  if (props.children !== undefined) next.children = Children.map(props.children as ReactNode, child => localizeTree(child, translate));
  return cloneElement(element, next);
}
export function useUiCopy() {
  const { language } = useUiPreferences();
  const locale = language === "en" ? "en-GB" : "id-ID";
  const uiText = (value: string) => translateUi(value, language);
  return {
    locale, uiText,
    localize: (node: ReactNode) => localizeTree(node, uiText),
    number: (value: number, digits = 1) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value),
  };
}
export function UiText({ value }: { value: string }) {
  const { uiText } = useUiCopy();
  return uiText(value);
}
