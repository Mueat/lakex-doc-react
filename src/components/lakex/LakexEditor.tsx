import { useEffect, useRef } from "react";
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
    <div ref={containerRef} style={{width: '100%', height: '100%'}}></div>
    
    </>
  )
}
