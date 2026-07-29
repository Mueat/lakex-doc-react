/**
 * Lakex adapter for the upstream Drawnix editor.
 *
 * The drawing engine and interaction plugins deliberately stay upstream.
 * This layer maps Lakex card data, locale, theme and product-specific chrome.
 */
import React from "react";
import { Drawnix } from "lakex-drawnix";
import {
  addSelectedElement,
  BoardTransforms,
  clearSelectedElement,
  getHitElementByPoint,
  getViewportOrigination,
  getSelectedElements,
  PlaitBoard,
  ThemeColorMode,
  Transforms,
  toImage,
  type PlaitElement,
  type Viewport,
} from "@plait/core";
import {
  BoardCreationMode,
  buildText,
  getTextEditorsByElement,
  getTextManages,
  setCreationMode,
} from "@plait/common";
import {
  ArrowLineMarkerType,
  ArrowLineShape,
  BasicShapes,
  createArrowLineElement,
  createTextElement,
  DrawTransforms,
  FlowchartSymbols,
  getTextShapeProperty,
  UMLSymbols,
} from "@plait/draw";
import {
  createEmptyMind,
  createMindElement,
  getDefaultFontSizeForMindElement,
  MindTransforms,
} from "@plait/mind";
import {
  PlaitMarkEditor,
  TextTransforms,
  type FontSizes,
} from "@plait/text-plugins";
import LakexShapeCatalog from "./LakexShapeCatalog";
import LakexExportMenu from "./LakexExportMenu";
import LakexMaterialLibrary, {
  type LakexMaterialLibraryHandle,
} from "./LakexMaterialLibrary";
import LakexBoardContextMenu from "./LakexBoardContextMenu";
import type { DrawingBoardPreset, IDrawingBoardCardValue } from "./types";
import "./DrawnixBoardCore.css";

type Locale = "zh-CN" | "en-US";
type BoardTheme = "light" | "dark" | "system";

const insertArrow = (board: PlaitBoard, start: [number, number], end: [number, number]) => {
  const arrow = createArrowLineElement(
    ArrowLineShape.straight,
    [start, end],
    { marker: ArrowLineMarkerType.none },
    { marker: ArrowLineMarkerType.arrow },
  );
  Transforms.insertNode(board, arrow, [board.children.length]);
};

const PRESET_SCALE = 0.8;

const scalePresetPoint = (
  point: [number, number],
  origin: [number, number],
): [number, number] => [
  origin[0] + (point[0] - origin[0]) * PRESET_SCALE,
  origin[1] + (point[1] - origin[1]) * PRESET_SCALE,
];

const PRESET_LABEL_FONT_SIZE = "12";
const PRESET_LABEL_MIN_WIDTH = 56;
const PRESET_LABEL_MIN_HEIGHT = 20;

const insertLabel = (board: PlaitBoard, point: [number, number], text: string) => {
  const label = buildText(text, undefined, { "font-size": PRESET_LABEL_FONT_SIZE });
  const textSize = getTextShapeProperty(board, label, PRESET_LABEL_FONT_SIZE);
  const width = Math.max(textSize.width, PRESET_LABEL_MIN_WIDTH);
  const height = Math.max(textSize.height, PRESET_LABEL_MIN_HEIGHT);
  const element = createTextElement(
    board,
    [point, [point[0] + width, point[1] + height]],
    label,
  );
  Transforms.insertNode(board, element, [board.children.length]);
};

const insertPresetScene = (
  board: PlaitBoard,
  preset: DrawingBoardPreset,
  locale: Locale,
) => {
  const zh = locale === "zh-CN";
  if (preset === "flowchart") {
    const point = (value: [number, number]) => scalePresetPoint(value, [540, 370]);
    DrawTransforms.insertGeometry(board, [point([460, 120]), point([620, 180])], FlowchartSymbols.terminal);
    DrawTransforms.insertGeometry(board, [point([460, 250]), point([620, 320])], FlowchartSymbols.process);
    DrawTransforms.insertGeometry(board, [point([460, 390]), point([620, 490])], FlowchartSymbols.decision);
    DrawTransforms.insertGeometry(board, [point([460, 560]), point([620, 620])], FlowchartSymbols.terminal);
    insertLabel(board, point([515, 142]), zh ? "开始" : "Start");
    insertLabel(board, point([500, 272]), zh ? "处理" : "Process");
    insertLabel(board, point([515, 425]), zh ? "判断" : "Decision");
    insertLabel(board, point([515, 580]), zh ? "结束" : "End");
    insertArrow(board, point([540, 180]), point([540, 250]));
    insertArrow(board, point([540, 320]), point([540, 390]));
    insertArrow(board, point([540, 490]), point([540, 560]));
    return;
  }

  if (preset === "uml") {
    const point = (value: [number, number]) => scalePresetPoint(value, [625, 315]);
    DrawTransforms.insertGeometry(board, [point([230, 245]), point([350, 365])], UMLSymbols.actor);
    DrawTransforms.insertGeometry(board, [point([470, 260]), point([670, 350])], UMLSymbols.useCase);
    DrawTransforms.insertGeometry(board, [point([790, 205]), point([1020, 405])], UMLSymbols.class);
    insertLabel(board, point([260, 385]), zh ? "用户" : "User");
    insertLabel(board, point([525, 292]), zh ? "提交申请" : "Submit request");
    insertLabel(board, point([850, 425]), zh ? "申请服务" : "Request service");
    insertArrow(board, point([350, 305]), point([470, 305]));
    insertArrow(board, point([670, 305]), point([790, 305]));
    return;
  }

  if (preset === "mindmap") {
    const root = createEmptyMind(board, [600, 320]);
    root.data.topic = buildText(zh ? "主题" : "Topic", undefined, { "font-size": "14" }) as any;
    root.children = [
      createMindElement(buildText(zh ? "需求" : "Requirements", undefined, { "font-size": "12" }) as any, {}),
      createMindElement(buildText(zh ? "方案" : "Solution", undefined, { "font-size": "12" }) as any, {}),
      createMindElement(buildText(zh ? "计划" : "Plan", undefined, { "font-size": "12" }) as any, {}),
    ];
    root.rightNodeCount = root.children.length;
    MindTransforms.insertMind(board as any, root);
  }
};

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
  const materialLibraryRef = React.useRef<LakexMaterialLibraryHandle | null>(null);
  const boardInteractionActiveRef = React.useRef(false);
  const [board, setBoard] = React.useState<PlaitBoard | null>(null);
  const [shapeCatalogOpen, setShapeCatalogOpen] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenuHasSelection, setContextMenuHasSelection] =
    React.useState(false);
  const normalizeTextScheduledRef = React.useRef(false);
  const exportSnapshotTimerRef = React.useRef<number | null>(null);
  const exportSnapshotVersionRef = React.useRef(0);
  const presetFrameRef = React.useRef<number | null>(null);
  const presetFitFrameRef = React.useRef<number | null>(null);
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
    if (!board || readOnly || typeof window === "undefined") return;

    const updateBoardInteractionState = (event: PointerEvent) => {
      const root = rootRef.current;
      const path = event.composedPath();
      if (
        root &&
        path.some((target) => target instanceof Node && root.contains(target))
      ) {
        boardInteractionActiveRef.current = true;
        return;
      }
      // Native Drawnix popups are portalled outside the board but belong to
      // the current board interaction. Clicking one must not deactivate it.
      if (
        path.some(
          (target) =>
            target instanceof Element &&
            !!target.closest(".plait-board-attached"),
        )
      ) {
        return;
      }
      boardInteractionActiveRef.current = false;
    };

    const protectBoardDeleteShortcut = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (
        !boardInteractionActiveRef.current &&
        !PlaitBoard.isFocus(board)
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const root = rootRef.current;
      const editable = target?.closest(
        'input, textarea, select, [contenteditable="true"]',
      );
      // Do not mistake Lakex's outer contenteditable editor root for a
      // Drawnix text editor. Only a real form control or an editable node
      // contained by this board should receive the native editing shortcut.
      if (
        target?.matches("input, textarea, select") ||
        (editable && root?.contains(editable))
      ) {
        return;
      }

      // Lakex owns a document-level card deletion shortcut, while Drawnix
      // normally receives the same event later from a window bubble listener.
      // Handle the shortcut at the earliest boundary, then keep it out of the
      // host editor so deleting a selected drawing never removes the card.
      event.preventDefault();
      event.stopImmediatePropagation();
      board.globalKeyDown(event);
      board.keyDown(event);
    };

    window.addEventListener(
      "pointerdown",
      updateBoardInteractionState,
      true,
    );
    window.addEventListener("keydown", protectBoardDeleteShortcut, true);
    return () => {
      window.removeEventListener(
        "pointerdown",
        updateBoardInteractionState,
        true,
      );
      window.removeEventListener("keydown", protectBoardDeleteShortcut, true);
      boardInteractionActiveRef.current = false;
    };
  }, [board, readOnly]);

  React.useEffect(() => {
    if (!shapeCatalogOpen) return;
    // Dismiss any native creation popover before opening the custom shape
    // catalog in the same toolbar area.
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  }, [shapeCatalogOpen]);

  const incomingScene = (value?.plaitValue || []) as PlaitElement[];
  const incomingSceneSignature = JSON.stringify(incomingScene);
  const [scene, setScene] = React.useState<PlaitElement[]>(incomingScene);
  const sceneSignatureRef = React.useRef(incomingSceneSignature);
  const viewport = value?.plaitViewport as Viewport | undefined;

  // Lakex persists each board operation back into the card. Keep the board's
  // own array reference for that round trip: feeding a cloned-but-identical
  // value back to Drawnix makes its wrapper fit the viewport again.
  React.useEffect(() => {
    if (incomingSceneSignature === sceneSignatureRef.current) return;
    sceneSignatureRef.current = incomingSceneSignature;
    setScene(incomingScene);
  }, [incomingScene, incomingSceneSignature]);

  const scheduleExportSnapshot = React.useCallback(
    (targetBoard: PlaitBoard) => {
      if (!onChange || typeof window === "undefined") return;
      if (exportSnapshotTimerRef.current !== null) {
        window.clearTimeout(exportSnapshotTimerRef.current);
      }
      const snapshotVersion = ++exportSnapshotVersionRef.current;
      exportSnapshotTimerRef.current = window.setTimeout(() => {
        void toImage(targetBoard, { padding: 16 })
          .then((previewImage) => {
            if (snapshotVersion !== exportSnapshotVersionRef.current) return;
            if (previewImage) onChange({ previewImage });
          })
          .catch(() => {
            // Image export must not interrupt normal board editing, for
            // example when a pasted cross-origin image cannot be serialized.
          });
      }, 250);
    },
    [onChange],
  );

  React.useEffect(
    () => () => {
      if (exportSnapshotTimerRef.current !== null) {
        window.clearTimeout(exportSnapshotTimerRef.current);
      }
      if (presetFrameRef.current !== null) {
        window.cancelAnimationFrame(presetFrameRef.current);
      }
      if (presetFitFrameRef.current !== null) {
        window.cancelAnimationFrame(presetFitFrameRef.current);
      }
    },
    [],
  );
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

  const isBoardCanvasTarget = (target: EventTarget | null) => {
    const element = target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
    if (!element?.closest(".plait-board-container")) return false;
    return !element.closest(
      ".draw-toolbar, .plait-board-attached, [role=dialog], [data-lakex-shape-catalog]",
    );
  };

  const getBoardPointAt = (
    clientX: number,
    clientY: number,
  ): [number, number] | null => {
    const targetBoard = boardRef.current;
    if (!targetBoard) return null;
    const container = PlaitBoard.getBoardContainer(targetBoard).getBoundingClientRect();
    const origin = getViewportOrigination(targetBoard) ?? [0, 0];
    const zoom = targetBoard.viewport.zoom || 1;
    return [
      origin[0] + (clientX - container.left) / zoom,
      origin[1] + (clientY - container.top) / zoom,
    ];
  };

  const getContextMenuBoardPoint = () =>
    contextMenuPosition
      ? getBoardPointAt(contextMenuPosition.x, contextMenuPosition.y)
      : null;

  const insertContextText = () => {
    const targetBoard = boardRef.current;
    const point = getContextMenuBoardPoint();
    if (!targetBoard || !point) return;
    DrawTransforms.insertText(targetBoard, point, locale === "zh-CN" ? "文本" : "Text");
  };

  const insertContextShape = () => {
    const targetBoard = boardRef.current;
    const point = getContextMenuBoardPoint();
    if (!targetBoard || !point) return;
    DrawTransforms.insertGeometry(
      targetBoard,
      [point, [point[0] + 160, point[1] + 88]],
      BasicShapes.roundRectangle,
    );
  };

  const insertContextLine = () => {
    const targetBoard = boardRef.current;
    const point = getContextMenuBoardPoint();
    if (!targetBoard || !point) return;
    insertArrow(targetBoard, point, [point[0] + 180, point[1]]);
  };

  const setContextActualSize = () => {
    const targetBoard = boardRef.current;
    if (!targetBoard) return;
    BoardTransforms.updateViewport(
      targetBoard,
      getViewportOrigination(targetBoard) ?? [0, 0],
      1,
    );
  };

  const preserveContextSelection = (clientX: number, clientY: number) => {
    const targetBoard = boardRef.current;
    const point = getBoardPointAt(clientX, clientY);
    if (!targetBoard || !point) return false;
    // A right click on an unselected shape should operate on that shape.
    // More importantly, do this before Drawnix's native mouse handlers can
    // clear the current selection as focus leaves the canvas.
    if (!getSelectedElements(targetBoard).length) {
      const hitElement = getHitElementByPoint(targetBoard, point);
      if (hitElement) {
        clearSelectedElement(targetBoard);
        addSelectedElement(targetBoard, hitElement);
      }
    }
    return materialLibraryRef.current?.captureSelection() ??
      getSelectedElements(targetBoard).length > 0;
  };

  return (
    <div
      ref={rootRef}
      className={`lakex-drawnix-core ${
        readOnly ? "lakex-drawnix-core--readonly" : ""
      }`}
      data-theme={isDark ? "dark" : "light"}
      onPointerDownCapture={(event) => {
        if (event.button === 2 && isBoardCanvasTarget(event.target)) {
          event.preventDefault();
          event.stopPropagation();
          preserveContextSelection(event.clientX, event.clientY);
          return;
        }
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
      onContextMenuCapture={(event) => {
        if (!isBoardCanvasTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        boardInteractionActiveRef.current = true;
        setContextMenuHasSelection(
          preserveContextSelection(event.clientX, event.clientY),
        );
        setShapeCatalogOpen(false);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
      }}
      onKeyDown={(event) => {
        const target = event.target as Element | null;
        const isTextEditingTarget = !!target?.closest(
          '[contenteditable="true"], input, textarea, select',
        );
        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          isTextEditingTarget
        ) {
          // Slate handles the deletion at the editing target. Stop afterward
          // so Lakex's ancestor card shortcut cannot delete the whole board.
          event.stopPropagation();
          return;
        }
        if (event.key === "Enter" && isTextEditingTarget) {
          // Let Slate process Enter at its target, but keep the event from
          // reaching Drawnix's document-level board hotkey afterwards.
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
          const preset = value?.preset;
          if (
            !readOnly &&
            preset &&
            preset !== "drawing" &&
            !value?.presetInitialized &&
            board.children.length === 0
          ) {
            // Board creation and its first viewport measurement happen in
            // separate passive effects. Mind children need their root's
            // renderer first, so create every preset on the next frame.
            presetFrameRef.current = window.requestAnimationFrame(() => {
              presetFrameRef.current = null;
              if (boardRef.current !== board || board.children.length > 0) return;
              insertPresetScene(board, preset, locale);
              onChange?.({ presetInitialized: true });
              // Let Drawnix mount the inserted nodes before asking Plait for
              // their bounds, then use its native fit behavior to center the
              // starter diagram in the visible canvas.
              presetFitFrameRef.current = window.requestAnimationFrame(() => {
                presetFitFrameRef.current = null;
                if (boardRef.current === board) {
                  BoardTransforms.fitViewport(board);
                }
              });
            });
          }
          scheduleTextAutoSize(board);
          scheduleExportSnapshot(board);
        }}
        onChange={() => {
          if (boardRef.current) scheduleTextAutoSize(boardRef.current);
        }}
        onValueChange={(plaitValue) => {
          sceneSignatureRef.current = JSON.stringify(plaitValue);
          setScene(plaitValue);
          if (boardRef.current) {
            scheduleTextAutoSize(boardRef.current);
            scheduleExportSnapshot(boardRef.current);
          }
          onChange?.({ version: 2, engine: "drawnix", plaitValue });
        }}
        onViewportChange={(plaitViewport) =>
          onChange?.({ version: 2, engine: "drawnix", plaitViewport })
        }
      />
      {!readOnly && (
        <>
          <LakexShapeCatalog
            board={board}
            locale={locale}
            open={shapeCatalogOpen}
            onClose={() => setShapeCatalogOpen(false)}
          />
          <LakexMaterialLibrary
            ref={materialLibraryRef}
            board={board}
            locale={locale}
            dark={isDark}
            toolbarHost={rootRef.current?.querySelector(
              ".draw-toolbar .stack_horizontal",
            ) ?? null}
            onOpen={() => setShapeCatalogOpen(false)}
          />
          <LakexExportMenu
            board={board}
            locale={locale}
            toolbarHost={rootRef.current?.querySelector(
              ".draw-toolbar .stack_horizontal",
            ) ?? null}
          />
          <LakexBoardContextMenu
            board={board}
            locale={locale}
            dark={isDark}
            hasContextSelection={contextMenuHasSelection}
            position={contextMenuPosition}
            onClose={() => {
              setContextMenuPosition(null);
              setContextMenuHasSelection(false);
            }}
            onAddText={insertContextText}
            onAddShape={insertContextShape}
            onAddLine={insertContextLine}
            onFitToCanvas={() => {
              if (boardRef.current) BoardTransforms.fitViewport(boardRef.current);
            }}
            onActualSize={setContextActualSize}
            onAddToMaterialLibrary={() =>
              materialLibraryRef.current?.addSelectionToLibrary() ?? false
            }
          />
        </>
      )}
    </div>
  );
}
