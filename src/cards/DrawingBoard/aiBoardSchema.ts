import type { PlaitBoard, PlaitElement, Point } from "@plait/core";
import { Alignment, buildText, StrokeStyle } from "@plait/common";
import {
  ArrowLineMarkerType,
  ArrowLineShape,
  BasicShapes,
  createArrowLineElement,
  createDefaultGeometry,
  createGeometryElement,
  FlowchartSymbols,
  UMLSymbols,
  type GeometryShapes,
} from "@plait/draw";
import drawingBoardFormatSpec from "../../../docs/lakex-drawing-board-json-format-skills.md?raw";

const RUNTIME_SPEC_START = "<!-- AI_RUNTIME_SPEC_START -->";
const RUNTIME_SPEC_END = "<!-- AI_RUNTIME_SPEC_END -->";

const extractRuntimeSpec = (document: string) => {
  const start = document.indexOf(RUNTIME_SPEC_START);
  const end = document.indexOf(RUNTIME_SPEC_END);
  if (start < 0 || end <= start) return document;
  return document.slice(start + RUNTIME_SPEC_START.length, end).trim();
};

export const DRAWING_BOARD_AI_SYSTEM_PROMPT = [
  "你是 Lakex AI 画板数据生成器。",
  "请严格遵守下面的格式规范，根据用户描述生成一份可以直接导入画板的 JSON。",
  "最终响应只能包含 JSON 对象，不能包含 Markdown 代码围栏、解释或注释。",
  "",
  extractRuntimeSpec(drawingBoardFormatSpec),
].join("\n");

type Anchor = "top" | "right" | "bottom" | "left";

interface AIBoardNodeStyle {
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
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
  strokeStyle?: StrokeStyle;
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

const shapeNameByNative = new Map<GeometryShapes, string>(
  Object.entries(shapeMap).map(([name, shape]) => [shape, name]),
);

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

const readStrokeStyle = (value: unknown): StrokeStyle =>
  value === StrokeStyle.dashed || value === StrokeStyle.dotted
    ? value
    : StrokeStyle.solid;

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
        strokeStyle: readStrokeStyle(style.strokeStyle),
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
        strokeStyle: readStrokeStyle(style.strokeStyle),
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

const getNodeCenter = (node: AIBoardNode): Point => [
  node.x + node.width / 2,
  node.y + node.height / 2,
];

const getDirectionalAnchorCandidates = (
  node: AIBoardNode,
  other: AIBoardNode,
): Anchor[] => {
  const center = getNodeCenter(node);
  const otherCenter = getNodeCenter(other);
  const dx = otherCenter[0] - center[0];
  const dy = otherCenter[1] - center[1];
  const horizontal: Anchor = dx >= 0 ? "right" : "left";
  const vertical: Anchor = dy >= 0 ? "bottom" : "top";
  return Math.abs(dx) > Math.abs(dy)
    ? [horizontal, vertical]
    : [vertical, horizontal];
};

/**
 * An endpoint must be on the side of a node that faces the other node.
 * Otherwise Plait's elbow router has to cross the target's interior to reach
 * the requested connection point (for example, an upper source connected to
 * the target's left side while its x coordinate is inside the target).
 */
const isAnchorFacingNode = (
  node: AIBoardNode,
  anchor: Anchor,
  other: AIBoardNode,
) => {
  const [otherX, otherY] = getNodeCenter(other);
  switch (anchor) {
    case "top":
      return otherY <= node.y;
    case "right":
      return otherX >= node.x + node.width;
    case "bottom":
      return otherY >= node.y + node.height;
    case "left":
      return otherX <= node.x;
  }
};

const chooseNonConflictingAnchor = (
  node: AIBoardNode,
  other: AIBoardNode,
  requested: Anchor | undefined,
  inferred: Anchor,
  used: Set<Anchor>,
) => {
  const candidates = [
    requested,
    inferred,
    ...getDirectionalAnchorCandidates(node, other),
    "top" as Anchor,
    "right" as Anchor,
    "bottom" as Anchor,
    "left" as Anchor,
  ].filter(
    (anchor, index, list): anchor is Anchor =>
      !!anchor &&
      list.indexOf(anchor) === index &&
      isAnchorFacingNode(node, anchor, other),
  );
  return (
    candidates.find((anchor) => !used.has(anchor)) ??
    candidates[0] ??
    inferred
  );
};

const resolveEdgeAnchors = (document: AIBoardDocument) => {
  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  const usedSourceAnchors = new Map<string, Set<Anchor>>();
  const usedTargetAnchors = new Map<string, Set<Anchor>>();
  const resolved = new Map<string, [Anchor, Anchor]>();

  document.edges.forEach((edge) => {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target) return;
    const inferred = inferAnchors(source, target);
    const sourceUsed = usedSourceAnchors.get(source.id) ?? new Set<Anchor>();
    const targetUsed = usedTargetAnchors.get(target.id) ?? new Set<Anchor>();
    const sourceAnchor = chooseNonConflictingAnchor(
      source,
      target,
      edge.sourceAnchor,
      inferred[0],
      sourceUsed,
    );
    const targetAnchor = chooseNonConflictingAnchor(
      target,
      source,
      edge.targetAnchor,
      inferred[1],
      targetUsed,
    );
    sourceUsed.add(sourceAnchor);
    targetUsed.add(targetAnchor);
    usedSourceAnchors.set(source.id, sourceUsed);
    usedTargetAnchors.set(target.id, targetUsed);
    resolved.set(edge.id, [sourceAnchor, targetAnchor]);
  });

  return resolved;
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

const readSlateText = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  return Array.isArray(record.children)
    ? record.children.map(readSlateText).join("")
    : "";
};

const findFirstTextLeaf = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record;
  if (!Array.isArray(record.children)) return undefined;
  for (const child of record.children) {
    const leaf = findFirstTextLeaf(child);
    if (leaf) return leaf;
  }
  return undefined;
};

const getElementTextValue = (element: Record<string, any>) => {
  if (element.text) return readSlateText(element.text);
  if (Array.isArray(element.cells)) {
    return element.cells
      .map((cell: Record<string, unknown>) => readSlateText(cell.text))
      .filter(Boolean)
      .join("\n");
  }
  if (Array.isArray(element.texts)) {
    return element.texts
      .map((item: Record<string, unknown>) => readSlateText(item.text))
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

const getElementTextStyle = (element: Record<string, any>) => {
  const text =
    element.text ??
    element.cells?.find((cell: Record<string, unknown>) => cell.text)?.text ??
    element.texts?.find((item: Record<string, unknown>) => item.text)?.text;
  const leaf = findFirstTextLeaf(text);
  const fontSize = Number(leaf?.["font-size"]);
  return {
    fontSize: Number.isFinite(fontSize) ? clamp(fontSize, 10, 72) : 14,
    textColor:
      typeof leaf?.color === "string" && /^#[0-9a-f]{6}$/i.test(leaf.color)
        ? leaf.color.toUpperCase()
        : "#273142",
  };
};

const getElementRectangle = (points: unknown): BoardRectangle | null => {
  if (!Array.isArray(points) || points.length < 2) return null;
  const validPoints = points.filter(
    (point): point is Point =>
      Array.isArray(point) &&
      point.length >= 2 &&
      Number.isFinite(point[0]) &&
      Number.isFinite(point[1]),
  );
  if (!validPoints.length) return null;
  const xs = validPoints.map((point) => point[0]);
  const ys = validPoints.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(40, maxX - minX),
    height: Math.max(24, maxY - minY),
  };
};

interface BoardRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const anchorFromConnection = (connection: unknown): Anchor | undefined => {
  if (
    !Array.isArray(connection) ||
    connection.length < 2 ||
    !Number.isFinite(connection[0]) ||
    !Number.isFinite(connection[1])
  ) {
    return undefined;
  }
  const candidates = Object.entries(connectionByAnchor) as [Anchor, Point][];
  return candidates.reduce(
    (closest, candidate) => {
      const distance =
        Math.abs(candidate[1][0] - connection[0]) +
        Math.abs(candidate[1][1] - connection[1]);
      return distance < closest.distance
        ? { anchor: candidate[0], distance }
        : closest;
    },
    { anchor: "top" as Anchor, distance: Number.POSITIVE_INFINITY },
  ).anchor;
};

/**
 * Serializes only the latest editable board state into the stable AI format.
 * Previous AI JSON is deliberately not retained; manual edits made between
 * prompts therefore become the source of truth for the next request.
 */
export function serializeBoardToAIDocument(
  board: PlaitBoard,
): AIBoardDocument {
  const nodes: AIBoardNode[] = [];
  const nodeIds = new Set<string>();

  for (const child of board.children) {
    if (nodes.length >= 80) break;
    const element = child as Record<string, any>;
    if (element.type !== "geometry") continue;
    const shape = shapeNameByNative.get(element.shape as GeometryShapes);
    const rectangle = getElementRectangle(element.points);
    if (!shape || !rectangle || !/^[a-zA-Z0-9_-]+$/.test(element.id)) {
      continue;
    }
    const textStyle = getElementTextStyle(element);
    nodes.push({
      id: element.id,
      shape,
      ...rectangle,
      text: getElementTextValue(element).slice(0, 500),
      style: {
        fill:
          element.fill === "transparent" ||
          /^#[0-9a-f]{6}$/i.test(element.fill)
            ? element.fill
            : "#E8F1FF",
        strokeColor: /^#[0-9a-f]{6}$/i.test(element.strokeColor)
          ? element.strokeColor
          : "#5B8FF9",
        strokeWidth: readNumber(element.strokeWidth, 1.5, 0, 8),
        strokeStyle: readStrokeStyle(element.strokeStyle),
        ...textStyle,
      },
    });
    nodeIds.add(element.id);
  }

  const edges: AIBoardEdge[] = [];
  for (const child of board.children) {
    if (edges.length >= 120) break;
    const element = child as Record<string, any>;
    if (
      element.type !== "arrow-line" ||
      !nodeIds.has(element.source?.boundId) ||
      !nodeIds.has(element.target?.boundId)
    ) {
      continue;
    }
    const lineType =
      element.shape === ArrowLineShape.straight ||
      element.shape === ArrowLineShape.curve
        ? element.shape
        : ArrowLineShape.elbow;
    const label = Array.isArray(element.texts)
      ? element.texts.map((item: any) => readSlateText(item.text)).join("")
      : "";
    edges.push({
      id:
        typeof element.id === "string" &&
        /^[a-zA-Z0-9_-]+$/.test(element.id)
          ? element.id
          : `edge_${edges.length + 1}`,
      source: element.source.boundId,
      target: element.target.boundId,
      sourceAnchor: anchorFromConnection(element.source.connection),
      targetAnchor: anchorFromConnection(element.target.connection),
      label: label.slice(0, 120),
      style: {
        lineType,
        strokeColor: /^#[0-9a-f]{6}$/i.test(element.strokeColor)
          ? element.strokeColor
          : "#697586",
        strokeWidth: readNumber(element.strokeWidth, 1.5, 0.5, 8),
        strokeStyle: readStrokeStyle(element.strokeStyle),
        endMarker:
          element.target.marker === ArrowLineMarkerType.none ? "none" : "arrow",
      },
    });
  }

  return { version: 1, nodes, edges };
}

const MAX_MEMORY_ITEMS = 20;
const MAX_MEMORY_CHARACTERS = 8000;

export function buildAIBoardContextPrompt({
  description,
  history,
  currentBoard,
  mode,
}: {
  description: string;
  history: readonly string[];
  currentBoard: AIBoardDocument;
  mode: "replace" | "append";
}) {
  const retainedHistory: string[] = [];
  let retainedCharacters = 0;
  for (
    let index = history.length - 1;
    index >= 0 && retainedHistory.length < MAX_MEMORY_ITEMS;
    index -= 1
  ) {
    const item = history[index].trim();
    if (!item) continue;
    if (retainedCharacters + item.length > MAX_MEMORY_CHARACTERS) break;
    retainedHistory.unshift(item);
    retainedCharacters += item.length;
  }
  const historyText = retainedHistory.length
    ? retainedHistory
        .map((item, index) => `${index + 1}. ${item}`)
        .join("\n")
    : "无，这是本轮会话的第一次提问。";
  const boardJSON = JSON.stringify(currentBoard);
  const behavior =
    mode === "append"
      ? [
          "本轮模式：添加独立图到当前画布。",
          "当前画布 JSON 仅用于理解已有内容和避免语义重复。",
          "只返回本轮需要新增的完整节点与连线，不要重复输出当前画布已有节点。",
        ]
      : currentBoard.nodes.length
        ? [
            "本轮模式：继续修改当前画布。",
            "必须以当前画布 JSON 为基础完成最新需求。",
            "返回修改后的完整画布 JSON；保留未要求删除的节点、连线及其 ID。",
          ]
        : [
            "本轮模式：从空画布开始生成。",
            "请根据最新需求返回一份完整的新画布 JSON。",
          ];

  return [
    "下面是本轮 AI 画板会话上下文。",
    "",
    "用户历史需求（仅记录成功生成后的提问，按时间顺序）：",
    historyText,
    "",
    "当前画布的最新 JSON（这是唯一一份画布 JSON，已包含用户手工修改）：",
    boardJSON,
    "",
    "最新用户需求：",
    description.trim(),
    "",
    ...behavior,
    "严格按照 system message 中的画板格式规范输出，只输出 JSON。",
  ].join("\n");
}

export function convertAIBoardDocument(
  document: AIBoardDocument,
  board?: PlaitBoard,
): PlaitElement[] {
  const elements: PlaitElement[] = [];
  const resolvedAnchors = resolveEdgeAnchors(document);
  const nativeNodes = new Map<
    string,
    { source: AIBoardNode; element: PlaitElement }
  >();

  document.nodes.forEach((node) => {
    const isText = node.shape === "text";
    const points: [Point, Point] = [
      [node.x, node.y],
      [node.x + node.width, node.y + node.height],
    ];
    const textProperties = {
      "font-size": String(node.style.fontSize),
      color: node.style.textColor,
    };
    const isUMLTable = node.shape === "class" || node.shape === "interface";
    const element =
      board && isUMLTable
        ? createDefaultGeometry(board, points, shapeMap[node.shape])
        : createGeometryElement(
            shapeMap[node.shape],
            points,
            node.text,
            {
              fill: isText ? "transparent" : node.style.fill,
              strokeColor: isText ? "transparent" : node.style.strokeColor,
              strokeWidth: isText ? 0 : node.style.strokeWidth,
            },
            textProperties,
          );
    if (board && isUMLTable && "cells" in element) {
      const lines = node.text.split("\n");
      element.cells = element.cells.map((cell, index) => {
        const value =
          index === 0
            ? lines[0] || node.text
            : index === 1
              ? lines.slice(1).join("\n")
              : "";
        return {
          ...cell,
          text: buildText(
            value,
            index === 0 ? Alignment.center : Alignment.left,
            textProperties,
          ),
        };
      });
      element.fill = node.style.fill;
      element.strokeColor = node.style.strokeColor;
      element.strokeWidth = node.style.strokeWidth;
    }
    element.strokeStyle = node.style.strokeStyle;
    elements.push(element);
    nativeNodes.set(node.id, { source: node, element });
  });

  document.edges.forEach((edge) => {
    const sourceEntry = nativeNodes.get(edge.source);
    const targetEntry = nativeNodes.get(edge.target);
    if (!sourceEntry || !targetEntry) return;
    const inferred = inferAnchors(sourceEntry.source, targetEntry.source);
    const [sourceAnchor, targetAnchor] =
      resolvedAnchors.get(edge.id) ?? inferred;
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
    line.strokeStyle = edge.style.strokeStyle;
    elements.push(line);
  });

  return elements;
}
