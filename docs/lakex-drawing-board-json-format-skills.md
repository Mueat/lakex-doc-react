# Lakex AI 画板 JSON 格式规范

本文档用于指导 AI 把自然语言描述转换为 Lakex 画板可导入的 JSON。普通图表使用稳定、受控的 AI 中间格式；原生思维导图允许使用受校验的 `plaitValue` 树结构。应用会校验响应，再转换或挂载为原生画板元素。

<!-- AI_RUNTIME_SPEC_START -->

## AI 运行时精简规范

只输出一个合法 JSON 对象，不要 Markdown、代码围栏、解释或注释。

根结构：

`{"version":1,"title":"可选标题","nodes":[],"edges":[]}`

节点结构：

`{"id":"唯一ID","shape":"图形","x":80,"y":80,"width":180,"height":64,"text":"文字","style":{"fill":"#E8F1FF","strokeColor":"#5B8FF9","strokeWidth":1.5,"strokeStyle":"solid","fontSize":14,"textColor":"#273142"}}`

连线结构：

`{"id":"唯一ID","source":"节点ID","target":"节点ID","sourceAnchor":"bottom","targetAnchor":"top","label":"可选文字","style":{"lineType":"elbow","strokeColor":"#697586","strokeWidth":1.5,"strokeStyle":"solid","endMarker":"arrow"}}`

允许的 `shape`：

`rectangle,roundRectangle,ellipse,diamond,triangle,parallelogram,trapezoid,pentagon,hexagon,octagon,cloud,text,process,terminal,decision,data,connector,manualInput,preparation,predefinedProcess,document,multiDocument,database,internalStorage,delay,display,offPage,noteSquare,actor,useCase,component,container,note,package,simpleClass,class,interface,object,componentBox,activityClass,branchMerge`

约束：

- `version` 必须是数字 `1`，不能是字符串。
- ID 只能包含字母、数字、下划线、短横线；全部唯一。
- 最多 80 个节点、120 条连线。
- 节点必须使用 `shape` 和 `text` 字段，不能改成 `type`、`label`。
- 坐标范围 `-5000..5000`；宽 `40..1200`；高 `24..800`。
- 颜色只能是 `#RRGGBB`，填充可为 `transparent`。
- 锚点只能是 `top,right,bottom,left`。
- 线型只能是 `straight,elbow,curve`，箭头只能是 `arrow,none`。
- 描边样式 `strokeStyle` 只能是 `solid,dashed,dotted`，默认 `solid`。
- 每条连线必须引用已存在且不同的 source/target 节点。
- 图形不能重叠；同层节点对齐，间距至少 32；流程图优先从上到下。
- 连线不得穿过任何非起止节点，平行线段至少间隔 24px；分支节点周围预留至少 48px 连线通道。
- `decision` 的“是/否”出口必须使用不同 `sourceAnchor`：纵向主流程通常“是”使用 `bottom`，“否”使用 `left` 或 `right`，并把否分支节点放在对应侧；禁止两条分支共用同一出口后重叠。
- 锚点必须朝向另一个节点：上方来源进入目标用 `targetAnchor:top`，下方来源用 `bottom`，左侧来源用 `left`，右侧来源用 `right`。如果来源中心的 x 落在目标宽度内，禁止从目标 `left/right` 进入；如果来源中心的 y 落在目标高度内，禁止从目标 `top/bottom` 进入。
- 多条连线进入同一节点且来源方向不同时，必须使用不同 `targetAnchor`；例如上方来源进入 `top`、左侧来源进入 `left`，不能为了对齐而让连线横穿目标图形。
- 普通节点推荐 180×64，判断节点推荐 180×110。
- 当前 AI 响应中的普通图表使用 `nodes + edges` 表达；思维导图也可以使用这一中间格式，中心主题使用 `roundRectangle`，分支使用 `rectangle`，连线使用 `curve`、`endMarker:none`。如果需要保留原生思维导图层级，也可以直接返回第 7 节定义的 `{ "plaitValue": [...] }`，应用会提取、校验并规范化后直接挂载到画板，不会再转换成普通几何节点。
- 原生思维导图响应是唯一允许的替代根结构：`{ "plaitValue": [{ "type":"mind", "data":{...}, "children":[...] }] }`。此时不要同时输出 `version`、`nodes` 或 `edges`，也不要把 `mind_child` 放到顶层。

<!-- AI_RUNTIME_SPEC_END -->

## 1. 输出要求

1. 只输出一个合法 JSON 对象，不要输出 Markdown 代码块、解释、注释或前后缀。
2. 根对象必须包含 `version`、`nodes`、`edges`。
3. `version` 固定为 `1`。
4. 所有 `id` 在同一份 JSON 内唯一，只能包含字母、数字、下划线和短横线。
5. 最多 80 个节点、120 条连线。不要生成孤立且没有信息的装饰元素。
6. 坐标单位为画板逻辑像素。建议把图形放在 `x=80..1400`、`y=80..900` 范围内。
7. 图形之间至少保留 32px 间距，避免重叠；同层节点对齐，布局方向保持一致。
8. 节点文本应简洁。中文通常不超过 20 个字，英文通常不超过 60 个字符。
9. 不允许输出 HTML、脚本、图片 URL、data URL、事件、函数或 Drawnix/Plait 私有字段。

## 2. 根对象

```json
{
  "version": 1,
  "title": "可选的图表标题",
  "nodes": [],
  "edges": []
}
```

| 字段      | 类型   | 必填 | 说明                               |
| --------- | ------ | ---- | ---------------------------------- |
| `version` | number | 是   | 固定为 `1`                         |
| `title`   | string | 否   | 图表标题，应用不会把它自动插入画布 |
| `nodes`   | array  | 是   | 节点列表                           |
| `edges`   | array  | 是   | 连线列表                           |

## 3. 节点

```json
{
  "id": "node_start",
  "shape": "terminal",
  "x": 120,
  "y": 120,
  "width": 160,
  "height": 64,
  "text": "开始",
  "style": {
    "fill": "#E8F1FF",
    "strokeColor": "#5B8FF9",
    "strokeWidth": 1.5,
    "strokeStyle": "solid",
    "fontSize": 14,
    "textColor": "#273142"
  }
}
```

### 3.1 节点字段

| 字段     | 类型   | 必填 | 约束                         |
| -------- | ------ | ---- | ---------------------------- |
| `id`     | string | 是   | 唯一，1–64 字符              |
| `shape`  | string | 是   | 必须来自第 3.2 节            |
| `x`      | number | 是   | 左上角 X，范围 `-5000..5000` |
| `y`      | number | 是   | 左上角 Y，范围 `-5000..5000` |
| `width`  | number | 是   | 范围 `40..1200`              |
| `height` | number | 是   | 范围 `24..800`               |
| `text`   | string | 否   | 最多 500 字符                |
| `style`  | object | 否   | 只允许第 3.3 节字段          |

### 3.2 支持的图形

基础图形：

- `rectangle`：矩形
- `roundRectangle`：圆角矩形
- `ellipse`：椭圆
- `diamond`：菱形
- `triangle`：三角形
- `parallelogram`：平行四边形
- `trapezoid`：梯形
- `pentagon`：五边形
- `hexagon`：六边形
- `octagon`：八边形
- `cloud`：云形
- `text`：无边框文本

流程图：

- `process`：处理步骤
- `terminal`：开始或结束
- `decision`：条件判断
- `data`：数据输入或输出
- `connector`：页内连接
- `manualInput`：手动输入
- `preparation`：准备
- `predefinedProcess`：子流程
- `document`：文档
- `multiDocument`：多文档
- `database`：数据库
- `internalStorage`：内部存储
- `delay`：延迟
- `display`：显示
- `offPage`：页外连接
- `noteSquare`：注释

UML / Smart：

- `actor`：角色
- `useCase`：用例
- `component`：组件
- `container`：容器
- `note`：便签
- `package`：包
- `simpleClass`：简单类
- `class`：类
- `interface`：接口
- `object`：对象
- `componentBox`：组件框
- `activityClass`：活动
- `branchMerge`：分支或合并

### 3.3 节点样式

| 字段          | 类型   | 约束                              |
| ------------- | ------ | --------------------------------- |
| `fill`        | string | `#RRGGBB`；透明使用 `transparent` |
| `strokeColor` | string | `#RRGGBB`                         |
| `strokeWidth` | number | `0..8`                            |
| `strokeStyle` | string | `solid`、`dashed`、`dotted`       |
| `fontSize`    | number | `10..72`                          |
| `textColor`   | string | `#RRGGBB`                         |

推荐色板：

- 蓝：填充 `#E8F1FF`，描边 `#5B8FF9`
- 绿：填充 `#EAF8F0`，描边 `#5BB98C`
- 黄：填充 `#FFF6D9`，描边 `#D9A441`
- 橙：填充 `#FFF0E6`，描边 `#E58B50`
- 紫：填充 `#F3EBFF`，描边 `#9B71D1`
- 灰：填充 `#F3F4F6`，描边 `#8B95A5`
- 默认正文色：`#273142`

颜色应表达语义并保持一致。普通流程建议使用同一主色，仅给判断、异常或关键节点使用强调色。

## 4. 连线

```json
{
  "id": "edge_start_to_check",
  "source": "node_start",
  "target": "node_check",
  "sourceAnchor": "bottom",
  "targetAnchor": "top",
  "label": "",
  "style": {
    "lineType": "elbow",
    "strokeColor": "#697586",
    "strokeWidth": 1.5,
    "strokeStyle": "solid",
    "endMarker": "arrow"
  }
}
```

### 4.1 连线字段

| 字段           | 类型   | 必填 | 约束                                        |
| -------------- | ------ | ---- | ------------------------------------------- |
| `id`           | string | 是   | 唯一，1–64 字符                             |
| `source`       | string | 是   | 必须引用存在的节点 ID                       |
| `target`       | string | 是   | 必须引用存在的节点 ID，不能与 `source` 相同 |
| `sourceAnchor` | string | 否   | `top`、`right`、`bottom`、`left`，默认自动  |
| `targetAnchor` | string | 否   | `top`、`right`、`bottom`、`left`，默认自动  |
| `label`        | string | 否   | 最多 120 字符，例如“是”“否”                 |
| `style`        | object | 否   | 见第 4.2 节                                 |

### 4.2 连线样式

| 字段          | 类型   | 约束                         |
| ------------- | ------ | ---------------------------- |
| `lineType`    | string | `straight`、`elbow`、`curve` |
| `strokeColor` | string | `#RRGGBB`                    |
| `strokeWidth` | number | `0.5..8`                     |
| `strokeStyle` | string | `solid`、`dashed`、`dotted`  |
| `endMarker`   | string | `arrow` 或 `none`            |

默认使用 `elbow` 和 `arrow`。流程方向应通过锚点表达，例如纵向流程使用 `bottom -> top`，横向流程使用 `right -> left`。

### 4.3 防止连线与箭头重叠

- 连线只能在起点和终点处接触节点边界，任何中间线段都不能穿过其他节点。
- 同一节点有多条出边时，优先分配不同的 `sourceAnchor`；同一节点有多条入边时，优先分配不同的 `targetAnchor`。
- 纵向流程的普通步骤使用 `bottom -> top`。判断节点的主分支继续向下，使用 `bottom -> top`；另一分支向左或向右展开，使用 `left -> right` 或 `right -> left`。
- 判断条件的两个出口不得同时使用 `bottom`，否则箭头和“是/否”标签会重叠。默认约定：“是”沿主流程向下，“否”向距离其他节点更远的一侧展开。
- 分支目标节点必须位于出口方向：从 `left` 离开的目标放在判断节点左侧，从 `right` 离开的目标放在右侧，从 `bottom` 离开的目标放在下方。
- `targetAnchor` 必须位于面向来源节点的一侧：来源在上方时连接 `top`，来源在下方时连接 `bottom`，来源在左侧时连接 `left`，来源在右侧时连接 `right`。不得选择需要让最后一段连线穿过目标内部才能到达的锚点。
- 特别注意“斜上方来源”：若来源中心的 x 仍落在目标的 `[x, x + width]` 范围内，应视为上方来源并连接 `top`，不能连接 `left/right`；“斜侧方来源”按相同原则检查 y 投影。
- 同一目标有多条入边时，根据各来源位置分配不同入口。例如失败节点同时接收上方注册流程和左侧校验流程时，应分别使用 `top` 和 `left`，不能共用入口或让其中一条线穿过失败节点。
- 两条平行连线的可见线段至少间隔 24px；连线与非起止节点边缘至少间隔 24px；判断节点与分支目标之间建议保留 80px 以上通道。
- 回流线放在流程外侧，不能逆向穿过主流程节点。回流目标应使用侧边锚点，例如 `top -> left`，不要与主流程的 `bottom -> top` 共用路径。
- “是”“否”等标签必须属于不同连线并跟随各自出口；标签附近至少保留 16px 空白，不要放在两条线的交叉点或重合线段上。

纵向判断分支推荐结构：

```json
[
  {
    "id": "edge_yes",
    "source": "decision_stock",
    "target": "deduct_stock",
    "sourceAnchor": "bottom",
    "targetAnchor": "top",
    "label": "是",
    "style": { "lineType": "elbow", "endMarker": "arrow" }
  },
  {
    "id": "edge_no",
    "source": "decision_stock",
    "target": "sold_out",
    "sourceAnchor": "right",
    "targetAnchor": "left",
    "label": "否",
    "style": { "lineType": "elbow", "endMarker": "arrow" }
  }
]
```

其中 `deduct_stock` 必须位于 `decision_stock` 下方，`sold_out` 必须位于其右侧。若右侧已有节点，则整体镜像到左侧，并改用 `left -> right`。

## 5. 布局规则

- 先确定主方向：流程图优先从上到下，架构图优先从左到右。
- 同一层级使用相同的 `width`、`height` 和对齐线。
- 一般节点建议 `width=160..220`、`height=56..88`。
- 判断节点建议 `width=150..190`、`height=90..120`。
- UML 类图建议 `width=200..280`、`height=120..220`。
- 横向节点中心间距建议 240px，纵向节点中心间距建议 140px。
- 分支汇聚前后留出额外空间，判断分支建议横向中心间距至少 280px，避免连线穿过节点。
- 先放置节点，再按节点位置分配锚点；若连线会穿过节点，应移动分支节点或切换到另一侧，而不是继续输出重叠连线。
- 连线只连接语义相关节点，不要用连线绘制装饰边框。

### 5.1 AI 中间格式思维导图

默认 AI 中间格式使用 `nodes + edges`，思维导图不新增私有根节点类型：

- 中心主题使用 `roundRectangle`，尺寸建议 `180×72`。
- 一级、二级分支使用 `rectangle` 或 `roundRectangle`，尺寸建议 `140..180 × 48..64`。
- 中心主题放在画布中心；一级分支在左右两侧分布，子分支沿父分支方向继续展开。
- 每个节点必须有不同且可用的 `x/y` 坐标；中心与一级分支至少间隔 220px，同一层分支至少间隔 96px。禁止所有节点复用中心节点坐标。
- 每个非根节点只保留一条来自父节点的连线，不要形成环。
- 思维导图连线推荐 `lineType:"curve"`、`endMarker:"none"`；主分支可使用更粗的 `strokeWidth`。
- 同一分支的节点与连线使用相同的 `strokeColor`，不同一级分支可以使用不同色系。
- 横向连接使用 `right -> left` 或 `left -> right`，不要让连线穿过其他节点。

当前 AI 生成接口默认接收本规范的 `nodes + edges`，应用层会通过
`convertAIBoardDocument` 转换为画板元素。对于需要保留原生思维导图树结构的请求，也可以返回 `{ "plaitValue": [...] }`；应用会先校验并规范化 `mind` / `mind_child`，再通过原生 Mind 插入流程直接挂载，不能把它们当作普通几何节点处理。

示例：

```json
{
  "version": 1,
  "title": "产品规划",
  "nodes": [
    {
      "id": "root",
      "shape": "roundRectangle",
      "x": 500,
      "y": 320,
      "width": 180,
      "height": 72,
      "text": "产品规划"
    },
    {
      "id": "requirements",
      "shape": "roundRectangle",
      "x": 220,
      "y": 210,
      "width": 160,
      "height": 56,
      "text": "需求分析"
    },
    {
      "id": "delivery",
      "shape": "roundRectangle",
      "x": 800,
      "y": 430,
      "width": 160,
      "height": 56,
      "text": "发布计划"
    }
  ],
  "edges": [
    {
      "id": "root_requirements",
      "source": "root",
      "target": "requirements",
      "sourceAnchor": "left",
      "targetAnchor": "right",
      "style": {
        "lineType": "curve",
        "strokeColor": "#5B8FF9",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "endMarker": "none"
      }
    },
    {
      "id": "root_delivery",
      "source": "root",
      "target": "delivery",
      "sourceAnchor": "right",
      "targetAnchor": "left",
      "style": {
        "lineType": "curve",
        "strokeColor": "#5BB98C",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "endMarker": "none"
      }
    }
  ]
}
```

## 6. 普通流程图中间格式示例

用户描述：“生成一个用户提交工单的流程图，审核通过后进入处理中，不通过则退回修改，最后完成。”

模型在使用 `nodes + edges` 模式时应只返回以下 JSON；这段示例仍适用于流程图、UML 和普通画板，不适用于原生思维导图 `plaitValue` 模式：

```json
{
  "version": 1,
  "title": "工单处理流程",
  "nodes": [
    {
      "id": "start",
      "shape": "terminal",
      "x": 360,
      "y": 80,
      "width": 160,
      "height": 56,
      "text": "开始",
      "style": {
        "fill": "#EAF8F0",
        "strokeColor": "#5BB98C",
        "fontSize": 14,
        "textColor": "#273142"
      }
    },
    {
      "id": "submit",
      "shape": "process",
      "x": 350,
      "y": 190,
      "width": 180,
      "height": 64,
      "text": "提交工单"
    },
    {
      "id": "review",
      "shape": "decision",
      "x": 350,
      "y": 310,
      "width": 180,
      "height": 110,
      "text": "审核通过？",
      "style": {
        "fill": "#FFF6D9",
        "strokeColor": "#D9A441"
      }
    },
    {
      "id": "revise",
      "shape": "process",
      "x": 80,
      "y": 330,
      "width": 180,
      "height": 64,
      "text": "退回修改"
    },
    {
      "id": "processing",
      "shape": "process",
      "x": 350,
      "y": 500,
      "width": 180,
      "height": 64,
      "text": "处理中"
    },
    {
      "id": "done",
      "shape": "terminal",
      "x": 360,
      "y": 630,
      "width": 160,
      "height": 56,
      "text": "完成",
      "style": {
        "fill": "#EAF8F0",
        "strokeColor": "#5BB98C"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "submit",
      "sourceAnchor": "bottom",
      "targetAnchor": "top"
    },
    {
      "id": "e2",
      "source": "submit",
      "target": "review",
      "sourceAnchor": "bottom",
      "targetAnchor": "top"
    },
    {
      "id": "e3",
      "source": "review",
      "target": "processing",
      "sourceAnchor": "bottom",
      "targetAnchor": "top",
      "label": "是"
    },
    {
      "id": "e4",
      "source": "review",
      "target": "revise",
      "sourceAnchor": "left",
      "targetAnchor": "right",
      "label": "否"
    },
    {
      "id": "e5",
      "source": "revise",
      "target": "submit",
      "sourceAnchor": "top",
      "targetAnchor": "left"
    },
    {
      "id": "e6",
      "source": "processing",
      "target": "done",
      "sourceAnchor": "bottom",
      "targetAnchor": "top"
    }
  ]
}
```

注意：实际响应不能包含上面的 Markdown 代码围栏，只包含 JSON 对象。若生成原生思维导图，则应改用第 7 节的 `{ "plaitValue": [...] }` 根结构。

## 7. 原生 `plaitValue` 持久化格式

`plaitValue` 是画板卡片保存到 Lakex 文档中的原生 Plait 元素数组。它与上面的 AI 中间格式不同：AI 接口使用 `version + nodes + edges`，卡片值使用 `plaitValue`。`writeText` 会把它包装为如下 JSON：

```json
{
  "type": "drawnix",
  "version": 1,
  "source": "lakex",
  "elements": [],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

### 7.1 原生思维导图结构

思维导图不是由独立的 `edges` 元素组成，而是由一棵嵌套树组成：

- 根节点的 `type` 是 `mind`；兼容旧数据时也可能看到 `mindmap`。
- 子孙节点的 `type` 是 `mind_child`，关系由父节点的 `children` 表达。
- 每个节点都必须有唯一 `id`、`data` 和 `children`；叶子节点使用空数组 `children: []`。
- `data.topic` 是 Slate 段落，不是普通字符串，结构固定为 `{ "children": [{ "text": "..." }], "type": "paragraph" }`。
- 根节点通常有 `layout` 和单点 `points`。`points` 是根节点左上角逻辑坐标，格式为 `[[x, y]]`，不是普通图形的 `[[left, top], [right, bottom]]`。
- `layout` 支持 `right`、`left`、`standard`、`upward`、`downward`，以及 `right-bottom-indented`、`right-top-indented`、`left-top-indented`、`left-bottom-indented`。
- `rightNodeCount` 用于 `standard` 布局区分根节点左右分支；没有左右分支时可以省略。不要把它写到子节点上。
- `fill`、`strokeColor`、`strokeWidth`、`strokeStyle`、`shape`、`branchColor`、`branchWidth`、`branchShape`、`isCollapsed`、`manualWidth` 等是可选的原生样式或布局字段，应使用项目已有值，不要创造新的字段名。
- `shape` 的原生思维导图值是 `round-rectangle` 或 `underline`；它与 AI 中间格式的 `roundRectangle` 不是同一个字段值。

最小可用的原生思维导图示例：

```json
{
  "plaitValue": [
    {
      "id": "tnpPz",
      "type": "mind",
      "data": {
        "topic": {
          "children": [{ "text": "中心主题" }],
          "type": "paragraph"
        }
      },
      "children": [
        {
          "id": "ntyaw",
          "type": "mind_child",
          "data": {
            "topic": {
              "children": [{ "text": "1111" }],
              "type": "paragraph"
            }
          },
          "children": []
        },
        {
          "id": "xNewH",
          "type": "mind_child",
          "data": {
            "topic": {
              "children": [{ "text": "22222" }],
              "type": "paragraph"
            }
          },
          "children": []
        }
      ],
      "layout": "right",
      "points": [[0, 0]]
    }
  ]
}
```

带二级分支时，只需继续嵌套 `children`，不要新增 `edges`：

```json
{
  "id": "ntyaw",
  "type": "mind_child",
  "data": {
    "topic": {
      "children": [{ "text": "用户系统" }],
      "type": "paragraph"
    }
  },
  "children": [
    {
      "id": "ntyaw-login",
      "type": "mind_child",
      "data": {
        "topic": {
          "children": [{ "text": "登录" }],
          "type": "paragraph"
        }
      },
      "children": []
    }
  ]
}
```

### 7.2 原生思维导图与 AI 格式的转换边界

保存或恢复卡片时读取 `value.plaitValue`。调用 AI 时，普通图表使用 `nodes + edges`，需要通过 `convertAIBoardDocument` 转换；原生思维导图可以直接使用 `{ "plaitValue": [...] }`，应用只做安全校验、字段规范化和容器提取，然后通过原生 Mind 插入流程挂载。不要把 `mind_child` 拆成普通几何节点或独立 `edges`；必须保持父子嵌套结构，否则会出现 `mind element has not been mounted` 或无法计算节点边界的问题。

两种响应格式的处理边界如下：

| AI 响应根结构 | 适用场景 | 应用处理 |
| --- | --- | --- |
| `{ "version": 1, "nodes": [], "edges": [] }` | 普通画板、流程图、UML，以及使用中间格式表达的思维导图 | 校验后转换为 geometry / arrow-line 元素 |
| `{ "plaitValue": [{ "type": "mind", "children": [...] }] }` | 需要保留原生层级、布局和思维导图行为 | 提取并校验原生树，直接挂载为 `mind` 元素 |

因此，你给出的 `plaitValue` 不需要再转换成 `nodes + edges`；只需要保留完整的 `mind` / `mind_child` 树结构，并作为 AI 响应的根对象返回。
