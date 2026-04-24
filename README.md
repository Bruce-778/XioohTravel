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

### 4) 可选：写入演示车型 / 演示价格
这一步同样是保守策略：
- 只补缺失车型
- 只有当 `pricing_rules` 为空时才写入演示价格

```bash
npm run seed
```

### 5) 启动开发服务器
```bash
npm run dev
```

打开：`http://localhost:3000`
