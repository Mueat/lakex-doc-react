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

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { BlockCardSelect } from '../BlockCardSelect';
import './BlockContextMenu.css';

/** 菜单项动作类型 */
export type BlockMenuAction =
  | 'convert'      // 转化为
  | 'aiOutline'    // AI 大纲写作
  | 'delete'       // 删除
  | 'copy'         // 复制
  | 'cut'          // 剪切
  | 'paste'        // 粘贴
  | 'indent'       // 缩进
  | 'outdent'      // 取消缩进
  | 'copyLink'     // 复制当前块链接
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
  /** 稳定的动作参数（不随中英文标签变化） */
  value?: string;
  /** 图标（SVG 或 null） */
  icon?: React.ReactNode | null;
  /** 是否有子菜单 */
  hasSubmenu?: boolean;
  /** 子菜单项 */
  submenu?: MenuItem[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 当前块正在使用该格式 */
  selected?: boolean;
  /** 在当前菜单项后显示分隔线 */
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
    { action: 'convert', label: 'H1', value: 'h1', icon: <H1Icon />, selected: fromType === 'ne-h1' },
    { action: 'convert', label: 'H2', value: 'h2', icon: <H2Icon />, selected: fromType === 'ne-h2' },
    { action: 'convert', label: 'H3', value: 'h3', icon: <H3Icon />, selected: fromType === 'ne-h3' },
    { action: 'convert', label: 'H4', value: 'h4', icon: <H4Icon />, selected: fromType === 'ne-h4' },
    { action: 'convert', label: 'H5', value: 'h5', icon: <H5Icon />, selected: fromType === 'ne-h5' },
    { action: 'convert', label: 'H6', value: 'h6', icon: <H6Icon />, selected: fromType === 'ne-h6' },
    { action: 'convert', label: '正文', value: 'p', icon: <TextIcon /> },
    { action: 'convert', label: '有序', value: 'ol', icon: <OrderedListIcon /> },
    { action: 'convert', label: '无序', value: 'ul', icon: <ListIcon /> },
    { action: 'convert', label: '任务', value: 'taskList', icon: <TaskIcon /> },
    { action: 'convert', label: '代码', value: 'codeblock', icon: <CodeIcon /> },
    { action: 'convert', label: '高亮块', value: 'callout', icon: <CalloutIcon /> },
    { action: 'convert', label: '引用', value: 'quote', icon: <QuoteIcon /> },
    { action: 'convert', label: '分栏', value: 'columns', icon: <ColumnsIcon /> },
    { action: 'convert', label: '折叠块', value: 'collapse', icon: <CollapseIcon /> },
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
    { action: 'addAfter', label: '段落', value: 'p', icon: <ParagraphIcon /> },
    { action: 'addAfter', label: '标题 1', value: 'h1', icon: <H1Icon /> },
    { action: 'addAfter', label: '标题 2', value: 'h2', icon: <H2Icon /> },
    { action: 'addAfter', label: '标题 3', value: 'h3', icon: <H3Icon /> },
    { action: 'addAfter', label: '引用', value: 'quote', icon: <QuoteIcon /> },
    { action: 'addAfter', label: '代码块', value: 'codeblock', icon: <CodeIcon /> },
    { action: 'addAfter', label: '分割线', value: 'hr', icon: <DividerIcon /> },
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

function H4Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="1" y="13" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">H4</text>
    </svg>
  );
}

function H5Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="1" y="13" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">H5</text>
    </svg>
  );
}

function H6Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <text x="1" y="13" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">H6</text>
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3h10M8 3v10M5.5 13h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
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

function ColumnsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M8 2.5v11" stroke="currentColor" strokeWidth="1.1"/>
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M5.5 5.2L8 7.7l-2.5 2.5M9.5 5.2h2.2M9.5 8h2.2M9.5 10.8h2.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
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

function AiOutlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 10l1.4-4h1.2L9 10M5.5 8.5h3M10.5 6v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.25 9.75l3.5-3.5M5.2 11.9l-1.1 1.1a2.2 2.2 0 01-3.1-3.1l2.1-2.1a2.2 2.2 0 013.1 0M10.8 4.1L11.9 3a2.2 2.2 0 013.1 3.1l-2.1 2.1a2.2 2.2 0 01-3.1 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
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
  /** 暗黑模式 */
  dark?: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 菜单动作回调 */
  onAction?: (action: BlockMenuAction, data: { blockElement: HTMLElement; blockType: string; payload?: string }) => void;
  /** Lakex Slash 插件已经解析好的 CardSelect 配置 */
  cardSelectConfig?: { groups?: unknown[]; [key: string]: unknown } | null;
  /** 从行菜单的独立 CardSelect 选择卡片 */
  onCardSelect?: (item: any, args: any[], blockElement: HTMLElement) => void;
}

export function BlockContextMenu({
  visible,
  position,
  blockType,
  blockElement,
  editor,
  language = 'zh-cn',
  dark = false,
  onClose,
  onAction,
  cardSelectConfig,
  onCardSelect,
}: BlockContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  // 获取当前块类型的菜单配置
  const getMenuItems = useCallback((): MenuItem[] => {
    const config = MENU_CONFIGS[blockType] || MENU_CONFIGS['default'];
    const configured = typeof config === 'function' ? config() : config;
    const items: MenuItem[] = configured
      // “在上方添加”暂不展示；所有块统一只保留“在下方添加”入口。
      .filter((item) => item.action !== 'addBefore')
      .map((item) => ({
        ...item,
        // “在下方添加”使用行菜单自己的 CardSelect 子组件。
        value: item.action === 'addAfter' ? 'cardSelect' : item.value,
        hasSubmenu: item.action === 'addAfter' ? true : item.hasSubmenu,
        submenu: item.action === 'addAfter'
          ? undefined
          : item.submenu?.map((subItem) => ({ ...subItem })),
      }));

    const convertIndex = items.findIndex((item) => item.action === 'convert');
    if (convertIndex >= 0) {
      const currentValue: Record<string, string> = {
        'ne-p': 'p',
        'ne-h1': 'h1',
        'ne-h2': 'h2',
        'ne-h3': 'h3',
        'ne-h4': 'h4',
        'ne-h5': 'h5',
        'ne-h6': 'h6',
        'ne-quote': 'quote',
        'ne-codeblock': 'codeblock',
        'ne-hr': 'hr',
      };
      items[convertIndex].submenu = items[convertIndex].submenu?.map((subItem) => ({
        ...subItem,
        selected: subItem.selected || subItem.value === currentValue[blockType],
      }));
      // “大纲写作法”入口暂不展示。
    }

    const addIndex = items.findIndex((item) => (
      item.action === 'addAfter' || item.action === 'addBefore'
    ));
    items.splice(addIndex >= 0 ? addIndex : items.length, 0, {
      action: 'copyLink',
      label: '复制链接',
      icon: <LinkIcon />,
      divider: addIndex >= 0,
    });

    if (language !== 'en-us') return items;

    const labels: Record<string, string> = {
      '转化为': 'Turn into',
      '大纲写作法': 'AI outline',
      '删除': 'Delete',
      '删除表格': 'Delete table',
      '复制': 'Copy',
      '复制代码': 'Copy code',
      '复制图片': 'Copy image',
      '复制表格': 'Copy table',
      '剪切': 'Cut',
      '缩进': 'Indent',
      '增加缩进': 'Increase indent',
      '减少缩进': 'Decrease indent',
      '复制链接': 'Copy link',
      '复制卡片': 'Duplicate card',
      '在上方添加': 'Add above',
      '在下方添加': 'Add below',
      '段落': 'Paragraph',
      '正文': 'Text',
      '有序': 'Numbered',
      '无序': 'Bulleted',
      '任务': 'Task',
      '代码': 'Code',
      '标题 1': 'Heading 1',
      '标题 2': 'Heading 2',
      '标题 3': 'Heading 3',
      '引用': 'Quote',
      '无序列表': 'Bulleted list',
      '有序列表': 'Numbered list',
      '任务列表': 'Task list',
      '代码块': 'Code block',
      '分割线': 'Divider',
      '高亮块': 'Callout',
      '分栏': 'Columns',
      '折叠块': 'Toggle',
    };

    return items.map((item) => ({
      ...item,
      label: labels[item.label] || item.label,
      submenu: item.submenu?.map((subItem) => ({
        ...subItem,
        label: labels[subItem.label] || subItem.label,
      })),
    }));
  }, [blockType, language]);

  useEffect(() => {
    if (visible) setActiveSubmenu(null);
  }, [visible, blockType]);

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

  useLayoutEffect(() => {
    const submenu = submenuRef.current;
    if (!visible || !activeSubmenu || !submenu) return;

    const parentRect = submenu.parentElement?.getBoundingClientRect();
    if (parentRect) {
      const triggerCenterY = parentRect.top + parentRect.height / 2;
      const centeredHeight = Math.max(
        80,
        2 * Math.min(triggerCenterY - 8, window.innerHeight - 8 - triggerCenterY),
      );

      if (submenu.classList.contains('ne-block-card-select-submenu')) {
        // 原生卡片内容负责滚动，外层只限制可居中的可视高度。
        submenu.style.height = `${Math.min(600, centeredHeight)}px`;
      } else {
        submenu.style.maxHeight = `${Math.min(520, centeredHeight)}px`;
      }

      const rect = submenu.getBoundingClientRect();
      submenu.style.left = rect.right > window.innerWidth - 8 ? 'auto' : '100%';
      submenu.style.right = rect.right > window.innerWidth - 8 ? '100%' : 'auto';

      // 触发行中心线与二级弹窗中心线对齐。
      const centeredViewportTop = triggerCenterY - rect.height / 2;
      const maxViewportTop = Math.max(8, window.innerHeight - rect.height - 8);
      const viewportTop = Math.max(8, Math.min(centeredViewportTop, maxViewportTop));
      submenu.style.top = `${viewportTop - parentRect.top}px`;
      submenu.style.bottom = 'auto';
    }
  }, [visible, activeSubmenu]);

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.disabled) return;

    if (item.hasSubmenu && item.submenu) {
      // 切换子菜单
      setActiveSubmenu(prev => prev === item.action ? null : item.action);
      return;
    }

    // 执行动作
    onAction?.(item.action, {
      blockElement: blockElement!,
      blockType,
      payload: item.value ?? item.label,
    });
    onClose();
  }, [onAction, blockElement, blockType, onClose]);

  const handleSubmenuItemClick = useCallback((parentAction: BlockMenuAction, subItem: MenuItem) => {
    if (subItem.disabled) return;

    const action = parentAction === 'indent' ? subItem.action : parentAction;
    onAction?.(action, {
      blockElement: blockElement!,
      blockType,
      payload: subItem.value ?? subItem.label,
    });
    onClose();
  }, [onAction, blockElement, blockType, onClose]);

  if (!visible) return null;

  const items = getMenuItems();

  return (
    <div
      ref={menuRef}
      className={`ne-block-context-menu${dark ? ' ne-block-context-menu--dark' : ''}`}
      role="menu"
      aria-label={language === 'en-us' ? 'Block actions' : '块操作'}
      onMouseDown={(event) => event.preventDefault()}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="ne-block-context-menu-inner">
        {items.map((item, index) => {
          const isActive = activeSubmenu === item.action;
          const hasSubmenu = item.hasSubmenu && item.submenu;
          const opensCardSelect = item.action === 'addAfter';
          const hasFlyout = Boolean(hasSubmenu || opensCardSelect);

          return (
            <React.Fragment key={`${item.action}-${index}`}>
              <div
                className={`ne-block-menu-item ${item.disabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`}
                role="menuitem"
                aria-disabled={item.disabled || undefined}
                tabIndex={item.disabled ? -1 : 0}
                onClick={(event) => {
                  if (opensCardSelect) {
                    setActiveSubmenu((current) => current === item.action ? null : item.action);
                    return;
                  }
                  handleItemClick(item);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (opensCardSelect) {
                      setActiveSubmenu((current) => current === item.action ? null : item.action);
                      return;
                    }
                    handleItemClick(item);
                  }
                }}
                onMouseEnter={() => {
                  if (!hasFlyout) return;
                  setActiveSubmenu(item.action);
                }}
                onMouseLeave={() => {
                  if (!hasFlyout) return;
                  setActiveSubmenu(null);
                }}
              >
                <span className="ne-block-menu-icon">{item.icon}</span>
                <span className="ne-block-menu-label">{item.label}</span>
                {hasFlyout && (
                  <span className="ne-block-menu-arrow">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}

                {hasSubmenu && isActive && (
                  <div
                    ref={submenuRef}
                    className={`ne-block-submenu${item.action === 'convert' ? ' ne-block-convert-submenu' : ''}`}
                    role="menu"
                  >
                    {item.submenu!.map((subItem, subIndex) => {
                      const convertPresentation = item.action === 'convert'
                        ? (subIndex < 11 ? 'compact' : 'card')
                        : null;
                      return (
                        <div
                          key={`${subItem.action}-${subIndex}`}
                          className={[
                            'ne-block-menu-item',
                            subItem.disabled ? 'disabled' : '',
                            subItem.selected ? 'selected' : '',
                            convertPresentation ? 'ne-block-convert-item' : '',
                            convertPresentation ? `ne-block-convert-item--${convertPresentation}` : '',
                          ].filter(Boolean).join(' ')}
                          role="menuitem"
                          aria-label={subItem.label}
                          aria-disabled={subItem.disabled || undefined}
                          aria-current={subItem.selected ? 'true' : undefined}
                          title={convertPresentation === 'compact' ? subItem.label : undefined}
                          tabIndex={subItem.disabled ? -1 : 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSubmenuItemClick(item.action, subItem);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              handleSubmenuItemClick(item.action, subItem);
                            }
                          }}
                        >
                          <span className="ne-block-menu-icon">{subItem.icon}</span>
                          <span className="ne-block-menu-label">{subItem.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {opensCardSelect && isActive && (
                  <div
                    ref={submenuRef}
                    className="ne-block-card-select-submenu"
                    role="menu"
                    aria-label={language === 'en-us' ? 'Add a card below' : '在下方添加卡片'}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <BlockCardSelect
                      config={cardSelectConfig || null}
                      dark={dark}
                      language={language}
                      overlayContainer={editor?.overlayContainer}
                      themeSelector={editor?.theme?.getThemeSelector?.()}
                      onCancel={() => setActiveSubmenu(null)}
                      onSelect={(selectedItem, ...args) => {
                        if (blockElement) {
                          onCardSelect?.(selectedItem, args, blockElement);
                        }
                        onClose();
                      }}
                    />
                  </div>
                )}
              </div>
              {item.divider && (
                <div className="ne-block-menu-divider" role="separator" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default BlockContextMenu;
