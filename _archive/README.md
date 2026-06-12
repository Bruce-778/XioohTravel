# 归档说明（_archive）

本目录存放经全项目扫描确认**未被任何代码引用**的文件。运行时不会加载这里的任何内容，确认不再需要后可整个删除此目录。

归档日期：2026-06-12

## root-duplicate-images/（18 张）

原先散落在项目根目录的图片。代码实际使用的是 `public/` 下的同名副本（通过 `/vehicles/...`、`/luggage/...` 等 URL 引用），根目录这些属于重复/遗留文件：

| 文件 | 对应的实际使用位置 |
|------|--------------------|
| 5seats / 7seats / 9seats / Alphard / Minibus_vehicle.png | `public/vehicles/` |
| Kyoto / Osaka / Tokyo_Coverpage.png | `public/home-promo/`（小写文件名版本） |
| serve-1 / serve-2 / serve-3.png | `public/home-services/` |
| carry-on / medium-suitcase / large-suitcase / medium-suitcase-24inch / small-suitcase-18inch.png | `public/luggage/`（其中仅 18inch 与 24inch 两张在用） |
| favicon.jpg / website_logo.png | `public/brand/`（仅 favicon.jpg 在用） |

注意：根目录保留的 `coverpage.png`、`Aboutus.png`、`aboutus-2.png` 三张图**正在被代码 import**（`src/app/page.tsx`、`src/app/about/page.tsx`），不可移动。

## public-unused/（9 个）

`public/` 中未被任何源码引用的静态资源（已按原目录结构存放）：

- `brand/xioohtravel-avatar.jpg`、`brand/website_logo.png` — Navbar 与 favicon 均使用 `brand/favicon.jpg`，这两个无引用
- `home/booknow-image.png` — 无引用（`public/home/` 目录已随之删除）
- `travel/kyoto.svg`、`osaka.svg`、`tokyo.svg` — `TravelShowcase` 组件实际使用 `myorders/` 下的图片（`public/travel/` 目录已随之删除）
- `luggage/carry-on.png`、`medium-suitcase.png`、`large-suitcase.png` — 行李指南页只用 `small-suitcase-18inch.png` 和 `medium-suitcase-24inch.png`

## 其他清理

以下 6 个空的占位路由目录（无 page.tsx，不产生任何路由）已直接删除：
`src/app/consent-preferences`、`cookie-policy`、`destinations`、`privacy`、`sitemap`、`terms`

如果将来要实现这些页面（Footer 等处若有链接），新建目录即可。
