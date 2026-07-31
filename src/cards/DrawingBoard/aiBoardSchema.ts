import type { PlaitElement, Point } from "@plait/core";
import { buildText } from "@plait/common";
import {
  ArrowLineMarkerType,
  ArrowLineShape,
  BasicShapes,
  createArrowLineElement,
  createGeometryElement,
  FlowchartSymbols,
  UMLSymbols,
  type GeometryShapes,
} from "@plait/draw";
import drawingBoardFormatSpec from "../../../docs/lakex-drawing-board-json-format-skills.md?raw";

export const DRAWING_BOARD_AI_SYSTEM_PROMPT = [
  "你是 Lakex AI 画板数据生成器。",
  "请严格遵守下面的格式规范，根据用户描述生成一份可以直接导入画板的 JSON。",
  "最终响应只能包含 JSON 对象，不能包含 Markdown 代码围栏、解释或注释。",
  "",
  drawingBoardFormatSpec,
].join("\n");

type Anchor = "top" | "right" | "bottom" | "left";

interface AIBoardNodeStyle {
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  textColor?: string;
}

interface AIBoardNode {
  id: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: AIBoardNodeStyle;
}

interface AIBoardEdgeStyle {
  lineType?: "straight" | "elbow" | "curve";
  strokeColor?: string;
  strokeWidth?: number;
  endMarker?: "arrow" | "none";
}

interface AIBoardEdge {
  id: string;
  source: string;
  target: string;
  sourceAnchor?: Anchor;
  targetAnchor?: Anchor;
  label: string;
  style: AIBoardEdgeStyle;
}

export interface AIBoardDocument {
  version: 1;
  title?: string;
  nodes: AIBoardNode[];
  edges: AIBoardEdge[];
}

const shapeMap: Record<string, GeometryShapes> = {
  rectangle: BasicShapes.rectangle,
  roundRectangle: BasicShapes.roundRectangle,
  ellipse: BasicShapes.ellipse,
  diamond: BasicShapes.diamond,
  triangle: BasicShapes.triangle,
  parallelogram: BasicShapes.parallelogram,
  trapezoid: BasicShapes.trapezoid,
  pentagon: BasicShapes.pentagon,
  hexagon: BasicShapes.hexagon,
  octagon: BasicShapes.octagon,
  cloud: BasicShapes.cloud,
  text: BasicShapes.text,
  process: FlowchartSymbols.process,
  terminal: FlowchartSymbols.terminal,
  decision: FlowchartSymbols.decision,
  data: FlowchartSymbols.data,
  connector: FlowchartSymbols.connector,
  manualInput: FlowchartSymbols.manualInput,
  preparation: FlowchartSymbols.preparation,
  predefinedProcess: FlowchartSymbols.predefinedProcess,
  document: FlowchartSymbols.document,
  multiDocument: FlowchartSymbols.multiDocument,
  database: FlowchartSymbols.database,
  internalStorage: FlowchartSymbols.internalStorage,
  delay: FlowchartSymbols.delay,
  display: FlowchartSymbols.display,
  offPage: FlowchartSymbols.offPage,
  noteSquare: FlowchartSymbols.noteSquare,
  actor: UMLSymbols.actor,
  useCase: UMLSymbols.useCase,
  component: UMLSymbols.component,
  container: UMLSymbols.container,
  note: UMLSymbols.note,
  package: UMLSymbols.package,
  simpleClass: UMLSymbols.simpleClass,
  class: UMLSymbols.class,
  interface: UMLSymbols.interface,
  object: UMLSymbols.object,
  componentBox: UMLSymbols.componentBox,
  activityClass: UMLSymbols.activityClass,
  branchMerge: UMLSymbols.branchMerge,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const readNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
};

const readString = (value: unknown, maxLength: number, fallback = "") =>
  typeof value === "string" ? value.slice(0, maxLength) : fallback;

const readColor = (value: unknown, fallback: string, transparent = false) => {
  if (transparent && value === "transparent") return "transparent";
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toUpperCase()
    : fallback;
};

const readAnchor = (value: unknown): Anchor | undefined =>
  value === "top" || value === "right" || value === "bottom" || value === "left"
    ? value
    : undefined;

const parseResponseValue = (response: unknown): unknown => {
  if (typeof response !== "string") return response;
  const trimmed = response.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    throw new Error("AI_RESPONSE_NOT_JSON");
  }
};

export function parseAIBoardDocument(response: unknown): AIBoardDocument {
  const raw = parseResponseValue(response);
  if (!isRecord(raw) || raw.version !== 1) {
    throw new Error("AI_SCHEMA_VERSION_INVALID");
  }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    throw new Error("AI_SCHEMA_COLLECTION_INVALID");
  }
  if (
    raw.nodes.length === 0 ||
    raw.nodes.length > 80 ||
    raw.edges.length > 120
  ) {
    throw new Error("AI_SCHEMA_SIZE_INVALID");
  }

  const ids = new Set<string>();
  const nodes = raw.nodes.map((item, index): AIBoardNode => {
    if (!isRecord(item)) throw new Error(`AI_NODE_INVALID:${index}`);
    const id = readString(item.id, 64);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) {
      throw new Error(`AI_NODE_ID_INVALID:${index}`);
    }
    ids.add(id);
    const shape = readString(item.shape, 32);
    if (!shapeMap[shape]) throw new Error(`AI_NODE_SHAPE_INVALID:${shape}`);
    const style = isRecord(item.style) ? item.style : {};
    return {
      id,
      shape,
      x: readNumber(item.x, 80 + (index % 4) * 240, -5000, 5000),
      y: readNumber(item.y, 80 + Math.floor(index / 4) * 140, -5000, 5000),
      width: readNumber(item.width, 180, 40, 1200),
      height: readNumber(item.height, 64, 24, 800),
      text: readString(item.text, 500),
      style: {
        fill: readColor(style.fill, "#E8F1FF", true),
        strokeColor: readColor(style.strokeColor, "#5B8FF9"),
        strokeWidth: readNumber(style.strokeWidth, 1.5, 0, 8),
        fontSize: readNumber(style.fontSize, 14, 10, 72),
        textColor: readColor(style.textColor, "#273142"),
      },
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = raw.edges.map((item, index): AIBoardEdge => {
    if (!isRecord(item)) throw new Error(`AI_EDGE_INVALID:${index}`);
    const id = readString(item.id, 64);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) {
      throw new Error(`AI_EDGE_ID_INVALID:${index}`);
    }
    ids.add(id);
    const source = readString(item.source, 64);
    const target = readString(item.target, 64);
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) {
      throw new Error(`AI_EDGE_REFERENCE_INVALID:${index}`);
    }
    const style = isRecord(item.style) ? item.style : {};
    const lineType =
      style.lineType === "straight" ||
      style.lineType === "curve" ||
      style.lineType === "elbow"
        ? style.lineType
        : "elbow";
    return {
      id,
      source,
      target,
      sourceAnchor: readAnchor(item.sourceAnchor),
      targetAnchor: readAnchor(item.targetAnchor),
      label: readString(item.label, 120),
      style: {
        lineType,
        strokeColor: readColor(style.strokeColor, "#697586"),
        strokeWidth: readNumber(style.strokeWidth, 1.5, 0.5, 8),
        endMarker: style.endMarker === "none" ? "none" : "arrow",
      },
    };
  });

  return {
    version: 1,
    title: readString(raw.title, 120) || undefined,
    nodes,
    edges,
  };
}

const connectionByAnchor: Record<Anchor, Point> = {
  top: [0.5, 0],
  right: [1, 0.5],
  bottom: [0.5, 1],
  left: [0, 0.5],
};

const inferAnchors = (
  source: AIBoardNode,
  target: AIBoardNode,
): [Anchor, Anchor] => {
  const sourceCenter: Point = [
    source.x + source.width / 2,
    source.y + source.height / 2,
  ];
  const targetCenter: Point = [
    target.x + target.width / 2,
    target.y + target.height / 2,
  ];
  const dx = targetCenter[0] - sourceCenter[0];
  const dy = targetCenter[1] - sourceCenter[1];
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? ["right", "left"] : ["left", "right"];
  }
  return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
};

const anchorPoint = (node: AIBoardNode, anchor: Anchor): Point => {
  switch (anchor) {
    case "top":
      return [node.x + node.width / 2, node.y];
    case "right":
      return [node.x + node.width, node.y + node.height / 2];
    case "bottom":
      return [node.x + node.width / 2, node.y + node.height];
    case "left":
      return [node.x, node.y + node.height / 2];
  }
};

export function convertAIBoardDocument(
  document: AIBoardDocument,
): PlaitElement[] {
  const elements: PlaitElement[] = [];
  const nativeNodes = new Map<
    string,
    { source: AIBoardNode; element: PlaitElement }
  >();

  document.nodes.forEach((node) => {
    const isText = node.shape === "text";
    const element = createGeometryElement(
      shapeMap[node.shape],
      [
        [node.x, node.y],
        [node.x + node.width, node.y + node.height],
      ],
      node.text,
      {
        fill: isText ? "transparent" : node.style.fill,
        strokeColor: isText ? "transparent" : node.style.strokeColor,
        strokeWidth: isText ? 0 : node.style.strokeWidth,
      },
      {
        "font-size": String(node.style.fontSize),
        color: node.style.textColor,
      },
    );
    elements.push(element);
    nativeNodes.set(node.id, { source: node, element });
  });

  document.edges.forEach((edge) => {
    const sourceEntry = nativeNodes.get(edge.source);
    const targetEntry = nativeNodes.get(edge.target);
    if (!sourceEntry || !targetEntry) return;
    const inferred = inferAnchors(sourceEntry.source, targetEntry.source);
    const sourceAnchor = edge.sourceAnchor ?? inferred[0];
    const targetAnchor = edge.targetAnchor ?? inferred[1];
    const lineShape =
      edge.style.lineType === "straight"
        ? ArrowLineShape.straight
        : edge.style.lineType === "curve"
          ? ArrowLineShape.curve
          : ArrowLineShape.elbow;
    const line = createArrowLineElement(
      lineShape,
      [
        anchorPoint(sourceEntry.source, sourceAnchor),
        anchorPoint(targetEntry.source, targetAnchor),
      ],
      {
        boundId: sourceEntry.element.id,
        connection: connectionByAnchor[sourceAnchor] as any,
        marker: ArrowLineMarkerType.none,
      },
      {
        boundId: targetEntry.element.id,
        connection: connectionByAnchor[targetAnchor] as any,
        marker:
          edge.style.endMarker === "none"
            ? ArrowLineMarkerType.none
            : ArrowLineMarkerType.arrow,
      },
      edge.label
        ? [{ text: buildText(edge.label) as any, position: 0.5 }]
        : undefined,
      {
        strokeColor: edge.style.strokeColor,
        strokeWidth: edge.style.strokeWidth,
      },
    );
    elements.push(line);
  });

  return elements;
}
