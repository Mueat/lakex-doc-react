import type {
  DrawingBoardAIRequest,
  DrawingBoardAIResponse,
} from "@dlient/lakex-doc-react";

type Locale = DrawingBoardAIRequest["locale"];
type Color = "blue" | "green" | "yellow" | "purple" | "gray";

const choose = (locale: Locale, zh: string, en: string) =>
  locale === "zh-CN" ? zh : en;

const colors: Record<Color, [string, string]> = {
  blue: ["#E8F1FF", "#5B8FF9"],
  green: ["#EAF8F0", "#5BB98C"],
  yellow: ["#FFF6D9", "#D9A441"],
  purple: ["#F3EBFF", "#9B71D1"],
  gray: ["#F3F4F6", "#8B95A5"],
};

const node = (
  id: string,
  shape: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  color: Color = "blue",
) => ({
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
    strokeStyle: "solid",
    fontSize: 14,
    textColor: "#273142",
  },
});

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
    strokeStyle: "solid",
    endMarker: "arrow",
  },
});

const flowchart = (
  description: string,
  locale: Locale,
): DrawingBoardAIResponse => ({
  version: 1,
  title: description.slice(0, 80),
  nodes: [
    node("start", "terminal", 390, 70, 160, 56, choose(locale, "开始", "Start"), "green"),
    node("input", "process", 370, 180, 200, 64, choose(locale, "输入账号密码", "Enter credentials")),
    node("check", "decision", 375, 300, 190, 110, choose(locale, "密码正确？", "Password valid?"), "yellow"),
    node("success", "process", 370, 500, 200, 64, choose(locale, "登录成功", "Login successful"), "green"),
    node("retry", "process", 70, 323, 210, 64, choose(locale, "提示错误并重试", "Show error and retry"), "purple"),
  ],
  edges: [
    edge("e1", "start", "input"),
    edge("e2", "input", "check"),
    edge("e3", "check", "success", "bottom", "top", choose(locale, "是", "Yes")),
    edge("e4", "check", "retry", "left", "right", choose(locale, "否", "No")),
    edge("e5", "retry", "input", "top", "left"),
  ],
});

const architecture = (
  description: string,
  locale: Locale,
): DrawingBoardAIResponse => ({
  version: 1,
  title: description.slice(0, 80),
  nodes: [
    node("client", "roundRectangle", 70, 250, 170, 72, choose(locale, "Web / 移动端", "Web / Mobile"), "purple"),
    node("gateway", "component", 330, 240, 190, 92, choose(locale, "API 网关", "API Gateway")),
    node("users", "component", 620, 90, 200, 84, choose(locale, "用户服务", "User Service"), "green"),
    node("business", "component", 620, 240, 200, 84, choose(locale, "业务服务", "Business Service"), "green"),
    node("notice", "component", 620, 390, 200, 84, choose(locale, "通知服务", "Notification Service"), "green"),
    node("database", "database", 930, 230, 180, 110, choose(locale, "数据存储", "Data Store"), "yellow"),
  ],
  edges: [
    edge("e1", "client", "gateway", "right", "left"),
    edge("e2", "gateway", "users", "right", "left"),
    edge("e3", "gateway", "business", "right", "left"),
    edge("e4", "gateway", "notice", "right", "left"),
    edge("e5", "users", "database", "right", "left"),
    edge("e6", "business", "database", "right", "left"),
    edge("e7", "notice", "database", "right", "left"),
  ],
});

const uml = (
  description: string,
  locale: Locale,
): DrawingBoardAIResponse => ({
  version: 1,
  title: description.slice(0, 80),
  nodes: [
    node("actor", "actor", 80, 210, 130, 150, choose(locale, "用户", "User"), "gray"),
    node("login", "useCase", 340, 100, 210, 90, choose(locale, "登录系统", "Sign in")),
    node("submit", "useCase", 340, 250, 210, 90, choose(locale, "提交请求", "Submit request")),
    node("query", "useCase", 340, 400, 210, 90, choose(locale, "查询状态", "View status")),
    node("service", "class", 720, 195, 240, 210, "RequestService", "purple"),
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

const mindMap = (
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
      node("goal", "roundRectangle", 70, 80, 190, 72, choose(locale, "目标", "Goals")),
      node("people", "roundRectangle", 70, 470, 190, 72, choose(locale, "参与者", "People"), "green"),
      node("plan", "roundRectangle", 790, 80, 190, 72, choose(locale, "实施计划", "Plan"), "yellow"),
      node("risk", "roundRectangle", 790, 470, 190, 72, choose(locale, "风险与指标", "Risks & metrics"), "gray"),
    ],
    edges: [
      edge("e1", "root", "goal", "left", "right"),
      edge("e2", "root", "people", "left", "right"),
      edge("e3", "root", "plan", "right", "left"),
      edge("e4", "root", "risk", "right", "left"),
    ],
  };
};

const delay = (signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 650);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("The request was aborted", "AbortError"));
      },
      { once: true },
    );
  });

/** Offline fallback used by the example when VITE_LAKEX_AI_USE_MOCK=true. */
export async function mockDrawingBoardGenerate({
  description,
  locale,
  signal,
}: DrawingBoardAIRequest): Promise<DrawingBoardAIResponse> {
  await delay(signal);
  if (/模拟失败|mock[\s-]?fail/i.test(description)) {
    throw new Error("Mock AI request failed");
  }
  if (/uml|用例|类图/i.test(description)) return uml(description, locale);
  if (/架构|architecture|微服务|系统图|技术图/i.test(description)) {
    return architecture(description, locale);
  }
  if (/思维|脑图|mind[\s-]?map/i.test(description)) {
    return mindMap(description, locale);
  }
  return flowchart(description, locale);
}
