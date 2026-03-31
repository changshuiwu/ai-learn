# Scene Viewer 开发使用文档

## 概述

`scene-viewer.js` 是一个基于 Vue 的 3D 场景查看器/渲染引擎库，版本约 3.10.1。该库提供了完整的 3D 场景加载、渲染、交互和管理功能。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **渲染**: 原生 WebGL/Canvas
- **数据存储**: IndexedDB 本地存储
- **网络**: Axios HTTP 客户端

## 主要模块

### 数据加载模块

| 类名 | 功能 |
|------|------|
| `ExternalLoader` | 外部资源加载器 |
| `FileDataReader` | 文件数据读取 |
| `HtmlDataReader` | HTML 数据读取 |
| `HttpDataReader` | HTTP 请求数据读取 |
| `HttpDataWriter` | HTTP 数据写入 |
| `DataLoadingService` | 数据加载服务 |

### 事件系统

| 类名 | 功能 |
|------|------|
| `LoadingEvents` | 加载事件 (extends EventTarget) |
| `AttributeEvents` | 属性变更事件 (extends EventTarget) |

### 核心功能类

| 类名 | 功能 |
|------|------|
| `FeatureCoordinator` | 特性协调器，管理场景功能 |
| `InterceptorManager` | 拦截器管理器 |
| `PromiseQueue` | Promise 队列 |
| `PromiseScheduler` | Promise 调度器 |
| `Snowflake` | 雪花 ID 生成器 |

### 数据校验

| 类名 | 功能 |
|------|------|
| `NodeIdChecker` | 节点 ID 校验 |
| `CustomFunctionChecker` | 自定义函数校验 |
| `ObjectConfigChecker` | 对象配置校验 |
| `TriggerMatcher` | 触发器匹配 |

### 主题与渲染

| 类名 | 功能 |
|------|------|
| `ThemeCache2` | 主题缓存 |
| `Theme2` | 主题管理 |
| `Keyframe2` | 关键帧 |

### 布局系统

| 类名 | 功能 |
|------|------|
| `LayoutBuilder` | 布局构建器 |
| `LayoutManager` | 布局管理器 |

### 数字精度

| 类名 | 功能 |
|------|------|
| `NumberDecimal` | 十进制数字 |
| `BigIntDecimal` | 大整数 decimal |

## 核心功能

### 1. 场景加载

支持多种数据源加载:
- 本地文件 (FileDataReader)
- HTTP 请求 (HttpDataReader)
- HTML 内嵌数据 (HtmlDataReader)

### 2. 本地存储

使用 IndexedDB 进行数据持久化:
- 场景数据缓存
- 渲染体存储
- 网格数据管理

### 3. 事件系统

提供完整的事件机制:
```javascript
// 加载事件示例
const loadingEvents = new LoadingEvents();
loadingEvents.addEventListener('load', (e) => {
  console.log('加载完成:', e.detail);
});
```

### 4. 异步处理

- `PromiseQueue`: 队列化管理异步任务
- `PromiseScheduler`: 智能调度长队列
- `AxiosRetry`: HTTP 请求重试机制

## 使用示例

### 初始化场景查看器

```javascript
import { createApp } from 'vue';
import sceneViewer from './scene-viewer.js';

const app = createApp(App);
app.mount('#container');
```

### 数据加载

```javascript
// 使用 HttpDataReader 加载远程场景
const reader = new HttpDataReader(url);
const data = await reader.read();

// 使用 FileDataReader 加载本地文件
const fileReader = new FileDataReader();
const data = await fileReader.read(file);
```

### 事件监听

```javascript
// 监听加载事件
const loader = new ExternalLoader();
loader.addEventListener('progress', (e) => {
  console.log(`加载进度: ${e.progress}%`);
});
```

## 配置项

主要配置通过构造函数传入:

```javascript
const config = {
  // 启用 IDB 存储
  enableIDB: true,
  // 最大缓存数量
  maxNum: 500,
  // 预加载列表
  preLoad: [],
};
```

## 性能优化

1. **数据分块加载**: 支持大场景分块加载
2. **LOD 支持**: 多细节层次渲染
3. **IndexedDB 缓存**: 本地数据缓存减少重复请求
4. **Promise 调度**: 智能任务调度避免阻塞

## 版本信息

- 库版本: ~3.10.1
- Three.js 版本: 3.x (从类名推断)
- Vue 版本: 3.x (Composition API)

## 注意事项

1. 该文件为编译后的库文件，不建议直接修改
2. 使用时需确保环境支持 Vue 3 Composition API
3. IndexedDB 功能需要浏览器支持
4. 大文件加载建议使用流式处理