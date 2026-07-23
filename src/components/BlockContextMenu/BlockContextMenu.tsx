// src/components/BlockContextMenu/BlockContextMenu.tsx
//
// 编辑器块节点右键上下文菜单组件。
//
// 功能：
//   1. 在块节点上右键时显示操作菜单。
//   2. 根据不同的节点类型显示不同的菜单选项。
//   3. 支持子菜单（如"转化为"、"缩进"、"在下方添加"）。
//
// 用法：
//   <BlockContextMenu
//       visible={visible}
//       position={{ x, y }}
//       blockType="ne-p"
//       blockElement={blockEl}
//       editor={editor}
//       language="zh-cn"
//       onClose={() => setVisible(false)}
//       onAction={(action, data) => handleAction(action, data)}
//   />

import React, { useEffect, useRef, useState, useCallback } from 'react';
import './BlockContextMenu.css';

/** 菜单项动作类型 */
export type BlockMenuAction =
  | 'convert'      // 转化为
  | 'delete'       // 删除
  | 'copy'         // 复制
  | 'cut'          // 剪切
  | 'paste'        // 粘贴
  | 'indent'       // 缩进
  | 'outdent'      // 取消缩进
  | 'addBefore'    // 在上方添加
  | 'addAfter'     // 在下方添加
  | 'duplicate'    // 复制块
  | 'selectBlock'; // 选中整块

/** 菜单项定义 */
export interface MenuItem {
  /** 动作类型 */
  action: BlockMenuAction;
  /** 显示标签 */
  label: string;
  /** 图标（SVG 或 null） */
  icon?: React.ReactNode | null;
  /** 是否有子菜单 */
  hasSubmenu?: boolean;
  /** 子菜单项 */
  submenu?: MenuItem[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 分隔线（设为 true 则该项为分隔线） */
  divider?: boolean;
}

/** 按块类型分组的菜单配置 */
const MENU_CONFIGS: Record<string, (() => MenuItem[]) | MenuItem[]> = {
  // 段落
  'ne-p': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'indent', label: '缩进', icon: <IndentIcon />, hasSubmenu: true, submenu: getIndentSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 标题
  'ne-h1': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu('ne-h1') },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  'ne-h2': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu('ne-h2') },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 标题 3-6 共用同一菜单
  'ne-h3': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  'ne-h4': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  'ne-h5': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  'ne-h6': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 引用块
  'ne-quote': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 无序列表项
  'ne-uli': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'indent', label: '缩进', icon: <IndentIcon />, hasSubmenu: true, submenu: getIndentSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 有序列表项
  'ne-oli': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'indent', label: '缩进', icon: <IndentIcon />, hasSubmenu: true, submenu: getIndentSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 任务列表项
  'ne-tli': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'indent', label: '缩进', icon: <IndentIcon />, hasSubmenu: true, submenu: getIndentSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 卡片
  'ne-card': () => [
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'duplicate', label: '复制卡片', icon: <CopyIcon /> },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 代码块
  'ne-codeblock': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制代码', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 分割线
  'ne-hr': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 图片
  'ne-image': () => [
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制图片', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 表格
  'ne-table': () => [
    { action: 'delete', label: '删除表格', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制表格', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addBefore', label: '在上方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
  // 默认菜单
  'default': () => [
    { action: 'convert', label: '转化为', icon: <ConvertIcon />, hasSubmenu: true, submenu: getConvertSubmenu() },
    { action: 'delete', label: '删除', icon: <DeleteIcon /> },
    { action: 'copy', label: '复制', icon: <CopyIcon /> },
    { action: 'cut', label: '剪切', icon: <CutIcon />, divider: true },
    { action: 'addAfter', label: '在下方添加', icon: <AddIcon />, hasSubmenu: true, submenu: getAddSubmenu() },
  ],
};

/** "转化为" 子菜单 */
function getConvertSubmenu(fromType?: string): MenuItem[] {
  return [
    { action: 'convert', label: '段落', icon: <ParagraphIcon /> },
    { action: 'convert', label: '标题 1', icon: <H1Icon />, disabled: fromType === 'ne-h1' },
    { action: 'convert', label: '标题 2', icon: <H2Icon />, disabled: fromType === 'ne-h2' },
    { action: 'convert', label: '标题 3', icon: <H3Icon />, disabled: fromType === 'ne-h3' },
    { action: 'convert', label: '引用', icon: <QuoteIcon /> },
    { action: 'convert', label: '无序列表', icon: <ListIcon /> },
    { action: 'convert', label: '有序列表', icon: <OrderedListIcon /> },
    { action: 'convert', label: '任务列表', icon: <TaskIcon /> },
    { action: 'convert', label: '代码块', icon: <CodeIcon /> },
    { action: 'convert', label: '分割线', icon: <DividerIcon /> },
    { action: 'convert', label: '高亮块', icon: <CalloutIcon /> },
  ];
}

/** "缩进" 子菜单 */
function getIndentSubmenu(): MenuItem[] {
  return [
    { action: 'indent', label: '增加缩进', icon: <IndentIcon /> },
    { action: 'outdent', label: '减少缩进', icon: <OutdentIcon /> },
  ];
}

/** "在下方/上方添加" 子菜单 */
function getAddSubmenu(): MenuItem[] {
  return [
    { action: 'addAfter', label: '段落', icon: <ParagraphIcon /> },
    { action: 'addAfter', label: '标题 1', icon: <H1Icon /> },
    { action: 'addAfter', label: '标题 2', icon: <H2Icon /> },
    { action: 'addAfter', label: '标题 3', icon: <H3Icon /> },
    { action: 'addAfter', label: '引用', icon: <QuoteIcon /> },
    { action: 'addAfter', label: '无序列表', icon: <ListIcon /> },
    { action: 'addAfter', label: '有序列表', icon: <OrderedListIcon /> },
    { action: 'addAfter', label: '任务列表', icon: <TaskIcon /> },
    { action: 'addAfter', label: '代码块', icon: <CodeIcon /> },
    { action: 'addAfter', label: '分割线', icon: <DividerIcon /> },
    { action: 'addAfter', label: '图片', icon: <ImageIcon /> },
    { action: 'addAfter', label: '表格', icon: <TableIcon /> },
    { action: 'addAfter', label: '高亮块', icon: <CalloutIcon /> },
  ];
}

// ========== SVG 图标组件 ==========

function ConvertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L13 6L10 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 13L3 10L6 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 6H8a3 3 0 010-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M3.5 10H8a3 3 0 010 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4M6 7.333v4M10 7.333v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.333 4l.667 9.333a1.333 1.333 0 001.333 1.334h5.334a1.333 1.333 0 001.333-1.334L12.667 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="5.333" y="5.333" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M10.667 5.333V2.667a1.333 1.333 0 00-1.334-1.334H2.667A1.333 1.333 0 001.333 2.667v8a1.333 1.333 0 001.334 1.333h2.666" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 2L2 8l4 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 2l4 6-4 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="5" cy="8" r="1" fill="currentColor"/>
      <circle cx="11" cy="8" r="1" fill="currentColor"/>
    </svg>
  );
}

function IndentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h8M2 7h4M2 11h8M12 3l3 4-3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function OutdentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h8M2 7h4M2 11h8M4 3L1 7l3 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AddIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function ParagraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3h10M3 7h10M3 11h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function H1Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="1" y="13" fontSize="12" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">H1</text>
    </svg>
  );
}

function H2Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="1" y="13" fontSize="11" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">H2</text>
    </svg>
  );
}

function H3Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="1" y="13" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">H3</text>
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 9c0-2 1-3 3-3v2c-.5 0-1 .5-1 1s.5 1 1 1v2c-2 0-3-1-3-3zM9 9c0-2 1-3 3-3v2c-.5 0-1 .5-1 1s.5 1 1 1v2c-2 0-3-1-3-3z" fill="currentColor"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="4" r="1.2" fill="currentColor"/>
      <circle cx="4" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="4" cy="12" r="1.2" fill="currentColor"/>
      <path d="M7 4h6M7 8h6M7 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="2" y="5.5" fontSize="7" fill="currentColor" fontFamily="sans-serif">1</text>
      <text x="2" y="9.5" fontSize="7" fill="currentColor" fontFamily="sans-serif">2</text>
      <text x="2" y="13.5" fontSize="7" fill="currentColor" fontFamily="sans-serif">3</text>
      <path d="M7 4h6M7 8h6M7 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4.5 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 7h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 3L2 8l3 5M11 3l3 5-3 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DividerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function CalloutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="5.5" cy="6.5" r="1.5" fill="currentColor"/>
      <path d="M2 12l3.5-3.5L8 11l2.5-3L14 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 6.5h12M2 10h12M6.5 3v10" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

export interface BlockContextMenuProps {
  /** 是否显示 */
  visible: boolean;
  /** 菜单位置 */
  position: { x: number; y: number };
  /** 当前块的类型（tagName 小写） */
  blockType: string;
  /** 当前块的 DOM 元素 */
  blockElement: HTMLElement | null;
  /** lakex editor 实例 */
  editor: any;
  /** 语言设置 */
  language?: 'zh-cn' | 'en-us';
  /** 关闭回调 */
  onClose: () => void;
  /** 菜单动作回调 */
  onAction?: (action: BlockMenuAction, data: { blockElement: HTMLElement; blockType: string; payload?: string }) => void;
}

export function BlockContextMenu({
  visible,
  position,
  blockType,
  blockElement,
  editor,
  language = 'zh-cn',
  onClose,
  onAction,
}: BlockContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  // 获取当前块类型的菜单配置
  const getMenuItems = useCallback((): MenuItem[] => {
    const config = MENU_CONFIGS[blockType] || MENU_CONFIGS['default'];
    return typeof config === 'function' ? config() : config;
  }, [blockType]);

  // 点击外部关闭
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 延迟绑定，避免右键事件立即触发关闭
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  // 调整菜单位置防止溢出屏幕
  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;

    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > innerWidth - 8) {
      adjustedX = innerWidth - rect.width - 8;
    }
    if (position.y + rect.height > innerHeight - 8) {
      adjustedY = innerHeight - rect.height - 8;
    }

    menuRef.current.style.left = `${adjustedX}px`;
    menuRef.current.style.top = `${adjustedY}px`;
  }, [visible, position]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.disabled || item.divider) return;

    if (item.hasSubmenu && item.submenu) {
      // 切换子菜单
      setActiveSubmenu(prev => prev === item.action ? null : item.action);
      return;
    }

    // 执行动作
    onAction?.(item.action, {
      blockElement: blockElement!,
      blockType,
      payload: item.label,
    });
    onClose();
  }, [onAction, blockElement, blockType, onClose]);

  const handleSubmenuItemClick = useCallback((parentAction: BlockMenuAction, subItem: MenuItem) => {
    if (subItem.disabled) return;

    onAction?.(parentAction, {
      blockElement: blockElement!,
      blockType,
      payload: subItem.label,
    });
    onClose();
  }, [onAction, blockElement, blockType, onClose]);

  if (!visible) return null;

  const items = getMenuItems();

  return (
    <div
      ref={menuRef}
      className="ne-block-context-menu"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="ne-block-context-menu-inner">
        {items.map((item, index) => {
          if (item.divider) {
            return <div key={`divider-${index}`} className="ne-block-menu-divider" />;
          }

          const isActive = activeSubmenu === item.action;
          const hasSubmenu = item.hasSubmenu && item.submenu;

          return (
            <div
              key={`${item.action}-${index}`}
              className={`ne-block-menu-item ${item.disabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => hasSubmenu && setActiveSubmenu(item.action)}
              onMouseLeave={() => hasSubmenu && setActiveSubmenu(null)}
            >
              <span className="ne-block-menu-icon">{item.icon}</span>
              <span className="ne-block-menu-label">{item.label}</span>
              {hasSubmenu && (
                <span className="ne-block-menu-arrow">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}

              {/* 子菜单 */}
              {hasSubmenu && isActive && (
                <div
                  ref={submenuRef}
                  className="ne-block-submenu"
                >
                  {item.submenu!.map((subItem, subIndex) => (
                    <div
                      key={`${subItem.action}-${subIndex}`}
                      className={`ne-block-menu-item ${subItem.disabled ? 'disabled' : ''}`}
                      onClick={() => handleSubmenuItemClick(item.action, subItem)}
                    >
                      <span className="ne-block-menu-icon">{subItem.icon}</span>
                      <span className="ne-block-menu-label">{subItem.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BlockContextMenu;
