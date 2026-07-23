// src/utils/blockDoc.ts
//
// 通过 lakex 编辑器的 text/lake 文档树（JSON）来操作块节点。
// 这是与框架版本无关的可靠方式：getDocument('text/lake') 与
// setDocument('text/lake', json) 在 LakexEditor 的 dark/language 重建逻辑中
// 已被验证可以安全往返。
//
// 所有读写都基于「纯 JSON 对象」：
//   - readDoc(editor)   -> 读取并返回解析后的 JSON 文档树（{ type, children/content: [...] }）
//   - writeDoc(editor, doc) -> 将 JSON 文档树序列化后写回编辑器
//
// 文档树结构（lakex / 语雀）：
//   { type: 'doc', children: [ { type, id, children: [...], ... } ] }
// 部分节点可能用 `content` 而非 `children` 作为子节点数组，这里两者都兼容。
//
// 注意：所有修改操作会触发一次 setDocument，这会重置选区/光标，
// 对于「移动 / 删除 / 复制」这类离散操作是可接受的。

import type { LakexEditorInstance } from './blockDoc.types';

/** lakex 文档格式（与 getDocument/setDocument 保持一致） */
const DOC_FORMAT = 'json';

/** 获取节点的子节点数组（兼容 children / content 两种 key） */
function getChildArray(node: any): any[] | null {
  if (node && typeof node === 'object') {
    if (Array.isArray(node.children)) return node.children;
    if (Array.isArray(node.content)) return node.content;
  }
  return null;
}

/** 在文档树中查找节点及其所在的父数组与下标 */
function findNodeAndParent(
  root: any,
  id: string
): { node: any; parentArray: any[]; index: number } | null {
  const roots = getChildArray(root) ?? (Array.isArray(root) ? root : []);
  const search = (arr: any[]): any => {
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i];
      if (n && typeof n === 'object' && n.id === id) {
        return { node: n, parentArray: arr, index: i };
      }
      const ch = getChildArray(n);
      if (ch) {
        const found = search(ch);
        if (found) return found;
      }
    }
    return null;
  };
  return search(roots);
}

/** 判断 node 是否是 descendantId 的祖先（含间接），用于避免把节点移入自身子孙形成环 */
function isAncestor(node: any, descendantId: string): boolean {
  const ch = getChildArray(node);
  if (!ch) return false;
  for (const c of ch) {
    if (c && typeof c === 'object' && c.id === descendantId) return true;
    if (isAncestor(c, descendantId)) return true;
  }
  return false;
}

/** 生成一个新的块 id（框架通常接受任意字符串 id） */
function genId(): string {
  return 'blk_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * 从编辑器读取 text/lake 文档树，返回「解析后的 JSON 对象」。
 * 若底层返回的是字符串则 JSON.parse；若已是对象则原样返回。
 * 读取失败返回 null。
 */
function readDoc(editor: any): any | null {
  try {
    const raw = editor?.getDocument?.(DOC_FORMAT);
    if (raw == null) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/**
 * 将文档树（JSON 对象或字符串）写回编辑器。
 * 若为对象则 JSON.stringify 后再 setDocument。
 * 返回是否成功。
 */
function writeDoc(editor: any, doc: any): boolean {
  try {
    const text = typeof doc === 'string' ? doc : JSON.stringify(doc);
    editor?.setDocument?.(DOC_FORMAT, text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 移动块：把 sourceId 对应的节点移动到 targetId 节点之前或之后。
 *
 * 移动语义（与拖拽一致）：
 *   - sourceId    : 被拖动的块（要移动的对象），按此 id 在 JSON 中查找
 *   - targetId    : 落点参考块（放置位置的参照）
 *   - insertAfter :
 *        true  -> 把 sourceId 节点移动到 targetId 节点的【下方】（之后）
 *        false -> 把 sourceId 节点移动到 targetId 节点的【上方】（之前）
 *
 * 流程：readDoc(读 JSON) -> 按 sourceId 定位并摘除 -> 按 targetId 重新定位 ->
 *       在 targetId 上方/下方插入 -> writeDoc(写回 JSON)。
 *
 * 返回是否成功。
 */
export function moveBlock(
  editor: LakexEditorInstance,
  sourceId: string,
  targetId: string,
  insertAfter: boolean
): boolean {
  if (!sourceId || !targetId || sourceId === targetId) return false;

  const doc = readDoc(editor);
  if (!doc) return false;

  // 1) 按 sourceId 在 JSON 中查找被拖动节点
  const src = findNodeAndParent(doc, sourceId);
  if (!src) return false;

  // 不能把节点移动到它自己的子孙节点里（避免形成环）
  if (isAncestor(src.node, targetId)) return false;

  // 2) 按 targetId 在 JSON 中查找落点参考节点
  const tgt = findNodeAndParent(doc, targetId);
  if (!tgt) return false;

  // 3) 先从原位置摘除
  src.parentArray.splice(src.index, 1);

  // 4) 摘除后重新定位目标（同源数组时下标可能漂移）
  const tgt2 = findNodeAndParent(doc, targetId);
  if (!tgt2) {
    src.parentArray.splice(src.index, 0, src.node); // 回滚
    return false;
  }

  // 5) 插入到目标节点的上方（之前）或下方（之后）
  const insertIdx = insertAfter ? tgt2.index + 1 : tgt2.index;
  tgt2.parentArray.splice(insertIdx, 0, src.node);

  // 6) 写回 JSON
  return writeDoc(editor, doc);
}

/** 删除块（按 id 在 JSON 中查找并移除） */
export function deleteBlock(editor: LakexEditorInstance, id: string): boolean {
  
  
  const doc = readDoc(editor);
  if (!doc) return false;
  const found = findNodeAndParent(doc, id);
  if (!found) return false;
  found.parentArray.splice(found.index, 1);
  return writeDoc(editor, doc);
  // editor.execCommand('focus', { preventScroll: !0 })
}

/** 复制（克隆）块并插入到其后/前 */
export function duplicateBlock(
  editor: LakexEditorInstance,
  id: string,
  insertAfter = true
): boolean {
  const doc = readDoc(editor);
  if (!doc) return false;
  const found = findNodeAndParent(doc, id);
  if (!found) return false;
  const clone = JSON.parse(JSON.stringify(found.node));
  clone.id = genId();
  const insertIdx = insertAfter ? found.index + 1 : found.index;
  found.parentArray.splice(insertIdx, 0, clone);
  return writeDoc(editor, doc);
}

/**
 * 转换块类型（如 p -> h1）。
 * targetType 为 JSON 中的节点 type 字符串。
 */
export function convertBlock(
  editor: LakexEditorInstance,
  id: string,
  targetType: string
): boolean {
  const doc = readDoc(editor);
  if (!doc) return false;
  const found = findNodeAndParent(doc, id);
  if (!found) return false;
  found.node.type = targetType;
  // 标题通常需要 level，这里给个默认 1，调用方可在 onBlockAction 中细化
  if (/^h[1-6]$/.test(targetType) && found.node.attrs && typeof found.node.attrs === 'object') {
    found.node.attrs.level = parseInt(targetType.slice(1), 10);
  }
  return writeDoc(editor, doc);
}

/**
 * 在参考块之前/之后插入一个新块。
 * newType 为 JSON 节点 type 字符串。
 */
export function insertBlock(
  editor: LakexEditorInstance,
  referenceId: string,
  position: 'before' | 'after',
  newType: string
): boolean {
  const doc = readDoc(editor);
  if (!doc) return false;
  const found = findNodeAndParent(doc, referenceId);
  if (!found) return false;

  const newNode: any = { type: newType, id: genId() };
  // 文本类块需要 children 容纳文本节点；卡片类块通常有 cardValue
  if (newType === 'p' || newType.startsWith('h') || newType === 'quote') {
    newNode.children = [{ type: 'text', text: '' }];
  } else {
    newNode.children = [];
  }

  const insertIdx = position === 'after' ? found.index + 1 : found.index;
  found.parentArray.splice(insertIdx, 0, newNode);
  return writeDoc(editor, doc);
}

/**
 * 缩进 / 取消缩进。
 * 由于缩进在文档模型中通常体现为父列表节点（list > list_item），
 * 这里仅提供一个通用占位实现：若框架未提供对应命令，建议通过
 * onBlockAction 回调调用框架原生能力。返回 false 表示未执行实际操作。
 */
export function indentBlock(): boolean {
  return false;
}

