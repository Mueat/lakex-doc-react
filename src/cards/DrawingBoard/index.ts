import type {
  CustomCard,
  CustomCardConfig,
} from '../../components/lakex/types';
import DrawingBoardEditor from './DrawingBoardEditor';
import DrawingBoardViewer from './DrawingBoardViewer';
import type { IDrawingBoardCardValue } from './types';

export const drawingBoardCardConfig: CustomCardConfig<IDrawingBoardCardValue> = {
  name: 'drawing-board',
  cardType: 'block',
  editorComponent: DrawingBoardEditor,
  viewerComponent: DrawingBoardViewer,
  initValue: {
    version: 2,
    engine: 'drawnix',
    plaitValue: [],
    plaitViewport: { x: 0, y: 0, zoom: 1 },
    cardHeight: 560,
  },
  slash: {
    icon: 'editor-main-drawing-board',
    mainSearch: '/hb',
    label: () => ({ zhCN: '画板', enUS: 'Drawing Board' }),
    description: () => ({
      zhCN: '可插入图形、连线和图片等',
      enUS: 'Insert shapes, connectors, text and images',
    }),
    keywords: [
      'board',
      'drawing',
      'whiteboard',
      'canvas',
      'hb',
      '画板',
      '白板',
      '绘图',
    ],
  },
  writeText: () => '画板',
  writeHtml: () => '<div data-drawing-board="drawnix">画板</div>',
};

export const drawingBoardCard: CustomCard<IDrawingBoardCardValue> = {
  config: drawingBoardCardConfig,
};

export { DrawingBoardEditor, DrawingBoardViewer };
export type { IDrawingBoardCardValue } from './types';
