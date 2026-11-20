# BookNest — 10-Minute Demo Script / 演示脚本（English + 中文）

> Recorded video, 10 minutes, **speak in English**. Record the **submitted build** (local `start.bat` → localhost:3000 is best; the live URL is the backup).
> 录 10 分钟视频，**用英文讲**。录**提交的构建**（本地 `start.bat` 最稳，线上网址做备份）。

## Test accounts / 测试账号（dummy only）
- Admin: `admin@booknest.demo` / `password123`
- Member: `alice@booknest.demo` / `password123`

---

## Flow at a glance / 流程速览

| Time | Page | Show / 展示 |
|---|---|---|
| 0:00–1:30 | Intro | Problem, users, architecture / 问题、用户、架构 |
| 1:30–2:30 | Home | Today's picks, subject rail, search / 推荐榜单、学科栏、搜索 |
| 2:30–3:30 | Browse | Filters, sort, pagination / 筛选、排序、分页 |
| 3:30–4:30 | Book detail | Reason-first recommendations, reviews / 理由优先的推荐帖、短评 |
| 4:30–5:30 | Inline sign-in | Guest → sign in mid-action / 游客写操作时内联登录 |
| 5:30–6:30 | User content | Post recommendation + useful vote + review / 发推荐、点有用、发短评 |
| 6:30–7:30 | Cart & checkout | Add to cart, address, order / 加购、地址、下单 |
| 7:30–8:30 | Orders & download | Pay, download (order-checked) / 支付、鉴权下载 |
| 8:30–9:30 | Admin | Catalogue CRUD, cover upload, order status / 目录管理、封面上传、订单状态 |
| 9:30–10:00 | Persistence | Reload and data survives / 刷新数据仍在 |

---

## 0:00–1:30 · Introduction / 介绍

**Say (EN):** "This is BookNest, a campus bookstore where the unit of trust is a peer's written *reason*, not an anonymous star rating. University students buy books through scattered channels: general e-commerce ignores course context, and campus second-hand sales vanish in chat groups. The real gap is trust. So BookNest makes the reasoned recommendation the central object — every recommendation must carry a written reason and can be marked 'useful'. Visitors browse freely; only write actions need an account. The stack is vanilla HTML, CSS and ES modules on the client, a Node.js + Express REST API, and SQLite with a schema and seed data. There are three roles — guest, member and admin — with real business rules and persistent data."

**中文：** 「这是 BookNest，一个以『同学写下的推荐理由』而非匿名星级为信任基础的校园书店。学生买书渠道分散：综合电商忽略课程场景，校园二手交易在聊天群里转瞬即逝。真正的缺口是信任。所以 BookNest 把『有理由的推荐』做成核心对象——每条推荐必须写理由，还能被点『有用』。游客可自由浏览，只有写操作才需要账号。技术栈：客户端原生 HTML/CSS/ES 模块，Node.js + Express REST API，SQLite 加 schema 和种子数据。三种角色：游客、成员、管理员，有真实业务规则和持久化数据。」

## 1:30–2:30 · Home page / 首页

**Say (EN):** "The home page is already a working storefront before login. 'Today's picks' are shown as a ranking podium with numbered steps. The left rail lists subjects — click one and it jumps to that subject's picks. Search is a one-line field in the header."

**中文：** 「首页在登录前就是一个能用的店面。『今日推荐』做成带编号台阶的榜单领奖台。左侧栏列出学科，点一个就跳到该学科的推荐。搜索是顶栏里的一行输入框。」

## 2:30–3:30 · Browse / 目录

**Say (EN):** "The catalogue supports keyword search, filters for format, price and minimum rating, sorting by price/rating/newest, and pagination. Everything runs on the server-side API, so guests can filter without an account."

**中文：** 「目录支持关键词搜索、按形式/价格/最低评分筛选、按价格/评分/最新排序，还有分页。全部走服务端 API，游客无需账号即可筛选。」

## 3:30–4:30 · Book detail / 书籍详情

**Say (EN):** "On a book page, recommendations come first and are ranked by usefulness — each one carries a written reason. Below that are ordinary 1–5 star reviews with an average. This is the core differentiator: a reason, not just a score."

**中文：** 「书籍页里推荐帖排在最前，按『有用数』排序，每条都带理由。下面是普通的 1–5 星短评和平均分。这就是核心差异：有理由，而不只是分数。」

## 4:30–5:30 · Inline sign-in / 内联登录

**Say (EN):** "As a guest, write actions are still available — clicking one opens an inline sign-in dialog with a show-password eye, and the action resumes right after login. No redirect, no lost context."

**中文：** 「游客状态下写操作依然可点——点一下会弹出内联登录框，带『显示密码』眼睛图标，登录后刚才的动作自动继续。不跳转、不丢上下文。」

## 5:30–6:30 · User content / 用户内容

**Say (EN):** "Signed in, I can post a recommendation — the reason is required — and a small celebration appears. I can mark another peer's post 'useful' (one vote per member, enforced in SQL). And I can rate a book with the five-star control (one review per book)."

**中文：** 「登录后可以发推荐——理由必填——发布时有个小礼花。我可以给别人的帖子点『有用』（每人每帖一票，SQL 层唯一约束）。也能用五星控件给书评分（每书一条短评）。」

## 6:30–7:30 · Cart & checkout / 购物车与结算

**Say (EN):** "Adding a book flies it into the cart. The cart is server-side. At checkout, a delivery address is required for used books. The order freezes unit prices and decrements used-copy stock inside a transaction."

**中文：** 「加购时书会飞进购物车。购物车在服务端。结算时二手书必须填收货地址。订单会冻结单价，并在事务里扣减二手库存。」

## 7:30–8:30 · Orders & download / 订单与下载

**Say (EN):** "In Orders I can pay a pending order. For digital books, a Download button appears only after payment — the file is stored outside the static root and is streamed only after the server re-checks the order, so there is no direct file URL."

**中文：** 「在订单页可以给待支付订单付款。电子书付款后才会出现『下载』——文件放在静态目录之外，服务端重新校验订单后才流式返回，所以没有可直接访问的文件地址。」

## 8:30–9:30 · Admin / 管理员

**Say (EN):** "As an admin I can add or edit a book, upload a validated cover image, deactivate a listing, and move orders through statuses. Everything is protected by a role check."

**中文：** 「管理员可以增改书籍、上传经过校验的封面图、下架图书、推进订单状态。全部有角色权限保护。」

## 9:30–10:00 · Persistence & wrap-up / 持久化与收尾

**Say (EN):** "After a refresh and reopening the tab, the same data is still there — the posts, votes and orders persist. BookNest is deployed at the URL in the README, with the same build you are watching."

**中文：** 「刷新页面、重新打开后数据仍然在——帖子、投票、订单都持久化了。BookNest 部署在 README 里的网址上，就是你正在看的这个构建。」

---

## Likely Q&A / 可能的提问（简短回答）

1. **Why a reason instead of just stars? / 为什么用理由而不是只靠星级？**
   EN: "Stars say *how much*, a reason says *why* — and we can rank reasons by how many peers found them useful."
   中：星级只说「多少」，理由说「为什么」，而且理由可以按『多少人觉得有用』排序。

2. **How is the download protected? / 下载怎么保护？**
   EN: "Files live outside the static root; the download route checks the session user against a paid order before streaming, and uses only the file basename (no traversal)."
   中：文件在静态目录之外；下载路由先校验该用户是否有已支付订单再流式返回，且只取文件名（防目录穿越）。

3. **How do you prevent double reviews or double votes? / 怎么防止重复短评/重复投票？**
   EN: "SQL-level constraints: one review per (user, book), and a composite primary key on (user, recommendation) for votes."
   中：SQL 层约束：每条短评 (user, book) 唯一，投票用 (user, recommendation) 复合主键。

4. **What would you improve next? / 下一步怎么改进？**
   EN: "SQLite-backed sessions, a Railway volume for true persistence, and the declared stretch features such as student used-book listings."
   中：用 SQLite 存会话、给 Railway 挂持久盘实现真正持久化，以及实现学生二手书上架等 stretch 功能。
