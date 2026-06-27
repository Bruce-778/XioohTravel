# XioohTravel

面向日本机场接送与私人包车场景的一站式预订平台。项目覆盖从路线搜索、车型报价、订单提交、Stripe 在线支付，到用户订单查询、取消退款、商家邮件通知和后台运营管理的完整业务闭环。

## 项目定位

XioohTravel 不是一个简单的展示页，而是一个可真实承接订单的旅行交通服务系统。它围绕日本旅游接送的典型场景设计：旅客可以选择接机、送机或点到点用车，系统根据城市区域、机场航站楼、人数、行李、车型容量、夜间时段、急单规则和特殊价格覆盖计算报价，并通过 Stripe 完成支付。

后台侧则提供订单管理、状态流转、手动调价、价格规则维护、临时价格覆盖、CSV 批量导入和订单导出，方便运营人员处理旺季、节假日、临时加价、客户取消和退款等真实业务问题。

## 核心亮点

| 能力 | 说明 |
| --- | --- |
| 完整预订链路 | 首页搜索路线，车型页匹配可用车辆，结账页提交联系人和行程信息，生成待支付订单并跳转 Stripe Checkout。 |
| 真实定价模型 | 以 JPY 为主计价单位，支持基础价、夜间附加费、急单附加费、儿童座椅费、举牌服务费、后台手动调价和特殊时段价格覆盖。 |
| 运营后台 | 管理员可以查看订单详情、筛选/搜索订单、导出订单、修改状态、维护基础价格规则、创建临时价格覆盖，并通过 CSV 预览后批量导入价格。 |
| 支付与退款保护 | Stripe Webhook 同步支付状态和手续费，支持未支付订单取消、已支付订单退款预览、退款状态同步、重复支付安全退款和异常支付运营提醒。 |
| 多语言与多币种 | 内置中文和英文文案，价格内部按 JPY 存储，前台可显示 JPY、CNY、USD。 |
| 日本本地化场景 | 支持成田、羽田、关西、伊丹、中部、新千岁等机场，以及东京、大阪、京都热门区域和酒店地点。时间展示按 JST 处理。 |
| 用户账户与订单查询 | 邮箱验证码登录，用户可查看与已验证邮箱关联的订单，支持重试支付、查看明细、取消规则和退款信息。 |
| 可运营的安全边界 | 后台使用管理员邮箱白名单、后台安全口令、JWT Cookie、API 中间件、接口级管理员校验和简单限流。 |
| 增长与 SEO 基础 | 配置页面 metadata、Open Graph、sitemap、robots、Google Tag Manager，以及搜索/下单关键动作的数据层事件。 |

## 关键规则

- 预订提前量：至少提前 12 小时才允许创建订单。
- 急单定义：距离上车时间小于 24 小时的订单会被标记为急单。
- 夜间规则：日本时间 21:00 至次日 06:00 触发夜间附加费。
- 取消规则：未支付订单可过期 Stripe Checkout 后取消；已支付订单会计算退款预览并走 Stripe Refund；急单或已过用车时间的订单限制用户自助取消。
- 车型容量：报价和下单时都会校验乘客人数、随身行李和中型行李是否超出车辆容量。
- 价格优先级：命中特殊时段价格覆盖时使用覆盖价，否则回落到基础价格规则。

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 前端与路由 | Next.js 15 App Router, React 19, TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | PostgreSQL / Supabase, `pg` |
| 支付 | Stripe Checkout, Stripe Webhook, Stripe Refund |
| 邮件 | Resend |
| 地点能力 | Google Maps / Places Autocomplete |
| 国际化 | 自研轻量 i18n 字典，支持中文和英文 |
| 认证 | 邮箱验证码登录，JWT Cookie 会话 |
| 运营分析 | Google Tag Manager, `dataLayer` 事件 |

## 功能模块

### 用户端

- 首页搜索：接机、送机、点到点三种服务类型。
- 地点选择：机场航站楼、热门区域、酒店和 Google Places 自动补全。
- 车型选择：5 座经济型、7 座商务型、9 座大空间、豪华 VIP、大巴团体车型。
- 报价展示：基础价、夜间费、急单费和容量限制提示。
- 订单填写：航班号、上下车地点、联系人、国家区号、特殊需求。
- 增值服务：儿童座椅和举牌服务。
- 在线支付：创建订单后跳转 Stripe Checkout。
- 我的订单：登录后查看订单、展开详情、重试支付、取消订单、查看退款状态。

### 管理后台

- 管理员登录：邮箱白名单加后台安全口令双重校验。
- 订单管理：分页、筛选、订单号搜索、详情展开、状态更新和手动调价。
- 价格管理：按路线、行程类型和车型维护基础价格、夜间费、急单费。
- 临时价格覆盖：为节假日、活动、旺季或特殊交通管制设置时段覆盖价。
- CSV 导入：先预览新增和覆盖结果，校验错误后再正式写入。
- 订单导出：按创建时间或用车时间筛选导出。
- 运营记录：展示支付、退款、客户邮件、商家通知邮件等关键时间和 Provider ID。

### 支付、退款与通知

- Stripe Checkout Session 使用订单号作为幂等维度，避免重复创建支付链路。
- Webhook 同步已支付订单、支付手续费、退款状态和异常支付状态。
- 对重复支付、已取消订单后支付等情况进行安全退款和运营提醒。
- 支付成功后发送客户确认邮件，并给商家发送订单通知。
- 退款成功后发送客户退款确认邮件，并给商家发送取消退款通知。

## 项目结构

```text
.
├── src/app                  # Next.js App Router 页面与 API Routes
│   ├── api                  # 订单、支付、认证、后台管理等接口
│   ├── admin                # 管理后台页面
│   ├── checkout             # 结账页
│   ├── orders               # 我的订单页
│   └── vehicles             # 车型报价页
├── src/components           # 搜索、结账、订单、后台、导航等 UI 组件
├── src/lib                  # 业务核心：定价、订单、支付、退款、认证、i18n、地点数据
├── scripts                  # 数据库初始化、数据检查、价格同步和邮件重试脚本
├── scripts/sql              # Supabase / PostgreSQL 安全初始化和补丁 SQL
├── public                   # 车辆、行李、首页推广图、品牌图标
├── docs                     # 投放和运营相关文档
├── FEATURES.md              # 更偏操作说明的功能文档
└── env.example              # 环境变量示例
```

## 本地运行

### 1. 安装依赖

建议使用 Node.js 20 LTS 或更新版本。

```bash
npm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp env.example .env
```

至少需要配置：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL / Supabase 连接字符串。 |
| `JWT_SECRET` | JWT 签名密钥，至少 32 位字符。可用 `openssl rand -hex 32` 生成。 |
| `ADMIN_EMAILS` | 管理员邮箱白名单，多个邮箱用英文逗号分隔。 |
| `ADMIN_TOKEN` | 后台二次验证口令。代码也兼容旧变量名 `ADMIN_SECRET_KEY`。 |
| `APP_BASE_URL` | 应用访问地址，Stripe 回跳和邮件链接会使用它。 |

按需配置：

| 变量 | 说明 |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe 服务端密钥，用于创建 Checkout 和退款。 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 签名密钥。 |
| `RESEND_API_KEY` | Resend API Key，用于发送验证码、支付确认和退款通知邮件。 |
| `BOOKING_EMAIL_FROM` | 订单邮件发件人。 |
| `BOOKING_EMAIL_REPLY_TO` | 订单邮件回复地址。 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps / Places 自动补全。 |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager 容器 ID。 |
| `USD_PER_JPY` / `CNY_PER_JPY` | 可选汇率配置；未配置时使用代码内置兜底汇率。 |

### 3. 初始化数据库

初始化脚本是幂等且非破坏性的：会补齐缺失表、字段、索引和约束，不会清空已有数据。

```bash
npm run init-db
```

也可以把 `scripts/sql/supabase-safe-init.sql` 粘贴到 Supabase SQL Editor 执行。

### 4. 写入基础车型和价格

```bash
npm run seed
```

如果需要同步完整真实报价，可执行：

```bash
npm run sync:real-pricing -- --commit
```

### 5. 启动开发服务器

```bash
npm run dev
```

打开 `http://localhost:3000`。

## Stripe 本地调试

如果需要在本地测试支付成功、退款同步和邮件通知，需要把 Stripe Webhook 转发到本地：

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

然后把命令输出的 webhook secret 写入 `.env` 的 `STRIPE_WEBHOOK_SECRET`。

## 管理后台使用

1. 在 `.env` 中把你的登录邮箱加入 `ADMIN_EMAILS`。
2. 设置一个足够长的 `ADMIN_TOKEN`。
3. 访问 `/login`，用管理员邮箱接收验证码并登录。
4. 访问 `/admin`，输入 `ADMIN_TOKEN` 完成后台二次验证。
5. 进入后台后即可管理订单、价格规则、特殊价格覆盖和导出数据。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器。 |
| `npm run build` | 先检查 i18n 字典，再执行 Next.js 构建。 |
| `npm run check:i18n` | 检查中英文文案键是否完整。 |
| `npm run check:locations` | 检查地点归一化逻辑。 |
| `npm run check:booking-rules` | 检查预订提前量、急单、夜间费等业务规则。 |
| `npm run check:real-pricing` | 检查真实报价数据。 |
| `npm run check:user-pricing-flows` | 检查用户报价链路。 |
| `npm run init-db` | 非破坏性初始化数据库结构。 |
| `npm run seed` | 写入基础车型和基础数据。 |
| `npm run sync:real-pricing -- --commit` | 同步真实报价。 |
| `npm run retry:payment-confirmation-email` | 重试支付确认邮件。 |
| `npm run retry:merchant-order-email` | 重试商家订单通知邮件。 |

## 数据模型概览

核心表由 `scripts/sql/supabase-safe-init.sql` 管理：

- `vehicle_types`：车型、座位数、行李容量、是否豪华/大巴。
- `pricing_rules`：基础价格规则，按路线、行程类型和车型匹配。
- `pricing_rule_overrides`：临时价格覆盖，按时间段优先生效。
- `bookings`：订单主表，保存行程、联系人、费用明细、支付、退款和邮件状态。
- `users` / `user_emails`：邮箱验证码登录后的用户和邮箱绑定。
- `verification_codes`：登录验证码和尝试次数。

## 适合展示的项目价值

这个项目的重点在于它把“旅行接送预订”拆成了可运营的真实系统，而不是只停留在页面表单：

- 产品上，它完成了旅客从搜索到支付再到订单管理的主路径。
- 业务上，它内置了日本接送场景里常见的夜间、急单、机场航站楼、行李容量和临时价格问题。
- 运营上，它提供后台价格、订单、导出、退款和通知能力，能够支撑日常人工处理。
- 技术上，它把 Next.js App Router、PostgreSQL、Stripe、Resend、Google Places、i18n、JWT Auth 和 Webhook 串成了一个完整闭环。

## 后续可扩展方向

- 接入实时汇率服务，替换当前固定汇率兜底。
- 增加司机端派单、车辆排班和服务状态回传。
- 增加优惠券、渠道码和广告转化归因报表。
- 增加更细粒度的管理员角色和操作审计日志。
- 为核心 API 增加自动化测试和端到端下单测试。
