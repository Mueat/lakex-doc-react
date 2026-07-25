// 通过 Lakex 的 `json` 文档树操作块节点。
//
// Lakex 的真实 JSON 输出使用 DOM-like 结构：
//   { type: 'element', name: 'p', id, attrs: {}, children: [...] }
//   { type: 'text', name: '#text', id, attrs: {}, data: '...' }
//
// 文档也可能由用户以简写结构传入：
//   { type: 'p', children: [{ text: '...' }] }
//
// 下面的操作优先保持读到的结构风格，避免把 `type: "element"` 错改为
// `type: "h1"` 后又被 Lakex 解析回段落。

import type { LakexEditorInstance } from './blockDoc.types';

const DOC_FORMAT = 'json';

type NodeLocation = {
  node: any;
  parentArray: any[];
  parentNode: any | null;
  index: number;
};

function getChildArray(node: any): any[] | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node.children)) return node.children;
  if (Array.isArray(node.content)) return node.content;
  return null;
}

function getNodeName(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'element') return String(node.name || '');
  return String(node.type || '');
}

function setNodeName(node: any, name: string): void {
  if (node.type === 'element') {
    node.name = name;
  } else {
    node.type = name;
  }
}

function findNodeAndParent(root: any, id: string): NodeLocation | null {
  const roots = getChildArray(root) ?? (Array.isArray(root) ? root : []);

  const search = (arr: any[], parentNode: any | null): NodeLocation | null => {
    for (let index = 0; index < arr.length; index += 1) {
      const node = arr[index];
      if (node && typeof node === 'object' && node.id === id) {
        return { node, parentArray: arr, parentNode, index };
      }
      const children = getChildArray(node);
      if (children) {
        const found = search(children, node);
        if (found) return found;
      }
    }
    return null;
  };

  return search(roots, root);
}

function isAncestor(node: any, descendantId: string): boolean {
  const children = getChildArray(node);
  if (!children) return false;
  return children.some((child) => (
    child?.id === descendantId || isAncestor(child, descendantId)
  ));
}

function genId(): string {
  return `u${Math.random().toString(16).slice(2, 10)}`;
}

function regenerateIds(node: any): void {
  if (!node || typeof node !== 'object') return;
  if ('id' in node) node.id = genId();
  const children = getChildArray(node);
  children?.forEach(regenerateIds);
}

function isDomLikeDocument(doc: any): boolean {
  return doc?.type === 'element' || getChildArray(doc)?.some((node) => node?.type === 'element');
}

function createTextNode(domLike: boolean, text = ''): any {
  if (!domLike) return { text };
  return {
    type: 'text',
    id: genId(),
    name: '#text',
    attrs: {},
    data: text,
  };
}

function createElementNode(
  name: string,
  domLike: boolean,
  children: any[] = [],
  attrs: Record<string, unknown> = {},
): any {
  if (!domLike) return { type: name, id: genId(), attrs, children };
  return {
    type: 'element',
    id: genId(),
    name,
    attrs,
    children,
  };
}

function createBlockNode(name: string, domLike: boolean): any {
  if (name === 'hr') {
    return createElementNode('hr', domLike);
  }

  if (name === 'quote' || name === 'blockquote') {
    const paragraph = createElementNode('p', domLike, [createTextNode(domLike)]);
    return createElementNode(domLike ? 'quote' : 'blockquote', domLike, [paragraph]);
  }

  if (name === 'codeblock') {
    return createElementNode(
      'codeblock',
      domLike,
      [createTextNode(domLike)],
      { language: 'plain', customStyle: false },
    );
  }

  // 菜单只直接新增安全的文本块。未知类型仍按普通元素创建，交给
  // Lakex 自身的 JSON 解析器规范化。
  return createElementNode(name, domLike, [createTextNode(domLike)]);
}

export function readBlockDocument(editor: LakexEditorInstance): any | null {
  try {
    const raw = editor?.getDocument?.(DOC_FORMAT);
    if (raw == null) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

export function writeBlockDocument(editor: LakexEditorInstance, doc: any): boolean {
  try {
    const value = typeof doc === 'string' ? doc : JSON.stringify(doc);
    editor?.setDocument?.(DOC_FORMAT, value);
    editor?.execCommand?.('focus', { preventScroll: true });
    return true;
  } catch {
    return false;
  }
}

export function moveBlock(
  editor: LakexEditorInstance,
  sourceId: string,
  targetId: string,
  insertAfter: boolean,
): boolean {
  if (!sourceId || !targetId || sourceId === targetId) return false;

  const doc = readBlockDocument(editor);
  if (!doc) return false;

  const source = findNodeAndParent(doc, sourceId);
  const target = findNodeAndParent(doc, targetId);
  if (!source || !target || isAncestor(source.node, targetId)) return false;

  source.parentArray.splice(source.index, 1);
  const relocatedTarget = findNodeAndParent(doc, targetId);
  if (!relocatedTarget) {
    source.parentArray.splice(source.index, 0, source.node);
    return false;
  }

  const insertionIndex = insertAfter
    ? relocatedTarget.index + 1
    : relocatedTarget.index;
  relocatedTarget.parentArray.splice(insertionIndex, 0, source.node);
  return writeBlockDocument(editor, doc);
}

export function deleteBlock(editor: LakexEditorInstance, id: string): boolean {
  const doc = readBlockDocument(editor);
  if (!doc) return false;

  const found = findNodeAndParent(doc, id);
  if (!found) return false;
  found.parentArray.splice(found.index, 1);

  // Lakex 需要至少一个可编辑块。删除最后一块时自动补一个空段落。
  if (found.parentNode === doc && found.parentArray.length === 0) {
    found.parentArray.push(createBlockNode('p', isDomLikeDocument(doc)));
  }

  return writeBlockDocument(editor, doc);
}

export function duplicateBlock(
  editor: LakexEditorInstance,
  id: string,
  insertAfter = true,
): boolean {
  const doc = readBlockDocument(editor);
  if (!doc) return false;

  const found = findNodeAndParent(doc, id);
  if (!found) return false;

  const clone = JSON.parse(JSON.stringify(found.node));
  regenerateIds(clone);
  found.parentArray.splice(insertAfter ? found.index + 1 : found.index, 0, clone);
  return writeBlockDocument(editor, doc);
}

export function convertBlock(
  editor: LakexEditorInstance,
  id: string,
  targetName: string,
): boolean {
  const doc = readBlockDocument(editor);
  if (!doc) return false;

  const found = findNodeAndParent(doc, id);
  if (!found) return false;

  const sourceName = getNodeName(found.node);
  if (sourceName === targetName) return true;

  // p / h1-h6 共享相同的文本 children，可以无损改名。
  if (/^(p|h[1-6])$/.test(sourceName) && /^(p|h[1-6])$/.test(targetName)) {
    setNodeName(found.node, targetName);
    return writeBlockDocument(editor, doc);
  }

  // 其他类型由调用方优先走 Lakex 原生命令；这里保留一个可预测的
  // JSON fallback，并尽量保留原有文本内容。
  if (targetName === 'hr') {
    const replacement = createElementNode('hr', isDomLikeDocument(doc));
    replacement.id = found.node.id || replacement.id;
    found.parentArray[found.index] = replacement;
  } else {
    setNodeName(found.node, targetName);
    found.node.attrs ||= {};
    found.node.children ||= [createTextNode(isDomLikeDocument(doc))];
  }

  return writeBlockDocument(editor, doc);
}

export function insertBlock(
  editor: LakexEditorInstance,
  referenceId: string,
  position: 'before' | 'after',
  newName: string,
): boolean {
  const doc = readBlockDocument(editor);
  if (!doc) return false;

  const found = findNodeAndParent(doc, referenceId);
  if (!found) return false;

  const newNode = createBlockNode(newName, isDomLikeDocument(doc));
  found.parentArray.splice(position === 'after' ? found.index + 1 : found.index, 0, newNode);
  return writeBlockDocument(editor, doc);
}
