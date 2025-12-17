# 物料管理与条码生成系统

一个基于 React + TypeScript + Supabase 的现代化物料管理系统，支持完整的物料生命周期管理、批次跟踪、条码生成和供应商管理。

![React](https://img.shields.io/badge/React-18.3.1-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178c6)
![Vite](https://img.shields.io/badge/Vite-6.3.5-646cff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-06b6d4)
![Supabase](https://img.shields.io/badge/Supabase-2.87.1-3ecf8e)

## ✨ 功能特性

### 🏢 核心功能
- **物料管理**: 完整的物料信息管理，包括编码、规格、分类等
- **批次管理**: 物料批次跟踪，支持生产日期、过期日期管理
- **供应商管理**: 供应商信息维护和状态管理
- **用户管理**: 用户账户管理，支持多角色权限控制
- **条码生成**: 支持 Code128、QR Code、EAN13、UPC 等多种条码格式
- **数据分析**: 库存统计、批次状态分析、供应商绩效等
- **审计日志**: 完整的操作审计日志，记录所有关键操作

### 🔐 权限管理
- **多角色支持**: 管理员、经理、操作员、查看者四种角色
- **行级安全**: 基于 Supabase RLS 的细粒度权限控制
- **操作审计**: 完整的操作审计日志系统，记录用户的所有关键操作
  - 支持按时间、用户、模块、操作类型筛选
  - 自动记录 IP 地址和详细操作内容
  - 离线模式下本地保存审计日志

### 📊 数据分析
- **实时统计**: 物料数量、库存状态、批次分析
- **图表展示**: 使用 Recharts 提供丰富的数据可视化
- **批量导入**: 支持 Excel 批量导入物料和供应商数据
- **数据导出**: 支持将数据导出为 Excel 格式

### 🔧 技术特性
- **离线支持**: 支持离线模式，使用本地存储
- **响应式设计**: 基于 Tailwind CSS 的现代化 UI
- **类型安全**: 完整的 TypeScript 类型定义
- **状态管理**: 基于 Zustand 的轻量级状态管理

## 🛠️ 技术栈

### 前端
- **React 18.3.1** - 用户界面库
- **TypeScript 5.8.3** - 类型安全的 JavaScript
- **Vite 6.3.5** - 快速的构建工具
- **Tailwind CSS 3.4.17** - 实用优先的 CSS 框架
- **React Router 7.3.0** - 客户端路由
- **Zustand 5.0.3** - 轻量级状态管理
- **React Hot Toast 2.6.0** - 优雅的通知组件

### UI 组件
- **Headless UI 2.2.9** - 无样式的可访问组件
- **Heroicons 2.2.0** - 精美的 SVG 图标
- **Lucide React 0.511.0** - 现代化图标库
- **Recharts 3.5.1** - React 图表库

### 后端
- **Supabase 2.87.1** - 开源的 Firebase 替代品
- **PostgreSQL** - 可靠的关系型数据库
- **行级安全 (RLS)** - 数据级权限控制

### 条码处理
- **JsBarcode 3.12.1** - 条码生成
- **QRCode 1.5.4** - 二维码生成
- **Canvas API** - 图形绘制

### 数据处理
- **XLSX** - Excel 文件读写，支持批量导入导出
- **File-Saver 2.0.5** - 文件保存

## 📦 安装与运行

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 8.0.0 (推荐) 或 npm >= 9.0.0
- Git

### 克隆项目
```bash
git clone <repository-url>
cd tiaoma
```

### 安装依赖
```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 环境配置
1. 复制环境变量模板：
```bash
cp .env.example .env.local
```

2. 配置环境变量（详见 [环境变量配置](#-环境变量配置)）

### 运行开发服务器
```bash
# 使用 pnpm
pnpm dev

# 或使用 npm
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 查看应用。

### 构建生产版本
```bash
# 使用 pnpm
pnpm build

# 或使用 npm
npm run build
```

### 代码检查
```bash
# 使用 pnpm
pnpm lint

# 或使用 npm
npm run lint
```

## 🔧 环境变量配置

创建 `.env.local` 文件并配置以下变量：

```env
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 离线模式 (可选)
VITE_OFFLINE=false

# 开发模式配置 (可选)
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info

# 性能配置 (可选)
# 默认开启代码分割以改善首屏性能；如需输出尽量少的 chunk（例如排查 file:// 兼容性）可设为 false
VITE_ENABLE_CODE_SPLITTING=true

# 主题配置 (可选)
# 默认主题：light / dark / auto（auto 跟随系统）
VITE_DEFAULT_THEME=auto
```

### 获取 Supabase 配置
1. 在 [Supabase](https://supabase.com) 创建新项目
2. 在项目设置 > API 中获取：
   - Project URL
   - anon public key

### 离线模式
当无法连接到 Supabase 或配置缺失时，应用会自动切换到离线模式，使用本地存储作为数据源。

## 🗄️ 数据库结构

### 核心表结构
- **materials** - 物料基本信息
- **material_batches** - 物料批次信息
- **suppliers** - 供应商信息
- **material_categories** - 物料分类
- **units** - 单位信息
- **barcodes** - 条码信息
- **material_codes** - 物料编码
- **audit_logs** - 审计日志

### 权限角色
- **admin** - 管理员：完整系统访问权限
- **manager** - 经理：管理物料、批次、供应商
- **operator** - 操作员：创建和更新批次、条码
- **viewer** - 查看者：只读权限

详细数据库结构请参考 `supabase/migrations/` 目录下的 SQL 文件。

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   ├── auth/           # 认证相关组件
│   ├── audit/          # 审计日志组件
│   ├── barcodes/       # 条码组件
│   ├── batches/        # 批次组件
│   ├── layout/         # 布局组件
│   ├── materials/      # 物料组件
│   └── suppliers/      # 供应商组件
├── pages/              # 页面组件
├── stores/             # Zustand 状态管理
├── types/              # TypeScript 类型定义
├── lib/                # 工具库和配置
├── hooks/              # 自定义 React Hooks
├── utils/              # 工具函数
└── init/               # 初始化脚本
```

## 🚀 部署

### Vercel 部署
项目已配置 Vercel，可直接部署：

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署完成

### 自定义部署
```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 部署 dist/ 目录到你的服务器
```

## 🔒 安全特性

- **行级安全 (RLS)**: 数据库级别的访问控制
- **JWT 认证**: 基于 Supabase 的安全认证
- **输入验证**: 前后端双重数据验证
- **SQL 注入防护**: 使用参数化查询
- **XSS 防护**: React 内置的 XSS 保护

## 🧪 开发指南

### 代码规范
- 使用 ESLint + TypeScript 进行代码检查
- 遵循 React Hooks 规则
- 使用 TypeScript 严格模式
- 组件使用 PascalCase，文件使用 kebab-case

### 提交规范
```bash
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建过程或辅助工具变动
```

### 状态管理
使用 Zustand 进行状态管理：
- `authStore` - 认证状态
- `materialStore` - 物料数据
- `batchStore` - 批次数据
- `supplierStore` - 供应商数据
- `userStore` - 用户管理数据
- `auditStore` - 审计日志数据

## 📝 更新日志

### v1.0.0 (当前版本)
- ✨ 完整的物料管理系统
- ✨ 条码生成功能
- ✨ 批次管理
- ✨ 供应商管理
- ✨ 用户管理功能（真实数据实现）
- ✨ 权限控制系统
- ✨ 操作审计日志系统
- ✨ 批量导入/导出功能
- ✨ Excel 模板下载
- ✨ 数据验证和错误提示
- ✨ 响应式设计
- ✨ 离线模式支持

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 常见问题

### Q: 如何重置密码？
A: 在登录页面点击"忘记密码"，输入邮箱地址，按照邮件提示重置。

### Q: 离线模式有什么限制？
A: 离线模式使用本地存储，数据不会自动同步到云端；如需上云需要在在线模式下重新录入/导入，或自行实现同步机制。

### Q: 如何添加新的物料分类？
A: 在物料管理页面，点击"添加物料"，在分类下拉框中选择或创建新分类。

### Q: 条码打印有问题怎么办？
A: 检查浏览器是否允许弹窗，并确保打印机设置正确。

## 📞 技术支持

如果遇到问题或需要帮助，请：
- 提交 [Issue](../../issues)
- 查看 [文档](./docs/)
- 联系开发团队

## 🎯 路线图

### 即将推出的功能
- [ ] 移动端应用
- [ ] 高级数据分析
- [x] 批量导入/导出
- [ ] 条码扫描功能
- [ ] 自动补货提醒
- [ ] 供应商评估系统
- [ ] 多语言支持
- [x] 深色模式（基础版本）

## 🔔 通知与提示

项目统一使用 `react-hot-toast` 作为通知组件：
- 组件侧：使用 `src/components/common/Toast.tsx` 导出的 `useToast()`
- store 侧：使用 `src/lib/notify.tsx` 导出的 `notify`（避免 hook 限制）

## 📥 批量导入使用指南

### 物料批量导入

1. **下载模板**
   - 在物料管理页面，点击"批量导入"按钮
   - 在弹出的导入窗口中，点击"下载导入模板"
   - 系统会自动下载 Excel 模板文件（包含示例数据和字段说明）

2. **填写数据**
   - 打开下载的模板文件
   - 按照模板格式填写物料数据
   - 必填字段：物料编码、物料名称、单位、分类
   - 可选字段：规格型号、当前库存、最小库存、最大库存、状态

3. **字段说明**
   - **物料编码**：唯一标识，不能重复
   - **物料名称**：物料的名称
   - **规格型号**：物料的规格描述
   - **单位**：计量单位，必须在系统中已存在（如：个、件、张、kg等）
   - **分类**：物料分类，必须在系统中已存在
   - **当前库存**：数字类型，默认为0
   - **最小库存**：数字类型，默认为0
   - **最大库存**：数字类型，默认为0
   - **状态**：可用、停用、报废（默认为可用）

4. **导入数据**
   - 点击"批量导入"按钮
   - 拖拽 Excel 文件到上传区域，或点击选择文件
   - 系统会自动解析并验证数据
   - 查看数据预览和验证结果
   - 如有错误，会显示详细的错误信息（行号、字段、原因）
   - 确认无误后，点击"确认导入"

5. **查看结果**
   - 导入完成后，系统会显示成功和失败的条数
   - 失败的数据会跳过，不影响有效数据的导入
   - 导入成功后，物料列表会自动刷新

### 供应商批量导入

1. **下载模板**
   - 在供应商管理页面，点击"批量导入"按钮
   - 点击"下载导入模板"下载 Excel 模板

2. **填写数据**
   - 必填字段：供应商编码、供应商名称
   - 可选字段：联系人、联系电话、邮箱、地址、状态

3. **字段说明**
   - **供应商编码**：唯一标识，不能重复
   - **供应商名称**：供应商的名称
   - **联系人**：供应商联系人姓名
   - **联系电话**：联系电话号码
   - **邮箱**：邮箱地址，需符合邮箱格式
   - **地址**：供应商联系地址
   - **状态**：正常、停用（默认为正常）

4. **导入流程**
   - 与物料导入流程相同
   - 支持数据验证和错误提示
   - 支持跳过错误行继续导入

### 注意事项

- 导入前请确保模板格式正确，不要修改列标题
- Excel 文件支持 .xlsx 和 .xls 格式
- 单位和分类必须在系统中已存在，否则会导致验证失败
- 编码字段不能重复，重复的数据会被标记为错误
- 数字字段必须是有效的数字，否则会验证失败
- 邮箱字段需要符合标准邮箱格式
- 导入过程中可随时取消
- 建议先导入小批量数据测试，确认无误后再批量导入

---

**开发团队** | **版本** v1.0.0 | **最后更新** 2025-12-12
