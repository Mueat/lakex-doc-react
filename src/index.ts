// Public entry for the `@dlient/lakex-doc-react` package.
// Re-exports everything a consumer needs to embed the lakex (语雀) document
// editor inside a React app, plus the bundled framework instance `Doc`.

// CSS styles are imported here so they're included in the bundle but
// don't appear in the .d.ts declaration files.
import "./assets/antd.css";
import "./assets/lakex-doc.css";
import "./components/BlockHoverHandle/BlockHoverHandle.css";
import "./components/BlockContextMenu/BlockContextMenu.css";

// The framework bundle (ESM). `Doc` is the lakex-doc root object.
export { default as Doc } from "./components/lakex/lakex";

// React editor component.
export { LakexEditor } from "./components/lakex/LakexEditor";
export type {
  LakexEditorProps,
  LakexEditorConfig,
  LakexEditorContent,
  LakexEditorContentType,
  LakexEditorPlaceholder,
  LakexEditorLanguage,
  EnvAdapter,
  ImageConfig,
  InputConfig,
  LayoutConfig,
  HeadingConfig,
  VideoConfig,
  FileConfig,
  MentionConfig,
  MentionUserData,
  MentionContentData,
  MentionResponse,
  DateCardConfig,
  CalendarConfig,
  TocConfig,
  TocEditingConfig,
  TocReadingConfig,
  MathConfig,
  SlashConfig,
  ICardSelectOptionConfig,
  ICardSelectGroupConfig,
  CodeblockConfig,
  AudioConfig,
  AudioUploadResponse,
  AudioCardData,
  LinkConfig,
  VLinkMiniToolbarItem,
  HtmlDataSourceConfig,
  FallbackcardConfig,
  KernelAssistantConfig,
  DefaultFontsizeConfig,
  ToolbarConfig,
  ToolbarItemSpec,
  ToolbarModeConfig,
  ToolbarAgentConfig,
} from "./components/lakex/types";

// Reusable card height resizer (click-to-select + drag + delete-on-Delete).
export { default as CardResizer } from "./components/CardResizer/CardResizer";

// 查找卡片节点ID
export { default as findCardId } from './cards/utils';

// Shared card prop contract used by custom cards.
export type { ICardProps } from "./cards/types";

// custom card.
export { textToDiagramCard } from "./cards/TextToDiagram";
export { mindMapCard } from "./cards/MindMapCard";
export {
  drawingBoardCard,
  DrawingBoardEditor,
  DrawingBoardViewer,
} from "./cards/DrawingBoard";
export type { IDrawingBoardCardValue } from "./cards/DrawingBoard";

// export default config
export { default as GetDefaultEditorConfig} from './configs/editor'
export { default as GetDefaultSlashConfig } from "./configs/slash";
export { default as DefaultAudioConfig } from "./configs/audio";
export { default as DefaultEnvAdapterConfig } from "./configs/envAdapter";
export { default as DefaultFileConfig } from "./configs/file";
export { default as DefaultHeadingConfig } from "./configs/heading";
export { default as DeafultImageConfig } from "./configs/image";
export { default as DefaultInputConfig } from "./configs/input";
export { default as DefaultTocConfig } from "./configs/toc";
export { default as DefaultViedoConfig } from "./configs/video";

// 块悬浮拖拽手柄（hover 显示 ⋮ 图标，支持拖拽移动和右键菜单）
export { BlockHoverHandle } from "./components/BlockHoverHandle";
export type { BlockHoverHandleProps } from "./components/BlockHoverHandle";

// 块右键上下文菜单
export { BlockContextMenu } from "./components/BlockContextMenu";
export type {
  BlockContextMenuProps,
  MenuItem,
  BlockMenuAction,
} from "./components/BlockContextMenu";
