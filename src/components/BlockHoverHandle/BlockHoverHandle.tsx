// src/components/BlockHoverHandle/BlockHoverHandle.tsx
//
// 编辑器块节点悬浮拖拽手柄组件。
//
// 功能：
//   1. 鼠标悬停在块节点（ne-p / ne-h1~h6 / ne-quote / ne-tli / ne-oli / ne-uli / ne-card 等）上时，
//      在块左侧显示一个 ⋮ 拖拽图标（grip handle）。
//   2. 拖拽该图标可移动块节点到其他位置（蓝色插入线指示落点）。
//   3. 左键点击或右键点击显示上下文菜单（菜单打开期间暂停 mouseout 隐藏逻辑）。

import React, { useEffect, useRef, useCallback, useState, forwardRef } from 'react';
import './BlockHoverHandle.css';
import { moveBlock } from '../../utils/blockDoc';
import type { HeadingConfig } from '../lakex/types';

/** 支持 hover 检测的块节点标签名集合 */
const BLOCK_TAGS = [
  'NE-P',
  'NE-H1', 'NE-H2', 'NE-H3', 'NE-H4', 'NE-H5', 'NE-H6',
  'NE-QUOTE',
  'NE-TLI',
  'NE-OLI',
  'NE-ULI',
  'NE-CARD',
  'NE-HOLE',
  'NE-ALERT-HOLE',
  "NE-CONTAINER-HOLE",
  'NE-CODEBLOCK',
  'NE-HR',
  'NE-TABLE-HOLE',
  'NE-IMAGE',
  'NE-VIDEO',
  'NE-AUDIO',
  'NE-FILE',
  'NE-CALLOUT',
] as const;

/** 内部虽然包含 p 等基础块，但行操作必须作用于整个结构组件。 */
const STRUCTURAL_BLOCK_TAGS = [
  'NE-QUOTE',
  'NE-ALERT-HOLE',
  'NE-CONTAINER-HOLE',
  'NE-HOLE',
] as const;

export interface BlockHoverHandleProps {
  containerRef: React.RefObject<HTMLElement | null>;
  editor: any;
  onContextMenu?: (blockElement: HTMLElement, event: MouseEvent) => void;
  language?: 'zh-cn' | 'en-us';
  /** 暗黑模式：true 时手柄使用暗色配色 */
  dark?: boolean;
  /** 标题配置（anchor / folding）。标题块左侧会渲染锚点/折叠按钮，
   *  手柄需按开启数量左移：0 个开启→不偏移，1 个→20px，2 个→40px */
  heading?: HeadingConfig;
}

interface HoverState {
  blockElement: HTMLElement | null;
  blockId: string | null;
  blockType: string | null;
}

export const BlockHoverHandle = forwardRef<HTMLDivElement, BlockHoverHandleProps>(({
  containerRef,
  editor,
  onContextMenu,
  language = 'zh-cn',
  dark = false,
  heading,
}, forwardedRef) => {
  const [hoverState, setHoverState] = useState<HoverState>({
    blockElement: null,
    blockId: null,
    blockType: null,
  });
  const [handleStyle, setHandleStyle] = useState<React.CSSProperties>({});
  const [visible, setVisible] = useState(false);

  // Refs
  const hoverStateRef = useRef(hoverState);
  const visibleRef = useRef(visible);
  const hideTimerRef = useRef<number | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // 暂停/恢复 mouseout（菜单打开时不隐藏手柄）
  const mouseoutPausedRef = useRef(false);
  // 鼠标已经进入手柄时，任何来自编辑器容器的延迟隐藏都应失效
  const handleHoveredRef = useRef(false);
  // 拖拽进行中：期间忽略 mouseover/mouseout，避免干扰拖拽并减少重渲染
  const isDraggingRef = useRef(false);

  // 给当前 hover 的块节点加/去高亮 class（鼠标移到手柄时高亮对应节点）
  const setBlockHighlight = useCallback((show: boolean) => {
    const el = hoverStateRef.current.blockElement;
    if (el) {
      el.classList.toggle('ne-brick-highlight', show);
    }
  }, []);

  useEffect(() => { hoverStateRef.current = hoverState; }, [hoverState]);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  /**
   * 从事件 target 向上查找最近的块节点元素。
   * 可选排除 set：跳过拖拽相关的辅助元素，避免 elementFromPoint 命中自身。
   */
  const findBlockNode = useCallback((
    target: EventTarget | null,
    exclude?: Set<Element>,
  ): HTMLElement | null => {
    let el = target as HTMLElement | null;
    while (el && el !== document.body) {
      if (exclude?.has(el)) {
        el = el.parentElement;
        continue;
      }
      const tagName = el.tagName.toUpperCase();

      const isKnownBlock = tagName && BLOCK_TAGS.includes(tagName as any);
      const isRenderUnit = el.getAttribute?.('ne-role') === 'render-unit';
      if (isKnownBlock || isRenderUnit) {
        // 高亮块、分栏、折叠和块卡片内部都可能包含 ne-p。若先返回
        // 内层段落，菜单会误判为正文并把转换结果嵌进旧容器。
        let structural: HTMLElement | null = el;
        while (structural && structural !== document.body) {
          if (STRUCTURAL_BLOCK_TAGS.includes(structural.tagName.toUpperCase() as any)) {
            return structural;
          }
          structural = structural.parentElement;
        }

        if (el.parentElement) {
          const ptagName = el.parentElement.tagName.toLocaleUpperCase()
          if (
            BLOCK_TAGS.includes(ptagName as any)
            && el.parentElement.firstElementChild?.id === el.id
          ) {
            return el.parentElement
          }
        }
        if (tagName === 'NE-CARD' && el.getAttribute("card-type") !== 'block') {
          el = el.parentElement
          continue
        }
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }, []);

  const getBlockTypeName = useCallback((el: HTMLElement): string => {
    return el.tagName?.toLowerCase() || 'unknown';
  }, []);

  /**
   * 解析鼠标所在的块节点。
   * 1) 优先沿 e.target 向上查找；
   * 2) 回退：e.target 可能落在覆盖层（如 ne-inner-overlay-container 内的卡片交互浮层，
   *    与真实块是平级兄弟节点），此时沿 DOM 向上找不到块。改用坐标穿透
   *    elementsFromPoint 找到鼠标下方真正的块节点。
   */
  const resolveBlockNode = useCallback((
    target: EventTarget | null,
    clientX: number,
    clientY: number,
  ): HTMLElement | null => {
    const fromTarget = findBlockNode(target);
    if (fromTarget) return fromTarget;

    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const stack = document.elementsFromPoint(clientX, clientY);
      for (const el of stack) {
        const found = findBlockNode(el);
        if (found) return found;
      }
    }
    return null;
  }, [findBlockNode]);

  const updateHandlePosition = useCallback((blockEl: HTMLElement) => {
    if (!blockEl) return;
    const blockRect = blockEl.getBoundingClientRect();
    // 标题块（NE-H1~H6）左侧会渲染锚点(anchor)/折叠(folding)按钮，需相应左移手柄
    const tag = blockEl.tagName.toUpperCase();
    let offset = 0;
    const handleSize = 24;
    const hitAreaWidth = 34;
    if (['NE-H1', 'NE-H2', 'NE-H3', 'NE-H4', 'NE-H5', 'NE-H6'].includes(tag)) {
      const anchor = heading?.anchor ?? false;
      const folding = heading?.folding ?? true;
      offset = (anchor ? 20 : 0) + (folding ? 20 : 0);
    }
    if (tag === 'NE-TABLE-HOLE') {
      offset = 20
    }
    setHandleStyle({
      position: 'fixed',
      left: `${blockRect.left - hitAreaWidth - offset}px`,
      top: `${blockRect.top + Math.max(0, (blockRect.height - handleSize) / 2)}px`,
      width: `${hitAreaWidth}px`,
      height: `${handleSize}px`,
      zIndex: 100,
    });
  }, [heading]);

  const showHandle = useCallback((blockEl: HTMLElement) => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    const blockId = blockEl.getAttribute('id') || null;
    const blockType = getBlockTypeName(blockEl);
    setHoverState({ blockElement: blockEl, blockId, blockType });
    updateHandlePosition(blockEl);
    setVisible(true);
  }, [getBlockTypeName, updateHandlePosition]);

  const hideHandle = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      if (
        handleHoveredRef.current
        || mouseoutPausedRef.current
        || isDraggingRef.current
      ) {
        return;
      }
      setBlockHighlight(false);
      setVisible(false);
      setHoverState({ blockElement: null, blockId: null, blockType: null });
    }, 220);
  }, [setBlockHighlight]);

  // ========== 鼠标悬浮检测 ==========
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 拖拽进行中：忽略悬浮检测（已在拖拽，无需再显示/隐藏手柄）
      if (isDraggingRef.current) return;

      if (handleRef.current?.contains(e.target as Node)) {
        if (hideTimerRef.current !== null) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        return;
      }
      

      const blockEl = resolveBlockNode(e.target, e.clientX, e.clientY);
      if (blockEl) {
        showHandle(blockEl);
      } else {
        // 从块正文移向行首按钮时会经过左侧 gutter。该区域虽然不属于
        // block DOM，但视觉上是块与手柄之间的连续通道，不能在这里隐藏。
        const currentBlock = hoverStateRef.current.blockElement;
        const handle = handleRef.current;
        if (currentBlock && handle && visibleRef.current) {
          const blockRect = currentBlock.getBoundingClientRect();
          const handleRect = handle.getBoundingClientRect();
          const corridorLeft = Math.min(handleRect.left, blockRect.left) - 6;
          const corridorRight = Math.max(handleRect.right, blockRect.left) + 6;
          const corridorTop = Math.min(handleRect.top, blockRect.top) - 6;
          const corridorBottom = Math.max(handleRect.bottom, blockRect.bottom) + 6;
          if (
            e.clientX >= corridorLeft
            && e.clientX <= corridorRight
            && e.clientY >= corridorTop
            && e.clientY <= corridorBottom
          ) {
            if (hideTimerRef.current !== null) {
              clearTimeout(hideTimerRef.current);
              hideTimerRef.current = null;
            }
            return;
          }
        }
        hideHandle();
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // 拖拽进行中：忽略
      if (isDraggingRef.current) return;
      if (mouseoutPausedRef.current) return;

      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && handleRef.current?.contains(relatedTarget)) return;
      if (relatedTarget && container.contains(relatedTarget)) return;
      hideHandle();
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!container.contains(target)) return;

      const blockEl =
        resolveBlockNode(target, e.clientX, e.clientY) ||
        hoverStateRef.current.blockElement;
      if (blockEl && onContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        mouseoutPausedRef.current = true;
        onContextMenu(blockEl, e);
      } else {
        e.preventDefault();
      }
    };

    container.addEventListener('mousemove', handleMouseMove, true);
    container.addEventListener('mouseleave', handleMouseLeave, true);
    container.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
      container.removeEventListener('contextmenu', handleContextMenu, true);
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [containerRef, findBlockNode, resolveBlockNode, showHandle, hideHandle, onContextMenu]);

  // ========== 滚动时更新位置 ==========
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (visibleRef.current && hoverStateRef.current.blockElement) {
        updateHandlePosition(hoverStateRef.current.blockElement);
      }
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [containerRef, updateHandlePosition]);

  // ========== 拖拽 / 点击逻辑 ==========
  const startDrag = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const blockEl = hoverStateRef.current.blockElement;
    if (!blockEl) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    let dragStarted = false;

    // 被拖拽的原始块（保持原位，仅浅色显示）
    const draggedEl = blockEl;
    // 蓝色插入线指示器：松手后块的落点
    let indicator: HTMLElement | null = null;
    // 跟随鼠标的克隆副本（拖拽预览）
    let ghost: HTMLElement | null = null;
    // 排除集合：让 elementFromPoint 穿过这些元素找到真正的块
    const excludeSet = new Set<Element>();

    // 抓取点相对于源块左上角的偏移，使克隆副本跟随光标时保持相对位置
    const srcRect = draggedEl.getBoundingClientRect();
    const grabOffsetX = startX - srcRect.left;
    const grabOffsetY = startY - srcRect.top;
    const dragOverlay = handleRef.current?.parentElement ?? document.body;
    const previousPointerEvents = draggedEl.style.pointerEvents;
    const previousBodyCursor = document.body.style.cursor;

    /** 蓝色插入线：松手后块的落点 */
    const createIndicator = () => {
      if (indicator) return;
      indicator = document.createElement('div');
      indicator.className = 'ne-block-drag-indicator';
      // 必须挂到 DOM 上才能显示（之前漏了这一步，导致蓝色线不显示）
      dragOverlay.appendChild(indicator);
      excludeSet.add(indicator);
    };

    /** 克隆被拖块，生成跟随鼠标的「副本」预览（无红色边框） */
    const createGhost = () => {
      if (ghost) return;
      ghost = draggedEl.cloneNode(true) as HTMLElement;
      ghost.className = `${draggedEl.className} ne-block-drag-ghost`;
      ghost.removeAttribute('id');
      ghost.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      ghost.setAttribute('aria-hidden', 'true');
      ghost.setAttribute('contenteditable', 'false');
      ghost.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${srcRect.width}px;
        margin: 0;
        z-index: 1000;
        pointer-events: none;
        box-sizing: border-box;
      `;
      // 预览必须挂在 contenteditable 之外，否则 Lakex 的 MutationObserver
      // 会把克隆节点误认为真实文档变更。
      dragOverlay.appendChild(ghost);
      excludeSet.add(ghost);
    };

    /** 进入拖拽模式：源块浅色、创建指示器与副本 */
    const enterDragMode = () => {
      if (dragStarted) return;
      dragStarted = true;

      // 进入拖拽：暂停 mouseover/mouseout 监听（已在拖拽，无需再处理悬浮）
      isDraggingRef.current = true;

      createIndicator();
      createGhost();

      // 源块浅色显示（浅色字体）+ 穿透，便于 elementFromPoint 找到目标块
      draggedEl.classList.add('ne-block-drag-source');
      draggedEl.style.pointerEvents = 'none';
      excludeSet.add(draggedEl);

      // 拖拽期间强制光标为小手（grab），避免命中穿透元素时变回箭头
      document.body.style.cursor = 'grab';

      // 手柄也加入排除（鼠标在手柄上时不应误判）
      if (handleRef.current) excludeSet.add(handleRef.current);
    };

    /** 退出拖拽模式：恢复样式、清理元素 */
    const exitDragMode = () => {
      draggedEl.classList.remove('ne-block-drag-source');
      draggedEl.style.pointerEvents = previousPointerEvents;
      // 复位光标
      document.body.style.cursor = previousBodyCursor;
      if (indicator && indicator.parentNode) indicator.remove();
      indicator = null;
      if (ghost && ghost.parentNode) ghost.remove();
      ghost = null;
      excludeSet.clear();
      // 结束拖拽：恢复 mouseover/mouseout 监听
      isDraggingRef.current = false;
    };

    let lastInsertInfo: { target: HTMLElement; before: boolean } | null = null;

    const positionIndicator = (clientX: number, clientY: number) => {
      // 用 elementsFromPoint 获取所有元素列表，逐个查找块（跳过排除集中的元素）
      const allEls = document.elementsFromPoint(clientX, clientY);
      let targetBlock: HTMLElement | null = null;
      for (const el of allEls) {
        if (excludeSet.has(el as Element)) continue;
        const found = findBlockNode(el, excludeSet);
        if (found) {
          targetBlock = found;
          break;
        }
      }

      if (!targetBlock || targetBlock === draggedEl) {
        // 不在任何有效块上 → 隐藏指示器
        if (indicator) indicator.style.display = 'none';
        lastInsertInfo = null;
        return;
      }

      if (indicator) indicator.style.display = '';

      const rect = targetBlock.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertBefore = clientY < midY;

      // 定位蓝色线：在目标块的顶部边界或底部边界
      const lineTop = insertBefore ? rect.top : rect.bottom;
      indicator!.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${lineTop}px;
        width: ${rect.width}px;
        height: 2px;
        background: var(--lakex-editor-text-link, #1677ff);
        border-radius: 1px;
        z-index: 999;
        pointer-events: none;
        transition: top 0.08s ease-out, left 0.08s ease-out, width 0.08s ease-out;
      `;

      lastInsertInfo = { target: targetBlock, before: insertBefore };
    };

    /** 让克隆副本跟随鼠标 */
    const positionGhost = (clientX: number, clientY: number) => {
      if (!ghost) return;
      ghost.style.left = `${clientX - grabOffsetX}px`;
      ghost.style.top = `${clientY - grabOffsetY}px`;
    };

    // ---- mousemove ----
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);
      if (!moved && (dx > 3 || dy > 3)) moved = true;
      if (!moved) return;

      enterDragMode();

      positionIndicator(moveEvent.clientX, moveEvent.clientY);
      positionGhost(moveEvent.clientX, moveEvent.clientY);
    };

    // ---- mouseup ----
    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 未达阈值 → 视为点击，弹菜单
      if (!moved) {
        mouseoutPausedRef.current = true;
        if (onContextMenu) {
          const rect = handleRef.current?.getBoundingClientRect();
          onContextMenu(draggedEl, {
            clientX: rect ? rect.left : upEvent.clientX,
            clientY: rect ? rect.bottom : upEvent.clientY,
            preventDefault() {},
            stopPropagation() {},
          } as unknown as MouseEvent);
        }
        return;
      }

      // ===== 执行实际的块移动 =====
      // 先记录放置信息，再退出视觉模式（避免 exitDragMode 影响判定）
      const insertInfo = lastInsertInfo;
      exitDragMode();

      if (!insertInfo) {
        // 没有有效的放置目标 → 块停在原位（无需操作，DOM 未变）
        return;
      }

      const { target: targetBlock, before } = insertInfo;
      const sourceId = draggedEl.getAttribute('id');
      const targetId = targetBlock.getAttribute('id');

      // 方式一：通过文档树操作（与框架版本无关，数据层同步）
      let dataSyncOk = false;
      if (editor && sourceId && targetId) {
        dataSyncOk = moveBlock(editor, sourceId, targetId, !before);
      }

      if (!dataSyncOk) {
        // 不直接挪动 contenteditable DOM：那会造成画面与 Lakex 数据树不同步。
        console.warn('[LakexEditor] 无法移动该块，已保持原位置');
      }

      setVisible(false);
      setHoverState({ blockElement: null, blockId: null, blockType: null });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [editor, findBlockNode, onContextMenu]);

  // ========== 暴露 __resumeHover 供外部调用 ==========
  useEffect(() => {
    const el = handleRef.current;
    if (el) {
      (el as any).__resumeHover = () => {
        mouseoutPausedRef.current = false;
      };
    }
  });

  // 合并 ref
  const setRefs = useCallback((el: HTMLDivElement | null) => {
    (handleRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (typeof forwardedRef === 'function') {
      forwardedRef(el);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  }, [forwardedRef]);

  // if (!visible || !hoverState.blockElement) return null;

  return (
    <div
      ref={setRefs}
      className={`ne-block-hover-handle${dark ? ' ne-block-hover-handle--dark' : ''}`}
      style={{
        ...handleStyle,
        opacity: (!visible || !hoverState.blockElement) ? 0 : 1,
        pointerEvents: (!visible || !hoverState.blockElement) ? 'none' : 'auto',
      }}
      role="button"
      tabIndex={visible ? 0 : -1}
      aria-label={language === 'en-us' ? 'Click or drag' : '可点击和拖拽'}
      onMouseDown={(event) => {
        startDrag(event);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const blockElement = hoverStateRef.current.blockElement;
        if (!blockElement || !onContextMenu) return;
        event.preventDefault();
        mouseoutPausedRef.current = true;
        const rect = handleRef.current?.getBoundingClientRect();
        onContextMenu(blockElement, {
          clientX: rect?.left ?? 0,
          clientY: rect?.bottom ?? 0,
          preventDefault() {},
          stopPropagation() {},
        } as unknown as MouseEvent);
      }}
      onMouseEnter={() => {
        handleHoveredRef.current = true;
        if (hideTimerRef.current !== null) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        // 鼠标移到手柄：高亮对应的块节点
        setBlockHighlight(true);
      }}
      onMouseLeave={() => {
        handleHoveredRef.current = false;
        // 鼠标离开手柄：取消对应块节点的高亮
        setBlockHighlight(false);
        hideHandle();
      }}
    >
      <span className="ne-block-handle-inner">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="ne-block-handle-icon"
        >
          <circle cx="6" cy="3" r="1.5" fill="currentColor" />
          <circle cx="6" cy="8" r="1.5" fill="currentColor" />
          <circle cx="6" cy="13" r="1.5" fill="currentColor" />
          <circle cx="10" cy="3" r="1.5" fill="currentColor" />
          <circle cx="10" cy="8" r="1.5" fill="currentColor" />
          <circle cx="10" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span className="ne-block-handle-tooltip" role="tooltip">
        {language === 'en-us' ? 'Click or drag' : '可点击和拖拽'}
      </span>
    </div>
  );
});

export default BlockHoverHandle;
