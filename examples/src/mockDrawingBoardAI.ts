import type {
  DrawingBoardAIRequest,
  DrawingBoardAIResponse,
} from "@dlient/lakex-doc-react";

type Locale = DrawingBoardAIRequest["locale"];

const choose = (locale: Locale, zh: string, en: string) =>
  locale === "zh-CN" ? zh : en;

const node = (
  id: string,
  shape: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  color: "blue" | "green" | "yellow" | "purple" | "gray" = "blue",
) => {
  const colors = {
    blue: ["#E8F1FF", "#5B8FF9"],
    green: ["#EAF8F0", "#5BB98C"],
    yellow: ["#FFF6D9", "#D9A441"],
    purple: ["#F3EBFF", "#9B71D1"],
    gray: ["#F3F4F6", "#8B95A5"],
  };
  return {
    id,
    shape,
    x,
    y,
    width,
    height,
    text,
    style: {
      fill: colors[color][0],
      strokeColor: colors[color][1],
      strokeWidth: 1.5,
      fontSize: 14,
      textColor: "#273142",
    },
  };
};

const edge = (
  id: string,
  source: string,
  target: string,
  sourceAnchor: "top" | "right" | "bottom" | "left" = "bottom",
  targetAnchor: "top" | "right" | "bottom" | "left" = "top",
  label = "",
) => ({
  id,
  source,
  target,
  sourceAnchor,
  targetAnchor,
  label,
  style: {
    lineType: "elbow",
    strokeColor: "#697586",
    strokeWidth: 1.5,
    endMarker: "arrow",
  },
});

const buildFlowchart = (
  description: string,
  locale: Locale,
): DrawingBoardAIResponse => {
  const isLogin = /登录|login|sign[\s-]?in/i.test(description);
  const labels = isLogin
    ? [
        choose(locale, "开始", "Start"),
        choose(locale, "输入账号和密码", "Enter credentials"),
        choose(locale, "密码正确？", "Password valid?"),
        choose(locale, "登录成功", "Login successful"),
        choose(locale, "提示错误并重试", "Show error and retry"),
      ]
    : [
        choose(locale, "开始", "Start"),
        choose(locale, "接收请求", "Receive request"),
        choose(locale, "条件满足？", "Condition met?"),
        choose(locale, "执行处理", "Process"),
        choose(locale, "结束", "Finish"),
      ];

  return {
    version: 1,
    title: description.slice(0, 80),
    nodes: [
      node("start", "terminal", 390, 70, 160, 56, labels[0], "green"),
      node("input", "process", 370, 180, 200, 64, labels[1]),
      node("check", "decision", 375, 300, 190, 110, labels[2], "yellow"),
      node("success", "process", 370, 500, 200, 64, labels[3], "green"),
      node("retry", "process", 70, 323, 210, 64, labels[4], "purple"),
      node(
        "done",
        "terminal",
        390,
        620,
        160,
        56,
        choose(locale, "完成", "Done"),
        "green",
      ),
    ],
    edges: [
      edge("e1", "start", "input"),
      edge("e2", "input", "check"),
      edge(
        "e3",
        "check",
        "success",
        "bottom",
        "top",
        choose(locale, "是", "Yes"),
      ),
      edge("e4", "check", "retry", "left", "right", choose(locale, "否", "No")),
      edge("e5", "retry", "input", "top", "left"),
      edge("e6", "success", "done"),
    ],
  };
};

const buildArchitecture = (
  description: string,
  locale: Locale,
): DrawingBoardAIResponse => ({
  version: 1,
  title: description.slice(0, 80),
  nodes: [
    node(
      "client",
      "roundRectangle",
      70,
      260,
      170,
      72,
      choose(locale, "Web / 移动端", "Web / Mobile"),
      "purple",
    ),
    node(
      "gateway",
      "component",
      330,
      250,
      190,
      92,
      choose(locale, "API 网关", "API Gateway"),
      "blue",
    ),
    node(
      "service_a",
      "component",
      620,
      110,
      200,
      84,
      choose(locale, "用户服务", "User Service"),
      "green",
    ),
    node(
      "service_b",
      "component",
      620,
      260,
      200,
      84,
      choose(locale, "业务服务", "Business Service"),
      "green",
    ),
    node(
      "service_c",
      "component",
      620,
      410,
      200,
      84,
      choose(locale, "通知服务", "Notification Service"),
      "green",
    ),
    node(
      "database",
      "database",
      930,
      240,
      180,
      110,
      choose(locale, "数据存储", "Data Store"),
      "yellow",
    ),
  ],
  edges: [
    edge("e1", "client", "gateway", "right", "left"),
    edge("e2", "gateway", "service_a", "right", "left"),
    edge("e3", "gateway", "service_b", "right", "left"),
    edge("e4", "gateway", "service_c", "right", "left"),
    edge("e5", "service_a", "database", "right", "left"),
    edge("e6", "service_b", "database", "right", "left"),
    edge("e7", "service_c", "database", "right", "left"),
  ],
});

const buildUML = (
  description: string,
  locale: Locale,
): DrawingBoardAIResponse => ({
  version: 1,
  title: description.slice(0, 80),
  nodes: [
    node(
      "actor",
      "actor",
      80,
      210,
      130,
      150,
      choose(locale, "用户", "User"),
      "gray",
    ),
    node(
      "login",
      "useCase",
      340,
      100,
      210,
      90,
      choose(locale, "登录系统", "Sign in"),
    ),
    node(
      "submit",
      "useCase",
      340,
      250,
      210,
      90,
      choose(locale, "提交请求", "Submit request"),
    ),
    node(
      "query",
      "useCase",
      340,
      400,
      210,
      90,
      choose(locale, "查询状态", "View status"),
    ),
    node(
      "service",
      "class",
      720,
      195,
      240,
      210,
      choose(
        locale,
        "RequestService\n—\ncreate()\nquery()\nupdate()",
        "RequestService\n—\ncreate()\nquery()\nupdate()",
      ),
      "purple",
    ),
  ],
  edges: [
    edge("e1", "actor", "login", "right", "left"),
    edge("e2", "actor", "submit", "right", "left"),
    edge("e3", "actor", "query", "right", "left"),
    edge("e4", "login", "service", "right", "left"),
    edge("e5", "submit", "service", "right", "left"),
    edge("e6", "query", "service", "right", "left"),
  ],
});

const buildMindMap = (
  description: string,
  locale: Locale,
): DrawingBoardAIResponse => {
  const topic =
    description
      .replace(/请|帮我|生成|创建|一个|一张|思维导图|脑图/gi, "")
      .trim()
      .slice(0, 24) || choose(locale, "核心主题", "Main topic");
  return {
    version: 1,
    title: topic,
    nodes: [
      node("root", "ellipse", 410, 260, 220, 100, topic, "purple"),
      node(
        "goal",
        "roundRectangle",
        70,
        80,
        190,
        72,
        choose(locale, "目标", "Goals"),
      ),
      node(
        "people",
        "roundRectangle",
        70,
        470,
        190,
        72,
        choose(locale, "参与者", "People"),
        "green",
      ),
      node(
        "plan",
        "roundRectangle",
        790,
        80,
        190,
        72,
        choose(locale, "实施计划", "Plan"),
        "yellow",
      ),
      node(
        "risk",
        "roundRectangle",
        790,
        470,
        190,
        72,
        choose(locale, "风险与指标", "Risks & metrics"),
        "gray",
      ),
    ],
    edges: [
      edge("e1", "root", "goal", "left", "right"),
      edge("e2", "root", "people", "left", "right"),
      edge("e3", "root", "plan", "right", "left"),
      edge("e4", "root", "risk", "right", "left"),
    ],
  };
};

/**
 * Local development mock for the AI board assistant.
 * It intentionally ignores `systemPrompt`; the real service should send that
 * value to the model as its system message.
 */
export async function mockDrawingBoardGenerate({
  description,
  locale,
}: DrawingBoardAIRequest): Promise<DrawingBoardAIResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 650));
  if (/uml|用例|类图/i.test(description)) {
    return buildUML(description, locale);
  }
  if (/架构|architecture|微服务|系统图|技术图/i.test(description)) {
    return buildArchitecture(description, locale);
  }
  if (/思维|脑图|mind[\s-]?map/i.test(description)) {
    return buildMindMap(description, locale);
  }
  return buildFlowchart(description, locale);
}
