// src/components/BlockHoverHandle/blockMenuHelpers.ts
//
// 块操作菜单用到的 DOM / 编辑器辅助函数。
// 原定义于 LakexEditor.tsx，为把菜单逻辑整体收敛到 BlockHoverHandle 文件夹而迁移至此。

/** 在编辑器中选中某个块节点（全选其内容） */
export function selectBlockInEditor(editor: any, blockElement: HTMLElement): boolean {
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

/** 用 Lakex 原生命令做块类型转换（当 JSON 替换不可用时回退） */
export function runNativeConvert(editor: any, blockElement: HTMLElement, target: string): boolean {
  if (!selectBlockInEditor(editor, blockElement)) return false;

  try {
    if (/^(p|h[1-6])$/.test(target)) {
      return editor.execCommand("style", target) !== false;
    } else {
      const command: Record<string, [string, ...unknown[]]> = {
        quote: ["quote"],
        ul: ["unorderedList"],
        ol: ["orderedList"],
        taskList: ["taskList"],
        callout: ["alert"],
        columns: ["columns", 2],
        collapse: ["collapse"],
      };
      if (!command[target]) return false;
      return editor.execCommand(...command[target]) !== false;
    }
  } catch {
    return false;
  }
}

/** 通过 Lakex 复制整块 DOM */
export function copyDomBlock(editor: any, blockElement: HTMLElement): boolean {
  try {
    const range = document.createRange();
    range.selectNode(blockElement);
    const result = editor?.renderer?.execCommand?.("copy", range);
    return result !== false;
  } catch {
    return false;
  }
}

/** 复制文本到剪贴板（优先 Clipboard API，失败时回退 execCommand） */
export async function copyText(text: string): Promise<boolean> {
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
