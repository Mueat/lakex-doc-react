/**
 * Lakex adapter for the upstream Drawnix editor.
 *
 * The drawing engine and interaction plugins deliberately stay upstream.
 * This layer maps Lakex card data, locale, theme and product-specific chrome.
 */
import React from "react";
import { Drawnix } from "lakex-drawnix";
import {
  BoardTransforms,
  getSelectedElements,
  PlaitBoard,
  ThemeColorMode,
  Transforms,
  type PlaitElement,
  type Viewport,
} from "@plait/core";
import {
  BoardCreationMode,
  getTextEditorsByElement,
  getTextManages,
  setCreationMode,
} from "@plait/common";
import { BasicShapes } from "@plait/draw";
import { getDefaultFontSizeForMindElement } from "@plait/mind";
import {
  PlaitMarkEditor,
  TextTransforms,
  type FontSizes,
} from "@plait/text-plugins";
import LakexShapeCatalog from "./LakexShapeCatalog";
import type { IDrawingBoardCardValue } from "./types";
import "./DrawnixBoardCore.css";

type Locale = "zh-CN" | "en-US";
type BoardTheme = "light" | "dark" | "system";

interface Props {
  value?: IDrawingBoardCardValue | null;
  readOnly?: boolean;
  locale: Locale;
  theme: BoardTheme;
  onChange?: (value: Partial<IDrawingBoardCardValue>) => void;
}

function useSystemDark(enabled: boolean) {
  const [isDark, setIsDark] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [enabled]);

  return isDark;
}

export default function DrawnixBoardCore({
  value,
  readOnly,
  locale,
  theme,
  onChange,
}: Props) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const boardRef = React.useRef<PlaitBoard | null>(null);
  const [board, setBoard] = React.useState<PlaitBoard | null>(null);
  const [shapeCatalogOpen, setShapeCatalogOpen] = React.useState(false);
  const normalizeTextScheduledRef = React.useRef(false);
  const systemDark = useSystemDark(theme === "system");
  const isDark = theme === "dark" || (theme === "system" && systemDark);
  const themeColorMode = isDark ? ThemeColorMode.dark : ThemeColorMode.default;
  const language = locale === "zh-CN" ? "zh" : "en";
  React.useEffect(() => {
    if (boardRef.current) {
      BoardTransforms.updateThemeColor(boardRef.current, themeColorMode);
    }
  }, [themeColorMode]);

  React.useEffect(() => {
    if (!shapeCatalogOpen) return;
    // Dismiss any native creation popover before opening the custom shape
    // catalog in the same toolbar area.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  }, [shapeCatalogOpen]);

  const scene = (value?.plaitValue || []) as PlaitElement[];
  const viewport = value?.plaitViewport as Viewport | undefined;
  const scheduleTextAutoSize = (targetBoard: PlaitBoard) => {
    if (normalizeTextScheduledRef.current) return;
    normalizeTextScheduledRef.current = true;
    window.setTimeout(() => {
      normalizeTextScheduledRef.current = false;
      for (const element of targetBoard.children) {
        const text = element as PlaitElement & {
          shape?: string;
          autoSize?: boolean;
        };
        if (text.shape === BasicShapes.text && text.autoSize !== true) {
          Transforms.setNode(
            targetBoard,
            { autoSize: true },
            PlaitBoard.findPath(targetBoard, element),
          );
        }
      }
    }, 0);
  };

  /**
   * The native font-size popup updates Slate first. Mind nodes measure their
   * foreignObject in the same turn, so a freshly-created node can still be
   * measured with the previous mark on the first click. Reconcile after the
   * popup event has committed, using the native TextTransforms API only when
   * the serialized node mark is actually behind the requested value.
   */
  const syncFontSizeAfterNativePopup = React.useCallback(() => {
    const targetBoard = boardRef.current;
    if (!targetBoard || typeof window === "undefined") return;

    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const input = document.querySelector<HTMLInputElement>(
          ".popup-font-size__input",
        );
        const size = Number(input?.value);
        if (!Number.isFinite(size) || size <= 0) return;

        getSelectedElements(targetBoard).forEach((element) => {
          const editors = getTextEditorsByElement(element);
          if (!editors.length) return;

          const serializedText =
            (
              element as PlaitElement & {
                data?: { topic?: unknown };
                text?: unknown;
              }
            ).data?.topic ??
            (element as PlaitElement & { text?: unknown }).text;
          const marks = serializedText
            ? (PlaitMarkEditor.getMarksByElement(serializedText as any) as Record<
                string,
                unknown
              >)
            : {};
          let defaultFontSize = 14;
          try {
            defaultFontSize =
              getDefaultFontSizeForMindElement(element as any) ??
              defaultFontSize;
          } catch {
            // Non-mind text elements use the text plugin's default size.
          }
          const currentSize = Number(marks["font-size"] ?? defaultFontSize);
          if (currentSize !== size) {
            TextTransforms.setFontSize(
              targetBoard,
              String(size) as FontSizes,
              defaultFontSize,
              editors,
            );
          }
        });

        // Let the board finish its context update before refreshing the
        // foreignObject rectangles used by mind-node text managers.
        window.requestAnimationFrame(() => {
          getSelectedElements(targetBoard).forEach((element) => {
            getTextManages(element).forEach((manage) =>
              manage.updateRectangle(),
            );
          });
        });
      });
    }, 0);
  }, []);

  React.useEffect(() => {
    if (!board) return;

    const isFontSizeTarget = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      return !!element?.closest(
        ".popup-font-size, .popup-font-size__stepper-button",
      );
    };
    const onPointerUp = (event: PointerEvent) => {
      if (isFontSizeTarget(event.target)) syncFontSizeAfterNativePopup();
    };
    const onBlur = (event: FocusEvent) => {
      if (isFontSizeTarget(event.target)) syncFontSizeAfterNativePopup();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && isFontSizeTarget(event.target)) {
        syncFontSizeAfterNativePopup();
      }
    };

    // The native popups may be rendered in a portal, so listen at document
    // capture phase instead of relying on the board wrapper's bubbling path.
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("blur", onBlur, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("blur", onBlur, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [board, syncFontSizeAfterNativePopup]);

  const isShapeTrigger = (target: EventTarget | null) => {
    const element = target instanceof Element ? target : null;
    const trigger = element?.closest<HTMLElement>(".draw-toolbar [title]");
    return (
      trigger?.getAttribute("title") === "形状" ||
      trigger?.getAttribute("title") === "Shape"
    );
  };

  return (
    <div
      ref={rootRef}
      className={`lakex-drawnix-core ${
        readOnly ? "lakex-drawnix-core--readonly" : ""
      }`}
      data-theme={isDark ? "dark" : "light"}
      onPointerDownCapture={(event) => {
        if (isShapeTrigger(event.target)) {
          event.preventDefault();
          event.stopPropagation();
          if (boardRef.current) {
            Transforms.setSelection(boardRef.current, null);
            setCreationMode(boardRef.current, BoardCreationMode.drawing);
            BoardTransforms.updatePointerType(
              boardRef.current,
              BasicShapes.rectangle,
            );
          }
          setShapeCatalogOpen((current) => !current);
          return;
        }
        const target = event.target as Element | null;
        if (shapeCatalogOpen && !target?.closest("[data-lakex-shape-catalog]")) {
          setShapeCatalogOpen(false);
        }
      }}
      onClickCapture={(event) => {
        if (isShapeTrigger(event.target)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <Drawnix
        key={language}
        value={scene}
        viewport={viewport}
        theme={{ themeColorMode }}
        initialLanguage={language}
        tutorial={false}
        afterInit={(board) => {
          boardRef.current = board;
          setBoard(board);
          board.options.readonly = !!readOnly;
          BoardTransforms.updateThemeColor(board, themeColorMode);
          scheduleTextAutoSize(board);
        }}
        onChange={() => {
          if (boardRef.current) scheduleTextAutoSize(boardRef.current);
        }}
        onValueChange={(plaitValue) => {
          if (boardRef.current) {
            scheduleTextAutoSize(boardRef.current);
          }
          onChange?.({ version: 2, engine: "drawnix", plaitValue });
        }}
        onViewportChange={(plaitViewport) =>
          onChange?.({ version: 2, engine: "drawnix", plaitViewport })
        }
      />
      {!readOnly && (
        <LakexShapeCatalog
          board={board}
          locale={locale}
          open={shapeCatalogOpen}
          onClose={() => setShapeCatalogOpen(false)}
        />
      )}
    </div>
  );
}
