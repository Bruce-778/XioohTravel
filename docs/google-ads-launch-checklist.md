# XioohTravel Google Ads 上线清单

这份清单用于把 `xioohtravel.com` 准备成可投放、可追踪、可优化订单的网站。第一阶段面向英文游客，中文保留给站长和管理员运营使用。

## 1. 网站代码已经预留的能力

- GTM 容器环境变量：`NEXT_PUBLIC_GTM_ID`
- 漏斗事件：
  - `search_vehicles`
  - `select_vehicle`
  - `begin_checkout`
  - `checkout_submit`
  - `purchase`
  - `contact_whatsapp_click`
  - `contact_email_click`
- 英文推广入口：
  - 第一阶段统一使用首页 `https://xioohtravel.com/` 作为广告落地页。
  - 旧的 `/en/...` 推广 URL 会自动跳转到首页下单区，避免用户进入和主下单体验不一致的页面。
- `purchase` 事件只在 Stripe 确认支付成功后触发，包含：
  - `transaction_id`
  - `value`
  - `currency=JPY`
  - `vehicle_name`
  - `pickup_location`
  - `dropoff_location`
  - `pickup_time`

## 2. Vercel 环境变量

在 Vercel Project Settings -> Environment Variables 添加：

```text
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

添加后重新部署 Production。没有真实 GTM ID 时，网站不会加载 GTM，但代码里的 dataLayer 事件已经准备好。

## 3. Google 平台账号准备

1. 创建 Google Tag Manager 容器，类型选 Web。
2. 把 GTM ID 填到 Vercel 的 `NEXT_PUBLIC_GTM_ID`。
3. 创建 GA4 property。
4. 创建 Google Ads 账号并绑定账单。
5. 在 Google Ads 创建转化动作：
   - Purchase：Primary conversion。
   - Begin checkout：Secondary conversion。
   - Contact lead：Secondary conversion。
6. 在 GTM 中创建：
   - Conversion Linker，触发器 All Pages。
   - GA4 Configuration / Google tag，触发器 All Pages。
   - GA4 Event tags：对应所有 dataLayer 事件。
   - Google Ads Conversion tags：对应 `purchase`、`begin_checkout`、contact click。

## 4. GTM 触发器建议

用 Custom Event 触发器：

```text
purchase
begin_checkout
checkout_submit
search_vehicles
select_vehicle
contact_whatsapp_click
contact_email_click
```

变量建议：

```text
transaction_id
value
currency
route
vehicle_name
from_area
to_area
pickup_time
contact_channel
source_area
```

不要把用户姓名、邮箱、手机号作为普通 dataLayer 变量发送。

## 5. 第一阶段 Search Campaign 结构

预算默认按每月人民币 5000 元测试，日预算约 165 元。

```text
Search - Brand - EN
日预算：15 元
关键词：[xioohtravel], [xiooh travel]
落地页：https://xioohtravel.com/
```

```text
Search - Tokyo Airport Transfer - EN
日预算：75 元
关键词：
"tokyo airport transfer"
[tokyo airport transfer]
"narita airport transfer"
[narita airport transfer]
"haneda airport transfer"
[haneda airport transfer]
"narita to shinjuku transfer"
"haneda to shibuya private transfer"
落地页：https://xioohtravel.com/
```

```text
Search - Osaka Kansai Transfer - EN
日预算：50 元
关键词：
"kansai airport transfer"
[kansai airport transfer]
"kansai airport to osaka"
"kansai airport to namba"
"osaka airport transfer"
落地页：https://xioohtravel.com/
```

```text
Search - Japan Private Driver - EN
日预算：25 元
关键词：
"japan private driver"
"private car with driver japan"
"tokyo private car charter"
"kyoto private car charter"
"tokyo to mount fuji private transfer"
落地页：https://xioohtravel.com/
```

## 6. 否定关键词

第一天上线前直接添加：

```text
free
job
jobs
salary
driver job
train
bus
subway
metro
map
parking
weather
visa
flight status
car rental
rent a car
self drive
uber
taxi app
luggage storage
used car
for sale
```

每 2 天检查 Search Terms report，把无关搜索词继续加入否定关键词。

## 7. 英文广告文案

Headlines：

```text
Tokyo Airport Transfer
Narita Private Transfer
Haneda Airport Pickup
Fixed Price Transfers
Japan Private Driver
Book Online In Minutes
5/7/9 Seater Options
English Support
Flight Tracking Included
Kansai Airport Transfer
Osaka Airport Pickup
Kyoto Private Chauffeur
Tokyo To Fuji Transfer
Door To Door Pickup
Secure Stripe Payment
```

Descriptions：

```text
Book private airport transfers in Tokyo, Osaka and Kyoto. Fixed price, flight tracking and online payment.
Choose 5, 7 or 9 seater vehicles for Japan airport pickup. English support and secure Stripe checkout.
Reserve Narita, Haneda or Kansai airport transfers with clear pricing and door to door pickup.
```

Assets：

```text
Sitelinks: Vehicle Guide, Luggage Guide, Driver Guide, Contact Support, Book Airport Transfer
Callouts: Fixed Price, Flight Tracking, 5/7/9 Seater Options, English Support, Secure Payment
Structured snippets: Services: Airport Transfer, Private Driver, Hotel Pickup, Family Transfer
```

## 8. 上线后 14 天优化规则

- 第 1-14 天先用 Maximize Clicks，并设置 CPC cap。
- 不开 Display Network。
- 不开 broad match。
- 第 3 天开始看 Search Terms report。
- 花费超过 300 元但没有 `begin_checkout` 的关键词暂停。
- 花费超过 800 元但没有 `purchase` 的 ad group 暂停或重构。
- 有 15 个以上 purchase 或足够 checkout 数据后，再切换 Maximize Conversions。

## 9. Stripe / Visa 支付准备

当前网站已经使用 Stripe Checkout。后续要让国外用户用 Visa 正常支付，需要在 Stripe 完成：

- Live mode 激活。
- Business verification。
- 支付方式启用 Cards。
- 确认 Visa、Mastercard 等 card payments 可用。
- Vercel Production 使用 live `STRIPE_SECRET_KEY`。
- Production webhook 使用 live `STRIPE_WEBHOOK_SECRET`。
- 做一笔真实小额测试订单，确认 `/success` 出现并触发 `purchase`。

只要 Stripe 账号和 live key 正确，网站代码不需要为了 Visa 单独更换支付系统。
