# Lakex AI 画板 JSON 格式规范

本文档用于指导 AI 把自然语言描述转换为 Lakex 画板可导入的 JSON。它描述的是稳定、受控的 AI 中间格式，不是 Drawnix/Plait 的内部存储格式。应用会校验本格式，再转换为原生画板元素。

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
| `endMarker`   | string | `arrow` 或 `none`            |

默认使用 `elbow` 和 `arrow`。流程方向应通过锚点表达，例如纵向流程使用 `bottom -> top`，横向流程使用 `right -> left`。

## 5. 布局规则

- 先确定主方向：流程图优先从上到下，架构图优先从左到右。
- 同一层级使用相同的 `width`、`height` 和对齐线。
- 一般节点建议 `width=160..220`、`height=56..88`。
- 判断节点建议 `width=150..190`、`height=90..120`。
- UML 类图建议 `width=200..280`、`height=120..220`。
- 横向节点中心间距建议 240px，纵向节点中心间距建议 140px。
- 分支汇聚前后留出额外空间，避免连线穿过节点。
- 连线只连接语义相关节点，不要用连线绘制装饰边框。

## 6. 完整示例

用户描述：“生成一个用户提交工单的流程图，审核通过后进入处理中，不通过则退回修改，最后完成。”

模型应只返回：

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

注意：实际响应不能包含上面的 Markdown 代码围栏，只包含 JSON 对象。
