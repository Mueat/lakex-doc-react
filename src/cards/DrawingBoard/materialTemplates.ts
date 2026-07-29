import type { PlaitElement, Point } from "@plait/core";
import {
  ArrowLineMarkerType,
  ArrowLineShape,
  BasicShapes,
  createArrowLineElement,
  createGeometryElement,
  FlowchartSymbols,
  UMLSymbols,
} from "@plait/draw";

export type MaterialCategory =
  | "hot"
  | "teamwork"
  | "product"
  | "technology"
  | "thinking";

export interface MaterialTemplate {
  id: string;
  categories: MaterialCategory[];
  zh: string;
  en: string;
  /** Metadata mirrored from the selected Yuque material records. */
  sourceId?: number;
  docletId?: number;
  descriptionZh?: string;
  descriptionEn?: string;
  usageCount?: number;
  cover?: string;
  build: (locale: "zh-CN" | "en-US") => PlaitElement[];
}

type TemplateShape = BasicShapes | FlowchartSymbols | UMLSymbols;

const palette = {
  blue: { fill: "#E8F1FF", stroke: "#5B8FF9" },
  indigo: { fill: "#EEF0FF", stroke: "#6C7BD9" },
  green: { fill: "#EAF8F0", stroke: "#5BB98C" },
  yellow: { fill: "#FFF6D9", stroke: "#D9A441" },
  orange: { fill: "#FFF0E6", stroke: "#E58B50" },
  purple: { fill: "#F3EBFF", stroke: "#9B71D1" },
  cyan: { fill: "#E7F8F7", stroke: "#4FB6B2" },
  gray: { fill: "#F3F4F6", stroke: "#8B95A5" },
};

const box = (
  shape: TemplateShape,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  color: keyof typeof palette = "blue",
  fontSize = "13",
) =>
  createGeometryElement(
    shape,
    [
      [x, y],
      [x + width, y + height],
    ],
    text,
    {
      fill: palette[color].fill,
      strokeColor: palette[color].stroke,
      strokeWidth: 1.5,
    },
    { "font-size": fontSize, color: "#273142" },
  );

const arrow = (
  source: Point,
  target: Point,
  color = "#697586",
  marker = ArrowLineMarkerType.arrow,
) =>
  createArrowLineElement(
    ArrowLineShape.straight,
    [source, target],
    { marker: ArrowLineMarkerType.none },
    { marker },
    undefined,
    { strokeColor: color, strokeWidth: 1.5 },
  );

const label = (x: number, y: number, width: number, text: string) =>
  createGeometryElement(
    BasicShapes.text,
    [
      [x, y],
      [x + width, y + 26],
    ],
    text,
    undefined,
    { "font-size": "14", color: "#273142" },
  );

const choose = (
  locale: "zh-CN" | "en-US",
  zh: string,
  en: string,
) => (locale === "zh-CN" ? zh : en);

export const materialTemplates: MaterialTemplate[] = [
  {
    id: "approval-flow",
    categories: ["hot", "teamwork"],
    zh: "审批流程图",
    en: "Approval flow",
    sourceId: 18065029,
    docletId: 48499911,
    descriptionZh: "以不同类型的框代表不同种类的步骤，每两个步骤之间则以箭头连接。",
    descriptionEn: "Use different boxes for different steps and connect each step with arrows.",
    usageCount: 96553,
    cover: "https://mdn.alipayobjects.com/huamei_0prmtq/afts/img/A*Kub1RJ_eXnsAAAAAAAAAAAAADvuFAQ/original",
    build: (locale) => {
      const start = choose(locale, "开始", "Start");
      const submit = choose(locale, "提交申请", "Submit");
      const approve = choose(locale, "审批通过？", "Approved?");
      const execute = choose(locale, "执行方案", "Execute");
      const revise = choose(locale, "修改后重提", "Revise");
      const end = choose(locale, "结束", "End");
      return [
        box(FlowchartSymbols.terminal, -60, -210, 120, 46, start, "blue"),
        box(FlowchartSymbols.process, -70, -125, 140, 54, submit, "indigo"),
        box(FlowchartSymbols.decision, -72, -35, 144, 84, approve, "yellow"),
        box(FlowchartSymbols.process, -70, 95, 140, 54, execute, "green"),
        box(FlowchartSymbols.process, 145, -20, 145, 54, revise, "orange"),
        box(FlowchartSymbols.terminal, -60, 190, 120, 46, end, "cyan"),
        arrow([0, -164], [0, -125]),
        arrow([0, -71], [0, -35]),
        arrow([0, 49], [0, 95]),
        arrow([0, 149], [0, 190]),
        arrow([72, 7], [145, 7]),
        arrow([217, 34], [217, 67], "#697586", ArrowLineMarkerType.none),
        arrow([217, 67], [82, 67], "#697586", ArrowLineMarkerType.none),
        arrow([82, 67], [82, -98]),
      ];
    },
  },
  {
    id: "task-tracking",
    categories: ["hot", "teamwork", "product"],
    zh: "项目任务跟进",
    en: "Project task tracking",
    sourceId: 18061240,
    docletId: 48175511,
    descriptionZh: "用于呈现多个项目任务完成情况。",
    descriptionEn: "Present the completion status of multiple project tasks.",
    usageCount: 26585,
    cover: "https://mdn.alipayobjects.com/huamei_0prmtq/afts/img/A*k7jET7KorigAAAAAAAAAAAAADvuFAQ/original",
    build: (locale) => {
      const rows = [
        [choose(locale, "需求确认", "Requirements"), "30%", "blue"],
        [choose(locale, "交互设计", "Interaction"), "60%", "purple"],
        [choose(locale, "开发联调", "Development"), "80%", "orange"],
        [choose(locale, "发布验收", "Release"), "100%", "green"],
      ] as const;
      const elements: PlaitElement[] = [
        label(-230, -150, 220, choose(locale, "项目任务跟进", "Project task tracking")),
      ];
      rows.forEach(([name, progress, color], index) => {
        const y = -95 + index * 72;
        elements.push(
          box(BasicShapes.roundRectangle, -230, y, 138, 42, name, "gray", "12"),
          box(BasicShapes.roundRectangle, -58, y + 7, 250, 28, progress, color, "11"),
        );
      });
      return elements;
    },
  },
  {
    id: "product-milestones",
    categories: ["hot", "product"],
    zh: "产品里程碑",
    en: "Product milestones",
    sourceId: 18061212,
    docletId: 48173073,
    descriptionZh: "用于跟踪产品或项目开发的关键里程碑。",
    descriptionEn: "Track key milestones in product or project development.",
    usageCount: 23293,
    cover: "https://mdn.alipayobjects.com/huamei_0prmtq/afts/img/A*KA8xSYmgiYgAAAAAAAAAAAAADvuFAQ/original",
    build: (locale) => {
      const names = [
        choose(locale, "需求调研", "Research"),
        choose(locale, "方案设计", "Design"),
        choose(locale, "灰度发布", "Beta"),
        choose(locale, "正式发布", "Launch"),
      ];
      const colors: (keyof typeof palette)[] = ["blue", "purple", "orange", "green"];
      const elements: PlaitElement[] = [
        label(-250, -120, 200, choose(locale, "产品里程碑", "Product milestones")),
        arrow([-210, 10], [245, 10], "#94A3B8", ArrowLineMarkerType.arrow),
      ];
      names.forEach((name, index) => {
        const x = -230 + index * 145;
        elements.push(
          box(BasicShapes.ellipse, x, -12, 44, 44, "", colors[index]),
          box(BasicShapes.roundRectangle, x - 35, 62, 114, 48, name, colors[index], "12"),
          arrow([x + 22, 32], [x + 22, 62], "#94A3B8", ArrowLineMarkerType.none),
        );
      });
      return elements;
    },
  },
  {
    id: "cross-team-flow",
    categories: ["hot", "teamwork"],
    zh: "跨部门流程图",
    en: "Cross-team workflow",
    sourceId: 17070453,
    docletId: 36789848,
    descriptionZh: "显示一个进程在各部门之间的流程以及一个进程是如何影响公司中不同职能部门的。",
    descriptionEn: "Show how a process moves between departments and affects different functions.",
    usageCount: 42218,
    cover: "https://gw.alipayobjects.com/mdn/prod_resou/afts/img/A*j78FQZ9fJV0AAAAAAAAAAAAAARQnAQ",
    build: (locale) => {
      const departments = [
        choose(locale, "产品", "Product"),
        choose(locale, "设计", "Design"),
        choose(locale, "研发", "Engineering"),
      ];
      const elements: PlaitElement[] = [];
      departments.forEach((department, index) => {
        const y = -190 + index * 130;
        elements.push(
          box(BasicShapes.rectangle, -270, y, 540, 112, "", index === 0 ? "blue" : index === 1 ? "purple" : "green"),
          label(-255, y + 8, 100, department),
        );
      });
      elements.push(
        box(BasicShapes.roundRectangle, -165, -162, 120, 44, choose(locale, "提出需求", "Request"), "blue", "12"),
        box(BasicShapes.roundRectangle, 55, -162, 120, 44, choose(locale, "确认范围", "Scope"), "blue", "12"),
        box(BasicShapes.roundRectangle, -55, -32, 120, 44, choose(locale, "输出设计", "Design"), "purple", "12"),
        box(BasicShapes.diamond, 120, -42, 105, 64, choose(locale, "评审", "Review"), "yellow", "12"),
        box(BasicShapes.roundRectangle, -165, 98, 120, 44, choose(locale, "开发联调", "Develop"), "green", "12"),
        box(BasicShapes.roundRectangle, 55, 98, 120, 44, choose(locale, "上线验收", "Launch"), "green", "12"),
        arrow([-45, -140], [55, -140]),
        arrow([115, -118], [5, -32]),
        arrow([65, -10], [120, -10]),
        arrow([172, 22], [-105, 98]),
        arrow([-45, 120], [55, 120]),
      );
      return elements;
    },
  },
  {
    id: "project-process",
    categories: ["hot", "teamwork", "thinking"],
    zh: "项目流程图",
    en: "Project workflow",
    sourceId: 17054235,
    docletId: 35107108,
    descriptionZh: "清晰展示项目计划中各个环节的流程，主要用于项目策划和监督进度。",
    descriptionEn: "Clearly show each step in a project plan for planning and progress tracking.",
    usageCount: 34236,
    cover: "https://gw.alipayobjects.com/mdn/prod_resou/afts/img/A*TyuhTr-nCsUAAAAAAAAAAAAAARQnAQ",
    build: (locale) => {
      const center = box(
        BasicShapes.ellipse,
        -62,
        -38,
        124,
        76,
        choose(locale, "项目目标", "Project goal"),
        "blue",
      );
      const steps = [
        [-250, -150, choose(locale, "需求", "Needs"), "indigo"],
        [120, -150, choose(locale, "资源", "Resources"), "cyan"],
        [-250, 100, choose(locale, "计划", "Plan"), "yellow"],
        [120, 100, choose(locale, "交付", "Delivery"), "green"],
      ] as const;
      const elements: PlaitElement[] = [center];
      steps.forEach(([x, y, text, color]) => {
        elements.push(box(BasicShapes.roundRectangle, x, y, 130, 54, text, color));
        elements.push(
          arrow(
            [x < 0 ? x + 130 : x, y < 0 ? y + 54 : y],
            [x < 0 ? -62 : 62, y < 0 ? -22 : 22],
            "#7A8699",
          ),
        );
      });
      return elements;
    },
  },
  {
    id: "org-chart",
    categories: ["hot", "teamwork"],
    zh: "组织架构图",
    en: "Organization chart",
    sourceId: 17054190,
    docletId: 35104049,
    descriptionZh: "用于表达组织结构中的隶属、管理、支持关系。",
    descriptionEn: "Express reporting, management, and support relationships in an organization.",
    usageCount: 32439,
    cover: "https://gw.alipayobjects.com/mdn/prod_resou/afts/img/A*yztHTIgZtggAAAAAAAAAAAAAARQnAQ",
    build: (locale) => {
      const root = choose(locale, "项目负责人", "Project lead");
      const teams = [
        choose(locale, "产品团队", "Product"),
        choose(locale, "技术团队", "Engineering"),
        choose(locale, "设计团队", "Design"),
      ];
      const colors: (keyof typeof palette)[] = ["blue", "green", "purple"];
      const elements: PlaitElement[] = [
        box(BasicShapes.roundRectangle, -85, -180, 170, 54, root, "gray"),
      ];
      teams.forEach((team, index) => {
        const x = -250 + index * 185;
        elements.push(
          box(BasicShapes.roundRectangle, x, -40, 130, 50, team, colors[index]),
          box(BasicShapes.roundRectangle, x, 72, 130, 44, choose(locale, "核心成员", "Core members"), colors[index], "11"),
          arrow([0, -126], [x + 65, -40]),
          arrow([x + 65, 10], [x + 65, 72]),
        );
      });
      return elements;
    },
  },
  {
    id: "tech-architecture",
    categories: ["technology"],
    zh: "技术架构图",
    en: "Technical architecture",
    build: (locale) => {
      const layers = [
        [choose(locale, "访问层", "Client"), ["Web", "Mobile", "API"], "blue"],
        [choose(locale, "服务层", "Services"), [choose(locale, "用户服务", "User"), choose(locale, "业务服务", "Business"), choose(locale, "消息服务", "Message")], "purple"],
        [choose(locale, "数据层", "Data"), ["MySQL", "Redis", "Object Storage"], "green"],
      ] as const;
      const elements: PlaitElement[] = [];
      layers.forEach(([layer, items, color], row) => {
        const y = -170 + row * 135;
        elements.push(label(-280, y + 20, 90, layer));
        items.forEach((item, column) => {
          const x = -155 + column * 150;
          elements.push(
            box(BasicShapes.roundRectangle, x, y, 120, 54, item, color, "11"),
          );
          if (row < layers.length - 1) {
            elements.push(
              arrow([x + 60, y + 54], [x + 60, y + 81], "#8993A4"),
            );
          }
        });
      });
      return elements;
    },
  },
  {
    id: "idea-map",
    categories: ["thinking", "product"],
    zh: "产品创意图",
    en: "Product idea map",
    build: (locale) => {
      const center = choose(locale, "产品创意", "Product idea");
      const branches = [
        [-245, -140, choose(locale, "用户", "Users"), "blue"],
        [110, -140, choose(locale, "场景", "Scenarios"), "purple"],
        [-245, 100, choose(locale, "价值", "Value"), "green"],
        [110, 100, choose(locale, "风险", "Risks"), "orange"],
      ] as const;
      const elements: PlaitElement[] = [
        box(BasicShapes.ellipse, -72, -42, 144, 84, center, "yellow"),
      ];
      branches.forEach(([x, y, text, color]) => {
        elements.push(
          box(BasicShapes.roundRectangle, x, y, 135, 54, text, color),
          arrow(
            [x < 0 ? x + 135 : x, y < 0 ? y + 54 : y],
            [x < 0 ? -62 : 62, y < 0 ? -25 : 25],
            "#8993A4",
            ArrowLineMarkerType.none,
          ),
        );
      });
      return elements;
    },
  },
  // Extra local fixtures keep the library scroll state easy to exercise while
  // the material service is not connected to the host application yet.
  {
    id: "quarterly-roadmap",
    categories: ["product", "teamwork"],
    zh: "季度路线图",
    en: "Quarterly roadmap",
    build: (locale) => {
      const quarters = [
        choose(locale, "Q1 规划", "Q1 Plan"),
        choose(locale, "Q2 设计", "Q2 Design"),
        choose(locale, "Q3 开发", "Q3 Build"),
        choose(locale, "Q4 发布", "Q4 Launch"),
      ];
      const elements: PlaitElement[] = [];
      quarters.forEach((text, index) => {
        const x = -300 + index * 200;
        elements.push(box(BasicShapes.roundRectangle, x, -32, 150, 64, text, index % 2 ? "purple" : "blue"));
        if (index < quarters.length - 1) {
          elements.push(arrow([x + 150, 0], [x + 200, 0]));
        }
      });
      return elements;
    },
  },
  {
    id: "user-experience-map",
    categories: ["product", "thinking"],
    zh: "用户体验地图",
    en: "User experience map",
    build: (locale) => {
      const center = choose(locale, "用户目标", "User goal");
      const stages = [
        choose(locale, "认知", "Discover"),
        choose(locale, "使用", "Use"),
        choose(locale, "复购", "Return"),
      ];
      const elements: PlaitElement[] = [
        box(BasicShapes.ellipse, -86, -34, 172, 68, center, "yellow"),
      ];
      stages.forEach((text, index) => {
        const x = -280 + index * 190;
        const y = 100;
        elements.push(box(BasicShapes.roundRectangle, x, y, 140, 52, text, ["blue", "purple", "green"][index] as keyof typeof palette));
        elements.push(arrow([0, 34], [x + 70, y]));
      });
      return elements;
    },
  },
  {
    id: "okr-breakdown",
    categories: ["teamwork", "thinking"],
    zh: "OKR 拆解图",
    en: "OKR breakdown",
    build: (locale) => {
      const root = choose(locale, "年度目标", "Annual objective");
      const objectives = [
        choose(locale, "提升体验", "Improve experience"),
        choose(locale, "扩大增长", "Drive growth"),
        choose(locale, "稳定交付", "Ship reliably"),
      ];
      const elements: PlaitElement[] = [box(BasicShapes.roundRectangle, -90, -170, 180, 56, root, "indigo")];
      objectives.forEach((text, index) => {
        const x = -280 + index * 190;
        elements.push(
          box(BasicShapes.roundRectangle, x, -20, 150, 54, text, "blue"),
          arrow([0, -114], [x + 75, -20]),
          box(BasicShapes.roundRectangle, x, 82, 150, 44, choose(locale, "关键结果", "Key result"), "gray", "11"),
          arrow([x + 75, 34], [x + 75, 82]),
        );
      });
      return elements;
    },
  },
  {
    id: "risk-matrix",
    categories: ["product", "teamwork"],
    zh: "风险矩阵",
    en: "Risk matrix",
    build: (locale) => {
      const labels = [
        choose(locale, "高影响 / 高概率", "High / likely"),
        choose(locale, "高影响 / 低概率", "High / unlikely"),
        choose(locale, "低影响 / 高概率", "Low / likely"),
        choose(locale, "低影响 / 低概率", "Low / unlikely"),
      ];
      const colors: (keyof typeof palette)[] = ["orange", "yellow", "purple", "green"];
      return labels.flatMap((text, index) => {
        const x = index % 2 === 0 ? -170 : 20;
        const y = index < 2 ? -100 : 10;
        return [box(BasicShapes.rectangle, x, y, 150, 82, text, colors[index])];
      });
    },
  },
  {
    id: "service-topology",
    categories: ["technology"],
    zh: "服务拓扑图",
    en: "Service topology",
    build: (locale) => {
      const client = choose(locale, "客户端", "Client");
      const services = ["API", choose(locale, "用户服务", "User"), choose(locale, "订单服务", "Order")];
      const elements: PlaitElement[] = [box(BasicShapes.roundRectangle, -70, -170, 140, 52, client, "blue")];
      services.forEach((text, index) => {
        const x = -260 + index * 190;
        elements.push(box(BasicShapes.roundRectangle, x, -30, 140, 52, text, "purple"), arrow([0, -118], [x + 70, -30]));
      });
      elements.push(box(FlowchartSymbols.database, -70, 100, 140, 58, choose(locale, "数据库", "Database"), "green"));
      services.forEach((_, index) => {
        const x = -260 + index * 190;
        elements.push(arrow([x + 70, 22], [0, 100]));
      });
      return elements;
    },
  },
  {
    id: "release-checklist",
    categories: ["technology", "teamwork"],
    zh: "发布检查清单",
    en: "Release checklist",
    build: (locale) => {
      const steps = [
        choose(locale, "代码冻结", "Code freeze"),
        choose(locale, "自动化测试", "Automated tests"),
        choose(locale, "灰度发布", "Canary release"),
        choose(locale, "全量上线", "Full release"),
      ];
      return steps.flatMap((text, index) => {
        const x = -300 + index * 200;
        return [
          box(FlowchartSymbols.process, x, -30, 150, 60, text, index === 3 ? "green" : "gray"),
          ...(index < steps.length - 1 ? [arrow([x + 150, 0], [x + 200, 0])] : []),
        ];
      });
    },
  },
];
