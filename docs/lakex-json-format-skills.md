# Lakex 编辑器 JSON 数据格式 Skills

## 概述

本文档定义了 Lakex（语雀）编辑器的 JSON 数据格式规范，用于指导 AI 大模型生成和解析编辑器内容。Lakex 编辑器的 `onContentChange` 回调会返回包含多种格式的数据数组，其中 `type: "json"` 的数据即为编辑器的结构化 JSON 表示。

## 核心数据结构

### 文档根结构

```json
{
  "type": "element",
  "id": "u9c14634f",
  "name": "#root",
  "attrs": {},
  "children": [],
  "data":""
}
```

<br />

### 节点类型分类

| 分类      | 节点类型                                        | 描述              |
| ------- | ------------------------------------------- | --------------- |
| **文本块** | `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`     | 段落和标题           |
| **列表**  | `ul`, `ol`, `li`                            | 无序列表和有序列表       |
| **引用**  | `blockquote`                                | 引用块             |
| **代码**  | `codeblock`                                 | 代码块             |
| **表格**  | `table`, `thead`, `tbody`, `tr`, `td`, `th` | 表格              |
| **媒体**  | `image`, `video`, `audio`                   | 图片、视频、音频        |
| **分隔**  | `hr`                                        | 分隔线             |
| **卡片**  | `card`                                      | 自定义卡片（思维导图、图表等） |

### 文本节点格式

文本节点是叶子节点，包含文本内容和格式标记：

```json
{
  "text": "文本内容",
  "bold": true,
  "italic": false,
  "underline": false,
  "strikethrough": false,
  "code": false,
  "link": "https://example.com"
}
```

## 节点类型详细规范

### 1. 段落 (Paragraph)

```json
{
  "type": "p",
  "children": [
    {
      "text": "这是一个普通段落"
    }
  ]
}
```

**带格式的段落：**

```json
{
  "type": "p",
  "children": [
    {
      "text": "这是",
      "bold": true
    },
    {
      "text": "粗体",
      "bold": true
    },
    {
      "text": "和"
    },
    {
      "text": "斜体",
      "italic": true
    },
    {
      "text": "混合的段落"
    }
  ]
}
```

### 2. 标题 (Heading)

```json
{
  "type": "h1",
  "children": [
    { "text": "一级标题" }
  ]
}
```

支持的标题级别：`h1` \~ `h6`

### 3. 无序列表 (Unordered List)

```json
{
  "type": "ul",
  "children": [
    {
      "type": "li",
      "children": [
        { "text": "列表项 1" }
      ]
    },
    {
      "type": "li",
      "children": [
        { "text": "列表项 2" }
      ]
    }
  ]
}
```

### 4. 有序列表 (Ordered List)

```json
{
  "type": "ol",
  "children": [
    {
      "type": "li",
      "children": [
        { "text": "第一项" }
      ]
    },
    {
      "type": "li",
      "children": [
        { "text": "第二项" }
      ]
    }
  ]
}
```

### 5. 嵌套列表

```json
{
  "type": "ul",
  "children": [
    {
      "type": "li",
      "children": [
        { "text": "父级列表项" },
        {
          "type": "ul",
          "children": [
            {
              "type": "li",
              "children": [
                { "text": "子级列表项" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 6. 引用块 (Blockquote)

```json
{
  "type": "blockquote",
  "children": [
    {
      "type": "p",
      "children": [
        { "text": "这是引用内容" }
      ]
    }
  ]
}
```

### 7. 代码块 (Codeblock)

```json
{
  "type": "codeblock",
  "attrs": {
    "language": "javascript",
    "customStyle": false
  },
  "children": [
    {
      "text": "function hello() {\n  console.log('Hello World');\n}"
    }
  ]
}
```

**支持的语言：**

| 语言标识         | 描述         |
| ------------ | ---------- |
| `javascript` | JavaScript |
| `typescript` | TypeScript |
| `python`     | Python     |
| `java`       | Java       |
| `cpp`        | C++        |
| `go`         | Go         |
| `rust`       | Rust       |
| `bash`       | Shell      |
| `json`       | JSON       |
| `html`       | HTML       |
| `css`        | CSS        |
| `markdown`   | Markdown   |

### 8. 表格 (Table)

```json
{
  "type": "table",
  "children": [
    {
      "type": "thead",
      "children": [
        {
          "type": "tr",
          "children": [
            {
              "type": "th",
              "children": [
                { "text": "姓名" }
              ]
            },
            {
              "type": "th",
              "children": [
                { "text": "年龄" }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "tbody",
      "children": [
        {
          "type": "tr",
          "children": [
            {
              "type": "td",
              "children": [
                { "text": "张三" }
              ]
            },
            {
              "type": "td",
              "children": [
                { "text": "25" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 9. 图片 (Image)

```json
{
  "type": "image",
  "attrs": {
    "src": "https://example.com/image.jpg",
    "alt": "图片描述",
    "width": 800,
    "height": 600,
    "layout": "center"
  }
}
```

**图片布局选项：**

| 值        | 描述  |
| -------- | --- |
| `left`   | 左对齐 |
| `center` | 居中  |
| `right`  | 右对齐 |
| `full`   | 全宽  |

### 10. 分隔线 (Horizontal Rule)

```json
{
  "type": "hr"
}
```

### 11. 链接 (Link)

链接是文本节点的属性，而非独立块级节点：

```json
{
  "type": "p",
  "children": [
    {
      "text": "点击这里访问网站",
      "link": "https://example.com"
    }
  ]
}
```

### 12. 文本格式标记

```json
{
  "type": "p",
  "children": [
    {
      "text": "粗体",
      "bold": true
    },
    {
      "text": "斜体",
      "italic": true
    },
    {
      "text": "下划线",
      "underline": true
    },
    {
      "text": "删除线",
      "strikethrough": true
    },
    {
      "text": "行内代码",
      "code": true
    }
  ]
}
```

### 13. 自定义卡片 (Custom Card)

#### 思维导图卡片 (MindMap)

```json
{
  "type": "card",
  "attrs": {
    "value": {
      "$name": "mindmap-card",
      "markdown": "- 中心主题\n  - 分支1\n    - 子分支1\n  - 分支2\n    - 子分支2",
      "cardHeight": 400
    }
  }
}
```

#### 文本绘图卡片 (TextToDiagram)

```json
{
  "type": "card",
  "attrs": {
    "value": {
      "$name": "text-to-diagram",
      "code": "graph TD\n    A[开始] --> B{条件}\n    B -->|是| C[执行]\n    B -->|否| D[结束]",
      "type": "mermaid",
      "cardHeight": 300,
      "showEditor": true,
      "showPreview": true
    }
  }
}
```

**支持的图表类型：**

| 类型          | 描述         |
| ----------- | ---------- |
| `mermaid`   | Mermaid 图表 |
| `flowchart` | 流程图        |
| `plantuml`  | PlantUML   |
| `graphviz`  | Graphviz   |

## 复合文档示例

### 完整文档示例

```json
{
  "type": "doc",
  "children": [
    {
      "type": "h1",
      "children": [
        { "text": "欢迎使用 Lakex 编辑器" }
      ]
    },
    {
      "type": "p",
      "children": [
        {
          "text": "这是一款功能强大的富文本编辑器，支持",
          "bold": true
        },
        { "text": "多种" },
        {
          "text": "格式",
          "italic": true
        },
        { "text": "和" },
        {
          "text": "扩展",
          "underline": true
        },
        { "text": "功能。" }
      ]
    },
    {
      "type": "h2",
      "children": [
        { "text": "主要特性" }
      ]
    },
    {
      "type": "ul",
      "children": [
        {
          "type": "li",
          "children": [
            { "text": "支持 Markdown 语法" }
          ]
        },
        {
          "type": "li",
          "children": [
            { "text": "丰富的文本格式" }
          ]
        },
        {
          "type": "li",
          "children": [
            { "text": "自定义卡片扩展" }
          ]
        }
      ]
    },
    {
      "type": "h2",
      "children": [
        { "text": "代码示例" }
      ]
    },
    {
      "type": "codeblock",
      "attrs": {
        "language": "javascript"
      },
      "children": [
        {
          "text": "import { LakexEditor } from '@dlient/lakex-doc-react';\nimport '@dlient/lakex-doc-react/style.css';\n\nfunction App() {\n  return <LakexEditor />;\n}"
        }
      ]
    },
    {
      "type": "h2",
      "children": [
        { "text": "表格示例" }
      ]
    },
    {
      "type": "table",
      "children": [
        {
          "type": "thead",
          "children": [
            {
              "type": "tr",
              "children": [
                {
                  "type": "th",
                  "children": [
                    { "text": "功能" }
                  ]
                },
                {
                  "type": "th",
                  "children": [
                    { "text": "状态" }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "tbody",
          "children": [
            {
              "type": "tr",
              "children": [
                {
                  "type": "td",
                  "children": [
                    { "text": "文本编辑" }
                  ]
                },
                {
                  "type": "td",
                  "children": [
                    { "text": "已完成" }
                  ]
                }
              ]
            },
            {
              "type": "tr",
              "children": [
                {
                  "type": "td",
                  "children": [
                    { "text": "思维导图" }
                  ]
                },
                {
                  "type": "td",
                  "children": [
                    { "text": "已完成" }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "h2",
      "children": [
        { "text": "引用" }
      ]
    },
    {
      "type": "blockquote",
      "children": [
        {
          "type": "p",
          "children": [
            { "text": "编辑器是知识工作者的生产力工具，好的编辑器应该让用户专注于内容创作。" }
          ]
        }
      ]
    },
    {
      "type": "hr"
    },
    {
      "type": "p",
      "children": [
        {
          "text": "了解更多，请访问",
          "link": "https://example.com"
        }
      ]
    }
  ]
}
```

## JSON 生成规范

### 规则总结

1. **根节点必须是** **`doc`** **类型**：
   ```json
   { "type": "doc", "children": [...] }
   ```
2. **块级节点必须包含** **`children`** **数组**（`hr` 和空 `p` 除外）
3. **文本节点必须包含** **`text`** **属性**：
   ```json
   { "text": "内容" }
   ```
4. **格式标记是布尔值**：
   ```json
   { "text": "粗体", "bold": true }
   ```
5. **自定义卡片必须包含** **`$name`** **属性**：
   ```json
   { "$name": "mindmap-card", ... }
   ```
6. **数组元素后不加逗号**：遵循标准 JSON 规范

### 错误示例

```json
// ❌ 错误：缺少 children
{ "type": "p", "text": "段落内容" }

// ❌ 错误：文本节点缺少 text 属性
{ "type": "p", "children": [{"content": "文本"}] }

// ❌ 错误：格式标记值类型错误
{ "text": "内容", "bold": "true" }

// ❌ 错误：自定义卡片缺少 $name
{ "type": "card", "attrs": { "value": { "markdown": "- 主题" } } }
```

### 正确示例

```json
// ✅ 正确
{ "type": "p", "children": [{ "text": "段落内容" }] }

// ✅ 正确
{ "type": "p", "children": [{ "text": "内容", "bold": true }] }

// ✅ 正确
{ 
  "type": "card", 
  "attrs": { 
    "value": { "$name": "mindmap-card", "markdown": "- 主题" } 
  } 
}
```

## 与 LakexEditor 组件的集成

### 设置初始内容

```tsx
import { LakexEditor } from '@dlient/lakex-doc-react';
import '@dlient/lakex-doc-react/style.css';

const initialContent = {
  type: 'json' as const,
  text: JSON.stringify({
    type: 'doc',
    children: [
      { type: 'p', children: [{ text: 'Hello World' }] }
    ]
  })
};

<LakexEditor content={initialContent} />
```

### 获取内容变化

```tsx
<LakexEditor
  onContentChange={(contents) => {
    const jsonContent = contents.find(c => c.type === 'json');
    if (jsonContent) {
      const document = JSON.parse(jsonContent.text);
      console.log('Document JSON:', document);
    }
  }}
/>
```

## 扩展指南

### 创建自定义卡片类型

1. 定义卡片配置（参考 README 中的自定义卡片章节）
2. 在 `slash.ts` 中注册卡片
3. JSON 格式使用 `card` 类型 + `attrs.value.$name` 标识

### 新增节点类型

如需支持新的节点类型，请按照以下格式扩展：

```json
{
  "type": "custom-node-type",
  "attrs": {
    "customProperty": "value"
  },
  "children": [...]
}
```

***

**版本**: 1.0\
**适用编辑器**: @dlient/lakex-doc-react v0.1+\
**更新时间**: 2026-07
