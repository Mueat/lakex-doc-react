// src/editor/cards/MindMapCard/index.ts
import { CustomCard, CustomCardConfig } from '../../components/lakex/types';
import MindMapEditor from './MindMapEditor';
import MindMapViewer from './MindMapViewer';
import type { IMindMapCardValue } from './types';

const defaultMarkdown = `Mindmap
  - New Node 1
  - New Node 2
  - New Node 3`;

export const mindMapCardConfig: CustomCardConfig = {
  name: 'mindmap-card',
  cardType: 'block',
  editorComponent: MindMapEditor,
  viewerComponent: MindMapViewer,
  initValue: {
    markdown: defaultMarkdown,
    cardHeight: 500,
  },
  slash: {
    /** 图标 */
    icon: 'editor-main-mind-map',
    /**
     * 斜杆面板的搜索提示，提示用户搜索，例如：/glk
     */
    mainSearch: '/mindmap',
    label: () => ({zhCN: '思维导图', enUS: 'Mindmap'}),
    description: () => ({zhCN: '用于梳理信息和头脑风暴', enUS: 'For ideas and brainstorm'}),
    keywords: ['mindmap', '思维导图', '脑图', 'map'],
  },
  writeText: (value: IMindMapCardValue | null) => {
    return value?.markdown || '';
  },
  writeHtml: (value: IMindMapCardValue | null) => {
    console.log(value);
    if (!value?.markdown) return '<div></div>';
    const lines = value.markdown.split('\n').map(line => line.trim()).filter(Boolean);
    return `<div style="padding:12px;background:#fafafa;border-radius:8px;">
      <pre style="margin-top:8px;font-size:12px;color:#666;">${lines.join('\n')}</pre>
    </div>`;
  },
};

export const mindMapCard: CustomCard = {
  config: mindMapCardConfig
}

