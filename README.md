## XioohTravel — 接送机预订平台
XioohTravel 是一个面向旅客的接送机预订平台，提供透明定价、多车型选择、便捷下单的接送服务。

## 本地运行

### 1) 安装依赖
```bash
npm install
```

### 2) 配置环境变量
复制 `env.example` 为 `.env`：
```bash
cp env.example .env
```

### 3) 初始化数据库（PostgreSQL / Supabase）
这一步是非破坏性的：会补齐缺失表、字段、索引和约束，但不会清空已有数据。
```bash
npm run init-db
```

也可以直接把 `scripts/sql/supabase-safe-init.sql` 粘贴到 Supabase SQL Editor 执行。

### 4) 可选：写入真实车型 / 真实基础价格
这一步会补齐当前系统使用的真实车型，并按 `定价表.xlsx` 的报价补齐或更新真实基础价格。

```bash
npm run seed
```

如需彻底移除旧测试报价和旧价格覆盖，再写入完整真实报价，请执行：
```bash
npm run sync:real-pricing -- --commit
```

### 5) 启动开发服务器
```bash
npm run dev
```

打开：`http://localhost:3000`
