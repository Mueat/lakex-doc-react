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
  moveBlock,
  deleteBlock,
  duplicateBlock,
  convertBlock,
  insertBlock,
} from "../../utils/blockDoc";

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

  // 菜单中的中文标签 -> text/lake 文档树中的节点 type 映射
  const LABEL_TO_TYPE: Record<string, string> = {
    '段落': 'p',
    '标题 1': 'h1',
    '标题 2': 'h2',
    '标题 3': 'h3',
    '引用': 'quote',
    '无序列表': 'bullet_list',
    '有序列表': 'ordered_list',
    '任务列表': 'task_list',
    '代码块': 'codeblock',
    '分割线': 'hr',
    '高亮块': 'callout',
    '图片': 'image',
    '表格': 'table',
  };

  // 处理右键菜单动作
  const handleMenuAction = useCallback((action: BlockMenuAction, data: { blockElement: HTMLElement; blockType: string; payload?: string }) => {
    const editor = editorRef.current;
    if (!editor || !data.blockElement) return;

    const blockId = data.blockElement.getAttribute('id');

    switch (action) {
      case 'delete': {
        const range = document.createRange();
        const el = document.getElementById(blockId);
        if (el) {
          range.selectNode(el);
          // 
          // editor.kernel.execCommand("selection", { focus: 'start', anchor: 'start', ranges: [editor.engine.transformDOMRange(range)] })
          // editor.kernel.execCommand("deleteToBlockEnd")
          // range.deleteContents()
          // editor.renderer.execCommand('delete', false);
          var t = editor.engine.transformDOMRange(range),
                      n = t.start,
                      r = t.end,
                      o = editor.renderer.kernel.createModelRange(n, r);
          editor.kernel.execCommand("deleteByRange",o)
          
        }
        // 删除块
        // deleteBlock(editor, blockId);
        break;
      }
      case 'copy': {
        const range = document.createRange();
        const el = document.getElementById(blockId);
        if (el) {
          range.selectNode(el);
          editor.renderer.execCommand('copy', range);
        }
        break;
      }
      case 'cut': {
        // 剪切块：复制到系统剪贴板后删除原块
        const range = document.createRange();
        const el = document.getElementById(blockId);
        if (el) {
          range.selectNode(el);
          editor.renderer.execCommand('cut', range);
          deleteBlock(editor, blockId);
        }
        break;
      }
      case 'convert': {
        // 转换块类型
        if (blockId && data.payload) {
          const targetType = LABEL_TO_TYPE[data.payload] || data.payload;
          const ok = convertBlock(editor, blockId, targetType);
          if (!ok) {
            console.warn('[LakexEditor] 转换块类型失败，请通过 onBlockAction 接入框架原生命令:', data.payload);
          }
        }
        break;
      }
      case 'indent':
      case 'outdent': {
        // 缩进 / 取消缩进：文档树层面无法直接表达（依赖父列表结构），
        // 优先交给业务方在 onBlockAction 中接入框架原生能力。
        if (!props.onBlockAction) {
          console.warn(`[LakexEditor] ${action} 需要框架原生命令，请通过 onBlockAction 接入`);
        }
        break;
      }
      case 'addAfter':
      case 'addBefore': {
        // 在块下方/上方添加新块
        if (blockId && data.payload) {
          const newType = LABEL_TO_TYPE[data.payload] || data.payload;
          const ok = insertBlock(editor, blockId, action === 'addAfter' ? 'after' : 'before', newType);
          if (!ok) {
            console.warn('[LakexEditor] 添加块失败，请通过 onBlockAction 接入框架原生命令:', data.payload);
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
    {editorInstance && (
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
      visible={contextMenuState.visible}
      position={contextMenuState.position}
      blockType={contextMenuState.blockType}
      blockElement={contextMenuState.blockElement}
      editor={editorInstance}
      language={props.language || 'zh-cn'}
      onClose={closeContextMenu}
      onAction={handleMenuAction}
    />
    </div>
    </>
  )
}
