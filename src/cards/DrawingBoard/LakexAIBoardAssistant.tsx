import React from "react";
import { createPortal } from "react-dom";
import type { PlaitElement } from "@plait/core";
import type { DrawingBoardAIConfig } from "../../components/lakex/types";
import {
  convertAIBoardDocument,
  DRAWING_BOARD_AI_SYSTEM_PROMPT,
  parseAIBoardDocument,
} from "./aiBoardSchema";

type Locale = "zh-CN" | "en-US";
export type AIBoardApplyMode = "replace" | "append";

interface Props {
  ai?: DrawingBoardAIConfig;
  locale: Locale;
  dark: boolean;
  toolbarHost: Element | null;
  overlayHost: Element | null;
  onOpen?: () => void;
  onApply: (elements: PlaitElement[], mode: AIBoardApplyMode) => void;
}

const copy = {
  "zh-CN": {
    tooltip: "AI 画板助手",
    title: "AI 画板助手",
    description: "描述你想生成的图，AI 会创建可继续编辑的图形和连线。",
    placeholder:
      "例如：生成一个用户登录流程图，包含输入账号、校验密码、登录成功和失败重试，并标注判断分支。",
    replace: "替换当前画布",
    append: "添加到当前画布",
    cancel: "取消",
    generate: "生成",
    generating: "正在生成…",
    shortcut: "⌘/Ctrl + Enter 生成",
    missing:
      "尚未配置 AI 服务。请通过 config.drawingBoardAI.generate 注入项目的模型调用。",
    empty: "请先输入图的详细描述。",
    invalid: "AI 返回的数据不符合画板 JSON 规范，请重试或让模型减少图形数量。",
    failed: "生成失败，请检查 AI 服务后重试。",
  },
  "en-US": {
    tooltip: "AI board assistant",
    title: "AI board assistant",
    description:
      "Describe a diagram and AI will create editable shapes and connectors.",
    placeholder:
      "For example: Create a user login flowchart with credentials, password validation, success, and retry branches.",
    replace: "Replace canvas",
    append: "Add to canvas",
    cancel: "Cancel",
    generate: "Generate",
    generating: "Generating…",
    shortcut: "⌘/Ctrl + Enter to generate",
    missing:
      "AI is not configured. Provide config.drawingBoardAI.generate from your application.",
    empty: "Describe the diagram first.",
    invalid:
      "The AI response does not match the board JSON specification. Please try again.",
    failed: "Generation failed. Check the AI service and try again.",
  },
} as const;

export default function LakexAIBoardAssistant({
  ai,
  locale,
  dark,
  toolbarHost,
  overlayHost,
  onOpen,
  onApply,
}: Props) {
  const t = copy[locale];
  const [open, setOpen] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [mode, setMode] = React.useState<AIBoardApplyMode>("replace");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const close = React.useCallback(() => {
    if (loading) return;
    setOpen(false);
    setError("");
  }, [loading]);

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() =>
      textareaRef.current?.focus(),
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [close, open]);

  const generate = React.useCallback(async () => {
    const prompt = description.trim();
    if (!prompt) {
      setError(t.empty);
      textareaRef.current?.focus();
      return;
    }
    if (!ai) {
      setError(t.missing);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await ai.generate({
        description: prompt,
        systemPrompt: DRAWING_BOARD_AI_SYSTEM_PROMPT,
        locale,
      });
      const document = parseAIBoardDocument(response);
      onApply(convertAIBoardDocument(document), mode);
      setOpen(false);
      setDescription("");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(
        message.startsWith("AI_") || message.includes("JSON")
          ? t.invalid
          : message || t.failed,
      );
    } finally {
      setLoading(false);
    }
  }, [ai, description, locale, mode, onApply, t]);

  const trigger = toolbarHost
    ? createPortal(
        <div className="lakex-ai-board-trigger-wrap">
          <button
            type="button"
            className="lakex-ai-board-trigger"
            title={t.tooltip}
            data-tooltip={t.tooltip}
            aria-label={t.tooltip}
            aria-expanded={open}
            onClick={() => {
              onOpen?.();
              setError("");
              setOpen(true);
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <use
                href={`#icon-ai-board-${dark ? "dark" : "default"}`}
                xlinkHref={`#icon-ai-board-${dark ? "dark" : "default"}`}
              />
            </svg>
          </button>
        </div>,
        toolbarHost,
      )
    : null;

  const dialog =
    open && overlayHost
      ? createPortal(
          <div
            className="lakex-ai-board-overlay"
            role="presentation"
            onPointerDown={(event) => {
              event.stopPropagation();
              if (event.target === event.currentTarget) close();
            }}
          >
            <section
              className="lakex-ai-board-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="lakex-ai-board-title"
            >
              <header className="lakex-ai-board-dialog__header">
                <div>
                  <h3 id="lakex-ai-board-title">{t.title}</h3>
                  <p>{t.description}</p>
                </div>
                <button
                  type="button"
                  className="lakex-ai-board-dialog__close"
                  aria-label={t.cancel}
                  disabled={loading}
                  onClick={close}
                >
                  ×
                </button>
              </header>
              <textarea
                ref={textareaRef}
                value={description}
                maxLength={4000}
                placeholder={t.placeholder}
                disabled={loading}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    void generate();
                  }
                }}
              />
              <div className="lakex-ai-board-dialog__options">
                <label>
                  <input
                    type="radio"
                    name="lakex-ai-board-mode"
                    value="replace"
                    checked={mode === "replace"}
                    disabled={loading}
                    onChange={() => setMode("replace")}
                  />
                  {t.replace}
                </label>
                <label>
                  <input
                    type="radio"
                    name="lakex-ai-board-mode"
                    value="append"
                    checked={mode === "append"}
                    disabled={loading}
                    onChange={() => setMode("append")}
                  />
                  {t.append}
                </label>
              </div>
              {!ai && (
                <p className="lakex-ai-board-dialog__notice">{t.missing}</p>
              )}
              {error && (
                <p className="lakex-ai-board-dialog__error" role="alert">
                  {error}
                </p>
              )}
              <footer className="lakex-ai-board-dialog__footer">
                <span>{t.shortcut}</span>
                <div>
                  <button type="button" disabled={loading} onClick={close}>
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    className="lakex-ai-board-dialog__generate"
                    disabled={loading || !description.trim() || !ai}
                    onClick={() => void generate()}
                  >
                    {loading ? t.generating : t.generate}
                  </button>
                </div>
              </footer>
            </section>
          </div>,
          overlayHost,
        )
      : null;

  return (
    <>
      {trigger}
      {dialog}
    </>
  );
}
