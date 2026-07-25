import { useEffect, useRef, useState, useCallback } from "react";
import Doc from "./lakex";

import type {
  LakexEditorProps,
  LakexEditorContent,
  LakexEditorContentType,
  LakexEditorConfig,
  CustomCardConfig,
  CustomCard,
} from "./types";
import GetDefaultEditorConfig from "../../configs/editor";
import React from "react";
import Icon from "./icon";
import { BlockHoverHandle } from "../BlockHoverHandle";
import { BlockContextMenu, BlockMenuAction } from "../BlockContextMenu";
import {
  deleteBlock,
  duplicateBlock,
  convertBlock,
  insertBlock,
} from "../../utils/blockDoc";

function selectBlockInEditor(editor: any, blockElement: HTMLElement): boolean {
  try {
    const domRange = document.createRange();
    domRange.selectNodeContents(blockElement);
    const modelRange = editor?.engine?.transformDOMRange?.(domRange);
    if (!modelRange) return false;
    editor.kernel.execCommand("selection", {
      focus: "end",
      anchor: "start",
      ranges: [modelRange],
    });
    return true;
  } catch {
    return false;
  }
}

function runNativeConvert(editor: any, blockElement: HTMLElement, target: string): boolean {
  if (!selectBlockInEditor(editor, blockElement)) return false;

  try {
    if (/^(p|h[1-6])$/.test(target)) {
      editor.execCommand("style", target);
    } else {
      const command: Record<string, string> = {
        quote: "quote",
        ul: "unorderedList",
        ol: "orderedList",
        taskList: "taskList",
        codeblock: "codeblock",
        hr: "hr",
        callout: "alert",
        columns: "columns2",
        collapse: "collapse",
      };
      if (!command[target]) return false;
      editor.execCommand(command[target]);
    }
    return true;
  } catch {
    return false;
  }
}

function copyDomBlock(editor: any, blockElement: HTMLElement): boolean {
  try {
    const range = document.createRange();
    range.selectNode(blockElement);
    const result = editor?.renderer?.execCommand?.("copy", range);
    return result !== false;
  } catch {
    return false;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

function mergeConfig(
  defaults: LakexEditorConfig,
  user: Partial<LakexEditorConfig> | undefined
): LakexEditorConfig {
  if (!user) return defaults;
  const result: any = { ...defaults };
  for (const key of Object.keys(user) as (keyof LakexEditorConfig)[]) {
    const v = (user as any)[key];
    const dv = (result as any)[key];
    if (
      key === "customCard" &&
      v &&
      dv &&
      typeof v === "object" &&
      typeof dv === "object"
    ) {
      // 自定义卡片默认包含 mindMapCardConfig，用户新增 cards 时做追加
      result[key] = {
        ...dv,
        ...v,
        cards: [...(dv.cards || []), ...(v.cards || [])],
      };
    } else if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      dv &&
      typeof dv === "object" &&
      !Array.isArray(dv)
    ) {
      result[key] = { ...dv, ...v };
    } else {
      result[key] = v;
    }
  }
  return result;
}

export function LakexEditor(props: LakexEditorProps) {
  const containerRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  // editor 实例的 state 镜像：用于触发悬浮手柄 / 菜单的挂载与重渲染
  // （仅用 ref 不会触发渲染，会导致 BlockHoverHandle 永不挂载）
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [cardSelectConfig, setCardSelectConfig] = useState<{
    groups?: unknown[];
    [key: string]: unknown;
  } | null>(null);
  // 悬浮手柄的 DOM 引用，用于在菜单关闭时调用 __resumeHover 恢复 mouseout 监听
  const hoverHandleRef = useRef<HTMLDivElement>(null);

  // 右键菜单状态
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    blockType: string;
    blockElement: HTMLElement | null;
  }>({
    visible: false,
    position: { x: 0, y: 0 },
    blockType: '',
    blockElement: null,
  });

  // 处理右键菜单动作
  const handleMenuAction = useCallback(async (action: BlockMenuAction, data: { blockElement: HTMLElement; blockType: string; payload?: string }) => {
    const editor = editorRef.current;
    if (!editor || !data.blockElement) return;

    const blockId = data.blockElement.getAttribute('id');

    switch (action) {
      case 'delete': {
        if (blockId) deleteBlock(editor, blockId);
        break;
      }
      case 'copy': {
        if (!copyDomBlock(editor, data.blockElement)) {
          await copyText(data.blockElement.innerText || data.blockElement.textContent || "");
        }
        break;
      }
      case 'cut': {
        const copied = copyDomBlock(editor, data.blockElement)
          || await copyText(data.blockElement.innerText || data.blockElement.textContent || "");
        if (copied && blockId && document.getElementById(blockId)) {
          deleteBlock(editor, blockId);
        }
        break;
      }
      case 'convert': {
        if (blockId && data.payload) {
          const ok = runNativeConvert(editor, data.blockElement, data.payload)
            || convertBlock(editor, blockId, data.payload);
          if (!ok) {
            console.warn('[LakexEditor] 转换块类型失败:', data.payload);
          }
        }
        break;
      }
      case 'indent':
      case 'outdent': {
        try {
          selectBlockInEditor(editor, data.blockElement);
          editor.execCommand(action);
        } catch {
          console.warn(`[LakexEditor] ${action} 仅适用于支持缩进的块`);
        }
        break;
      }
      case 'addAfter':
      case 'addBefore': {
        if (blockId && data.payload) {
          const ok = insertBlock(
            editor,
            blockId,
            action === 'addAfter' ? 'after' : 'before',
            data.payload === 'cardSelect' ? 'p' : data.payload,
          );
          if (!ok) {
            console.warn('[LakexEditor] 添加块失败:', data.payload);
          }
        }
        break;
      }
      case 'duplicate': {
        // 复制（克隆）块
        if (blockId) {
          duplicateBlock(editor, blockId);
        }
        break;
      }
      case 'copyLink': {
        if (blockId) {
          const url = new URL(window.location.href);
          url.hash = blockId;
          await copyText(url.toString());
        }
        break;
      }
      case 'aiOutline':
        // 由业务层接入具体 AI 服务；下方的 onBlockAction 会携带当前块。
        break;
      default:
        console.warn('[LakexEditor] 未处理的菜单动作:', action);
    }

    // 触发外部回调（业务方可在 onBlockAction 中接入框架原生命令做更精细的控制）
    if (props.onBlockAction) {
      props.onBlockAction(action, data);
    }
  }, [props.onBlockAction]);

  // 显示右键菜单
  const showContextMenu = useCallback((
    blockElement: HTMLElement,
    event: MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenuState({
      visible: true,
      position: { x: event.clientX, y: event.clientY },
      blockType: blockElement.tagName.toLowerCase(),
      blockElement,
    });
  }, []);

  // 关闭右键菜单（同时恢复悬浮手柄的 mouseout 监听）
  const closeContextMenu = useCallback(() => {
    setContextMenuState(prev => ({ ...prev, visible: false }));
    // 菜单关闭后恢复手柄的 mouseout 监听，让图标可以正常隐藏
    const handleEl = hoverHandleRef.current;
    if (handleEl && typeof (handleEl as any).__resumeHover === 'function') {
      (handleEl as any).__resumeHover();
    }
  }, []);

  const handleCardSelect = useCallback((
    item: any,
    args: any[],
    blockElement: HTMLElement,
  ) => {
    const editor = editorRef.current;
    const blockId = blockElement.getAttribute('id');
    if (!editor || !blockId || !insertBlock(editor, blockId, 'after', 'p')) {
      console.warn('[LakexEditor] 无法在当前块下方创建卡片插入位置');
      return;
    }

    // setDocument 会重建块 DOM；下一帧选中新段落后，按 Lakex 原生
    // CardSelect 的执行规则派发同一组插件事件。
    window.setTimeout(() => {
      const sourceBlock = document.getElementById(blockId);
      const insertionBlock = sourceBlock?.nextElementSibling as HTMLElement | null;
      if (!insertionBlock || !selectBlockInEditor(editor, insertionBlock)) {
        console.warn('[LakexEditor] 无法定位到新建的下方段落');
        return;
      }

      const normalizedArgs = item?.type === 'TableItem'
        ? [{
            col: args?.[0]?.col || 3,
            row: args?.[0]?.row || 3,
          }]
        : args;

      if (item?.type === 'CommandItem') {
        if (typeof item.execute === 'function') {
          item.execute();
        } else if (item.commandName && editor.queryCommandEnabled(item.commandName)) {
          editor.execCommand(item.commandName, item.value);
        }
      } else if (item?.type !== 'PageItem') {
        const detail = {
          item,
          name: item?.name,
          args: item?.type === 'SubMenu' ? undefined : normalizedArgs,
          inputValue: '',
        };
        editor.emitPluginEvent('insertCardByUI', detail);
        editor.emitPluginEvent(`insertCardByUI:${item?.name}`, detail);
      }

      editor.emitEvent?.('userAction', {
        type: 'insertCard',
        name: item?.label,
        source: 'blockMenu',
      });
    }, 16);
  }, []);

  useEffect(() => {
    createEditor(props.content);
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    Doc.FrameworkInfra.Locale.setLanguage(props.language)
    const content = ed.getDocument("text/lake")
    ed.destroy()
    createEditor({type: 'text/lake', text: content})
  }, [props.dark, props.language]);

  useEffect(() => {
    const ed = editorRef.current;
    if (ed) {
      ed.destroy()
    }
    createEditor(props.content)
  }, [props.id]);

  const converCardConfig = (c: CustomCard): CustomCardConfig => {
    let slashLabel = c.config.slash.label
    let slashDesc = c.config.slash.description
    if (typeof slashLabel === 'function') {
      const lbs = slashLabel()
      slashLabel = props.language === 'en-us' ? lbs.enUS : lbs.zhCN
    }
    if (typeof slashDesc === "function") {
      const ds = slashDesc()
      slashDesc = props.language === 'en-us' ? ds.enUS : ds.zhCN;
    }
    return {
      ...c.config,
      slash: {
        ...c.config.slash,
        label: slashLabel,
        description: slashDesc,
      }
    }
  }

  const createEditor = (content?: LakexEditorContent) => {
    if (!containerRef.current) return;

    const { createOpenEditor } = Doc;
    const defaultConfig = GetDefaultEditorConfig(props.language)

    const propsConfigs = props.config ? {
      ...props.config,
      
      customCard: {
          cards: props.config.customCard?.cards.map((c) => converCardConfig(c)) as any,
      }
    } : {}
    const merged = props.disableMergeConfig ? propsConfigs : mergeConfig(
      {
        ...defaultConfig,
        placeholder: {
          tip: props.language === 'en-us' ? 'Type text...' : '开始写作...',
          emptyParagraphTip: props.language === 'en-us' ? 'Type / evoke more': '输入 / 唤起更多',
        },
        customCard: {
          cards: defaultConfig.customCard.cards.map((c) => converCardConfig(c)) as any,
        }
      },
      propsConfigs
    );

    const editor = createOpenEditor(containerRef.current, {
      ...merged,
      darkMode: props.dark ? true : false,
    });
    const parsedCardSelectConfig = editor.plugins?.slash?.option?.getParsedConfig?.(
      'general',
      'cardSelect',
    );
    setCardSelectConfig(parsedCardSelectConfig || null);

    // 设置内容
    if (content) {
      editor.setDocument(content.type, content.text);
    } else {
      editor.setDocument("text/lake", "<p></p>");
    }

    // 监听内容变动
    editor.on("contentchange", () => {
      if (props.onContentChange) {
        const cts: LakexEditorContent[] = [];
        const tp: LakexEditorContentType[] = [
          "text/lake",
          "text/html",
          "text/plain",
          "text/markdown",
          "json",
        ];
        tp.forEach((t) => {
          cts.push({
            type: t,
            text: editor.getDocument(t),
          });
        });
        props.onContentChange(cts);
      }
    });

    editorRef.current = editor;
    setEditorInstance(editor);
  };

  const defaultConfig = GetDefaultEditorConfig(props.language)
  return (
    <>
    <svg id="icon-lakexui-37300002" aria-hidden="true" style={{position: "absolute", width: 0, height: 0, overflow:'hidden'}}>
      {defaultConfig.customCard && !props.disableMergeConfig ? defaultConfig.customCard.cards.filter(c => c.icon).map((c) => {
        return React.createElement(c.icon)
      }) : <></>}
      {props.config?.customCard  ? props.config.customCard .cards.filter(c => c.icon).map((c) => {
        return React.createElement(c.icon)
      }) : <></>}
      <Icon />
    </svg>
    <div ref={containerRef} style={{width: '100%', height: '100%', position: 'relative'}}></div>
    <div className={props.dark ? 'lakex-dark-theme ne-typography-classic':'lakex-default-theme ne-typography-classic'}>
    {/* 块悬浮拖拽手柄 */}
    {props.blockMenu !== false && editorInstance && (
      <BlockHoverHandle
        ref={hoverHandleRef as any}
        containerRef={containerRef}
        editor={editorInstance}
        onContextMenu={showContextMenu}
        language={props.language || 'zh-cn'}
        dark={props.dark}
        heading={props.config?.heading}
      />
    )}

    {/* 右键上下文菜单 */}
    <BlockContextMenu
      visible={props.blockMenu !== false && contextMenuState.visible}
      position={contextMenuState.position}
      blockType={contextMenuState.blockType}
      blockElement={contextMenuState.blockElement}
      editor={editorInstance}
      language={props.language || 'zh-cn'}
      dark={props.dark}
      onClose={closeContextMenu}
      onAction={handleMenuAction}
      cardSelectConfig={cardSelectConfig}
      onCardSelect={handleCardSelect}
    />
    </div>
    </>
  )
}
