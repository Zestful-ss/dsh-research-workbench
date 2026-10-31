# dsh-research-workbench（DSH 科研工作台）

DeepSeek Harness（DSH）原生插件。它有两个界面：

- **科研模式**：独立的科研侧栏、首页、Skills 页与科研助手；经典会话列表和普通对话在科研模式中隐藏。
- **经典工作台面板**：从普通 Agent 侧栏仍可打开同一套项目、文献与上游 Skills 管理。

科研助手就是 DS-Bot 中长期运行的普通 Bot。工作台给 Bot 增加一个“角色”，但不接管它的名称、模型、聊天记录或群聊：
这些始终属于 DS-Bot。工作台只负责这个 Bot 可以看到哪些科研 Skills。普通 Agent、没有科研角色的 Bot、
以及非科研 Bot 都不会从工作台获得技能目录。

支持 DS-Bot **0.2.3**。宿主侧只读取 DS-Bot 原子写入的 `state.json`；创建、改名、换模型、删除和群聊操作都走
DS-Bot 自己的同源 `POST /api/bot`。工作台绝不改写 `$DSH_HOME/bot/state.json`。

## 界面

### 科研模式

从经典工作台面板进入（`科研工作台` → `进入科研模式`）。经典侧栏、新建会话、品牌和页脚会被隐藏，科研侧栏显示：

- **首页**：任务卡、科研项目、科研助手、项目资料与本地文献。
- **科研 Skills**：上游来源管理与完整技能列表。
- **科研助手**：每个助手显示 Bot 名称、模型、工作目录和已选技能。
- **返回经典 Agent**：撤掉科研覆盖，恢复经典界面。

任务卡和「使用技能」会先询问由哪个科研助手执行，然后打开该 Bot 在 DS-Bot 中的当前对话并把任务写进输入框；
不会再创建空白工作区会话。没有助手具备所需技能时，同一个对话框提供创建入口。

窗口变窄时宿主侧栏收成竖条，右下角的**科研导航**按钮可以打开侧栏；选择目标后侧栏自动收起。

页面沿用宿主的明暗主题，正文、标题和辅助信息使用统一的字号与间距。首页集中显示四个常用任务；
Skills 页将搜索和分类筛选独立排列，「可以这样说」展开请求示例，「管理技能来源」展开来源操作。
助手卡片将模型、工作目录、已分配技能和操作区分开呈现；不可用技能的警示始终显示。
弹窗支持 Escape 关闭、Tab 焦点循环和关闭后恢复焦点，触屏输入框使用不小于 16px 的字号。

### 科研助手与技能

- 六个只读模板：文献检索与精读；选题与研究设计；数据与结果分析；论文写作与投稿；审稿与质量核验；图表与成果展示。
  合计覆盖当前 `nature-skills` 的全部可注册技能，外加 `figures4papers` 的 `scientific-figure-making`。
  研究设计模板默认提供文献检索、研究计划与社科选题技能；数据分析模板默认提供统计报告审查、数据可用性与实验记录，
  具体分析能力取决于用户添加的技能和工具。模板只决定初始技能，之后每个助手都可以自由增删；旧模板按对应的新模板读取，
  已有助手的技能选择保持不变。
- 创建时选择名称、`provider/model`、可选工作目录和技能；技能列表显示用途、来源和分类，支持搜索、筛选与勾选，
  展开后可查看示例和上游说明。模型来自 DSH 已提供的模型，经 DS-Bot 写入 Bot。
- 创建是事务式的：先记录 pending 选择，再让 DS-Bot 创建带不可见事务标记的 Bot，最后绑定角色。
  如果响应丢失，重新打开工作台会按标记找到唯一 Bot 并补完角色，不会重复创建。
- 技能只有在“角色已选、全局启用、来源存在、没有同名冲突”时才提供给模型。同名冲突会明确报告，不静默选胜者：
  两个已选来源不能有同名技能，同一来源内两条同名路径也算冲突。
- 移除角色只删除工作台的技能分配；是否删除 DS-Bot 中的 Bot 是另一个明确选项。
- 角色技能覆盖 Bot 自己的对话、历史聊天段、群成员会话与群成员历史段。provider 在每轮开始前读取 DS-Bot 已保存的
  会话归属，因此 DS-Bot 新建的群会话或聊天段在第一轮就能拿到正确目录。
- DS-Bot 缺失、版本不符或状态不可读时，角色界面显示原因并禁用创建与技能编辑；普通 Agent 不受影响。

### 经典工作台面板

- **科研项目**：所有已登记工作区的路径、会话数、资料数；「添加项目文件夹」调用宿主选择器并登记为工作区。
- **项目资料与本地文献**：按项目列出最新的 PDF、Markdown、TeX、Bib、图片与脚本；另可登记本地文献目录
  （Zotero 的 `storage` 目录也可以）。文件可系统打开、在资源管理器中定位，或带入科研助手对话。
- **科研 Skills 页**：一键订阅推荐来源，或添加任意 GitHub 仓库／本地文件夹。推荐来源包括 NatureSkills、
  figures4papers、Academic Research Skills（CC BY-NC 4.0，仅限非商业使用）、Science Superpowers
  （计算科研方法论）、Scientific Writer、Bioinformatics Skills、Drug Discovery Skills 与 book-to-skill。每个来源显示当前版本、更新状态、`检查更新`、`变更预览`、
  `更新`、`移除`；内置 NatureSkills 和 figures4papers 技能提供中文用途与示例，其他来源显示原始说明。
  每个技能也显示分类、来源、版本、共享依赖状态、启用/停用、完整上游 `SKILL.md`，以及「在会话中使用」（科研模式下可用）。
  K-Dense 的 177 技能全量库可用本地克隆注册，但仓库约 470 MB，
  不适合做一键预设。

## 上游来源按整仓保留

一个来源就是仓库的完整目录树，存放在 `$DSH_HOME/dsh-research-workbench/sources/<id>/`。不做改写、不拍平，
因为科研技能仓库通常把共享库放在同级目录、技能用相对路径引用：例如 `nature-skills` 里
`nature-writing` 引用 `../nature-shared/core/...`。技能以自身目录作为 provider 的 `resourceBase`，
所以 `../nature-shared/...` 在磁盘上照常命中。

技能列表会显示这项检查：`nature-shared ✓` 表示同级共享库存在，`✗` 表示该技能引用的库不在检出里。

### 安装与更新

- 能连 GitHub 时用 `git clone --filter=blob:none --depth=50`；更新是增量的：`git fetch`、提交列表、
  `git diff --stat`、快进合并（上游改写历史时改用 reset）。
- git 不可用时，同一版本改由 GitHub 归档包安装，更新时整树替换；两条路径都保留完整目录树。
- 归档包下载有 10 分钟预算与 100 MB 上限；下载失败不会改动任何东西，只有新目录树完整落地后才会替换旧的。
- 同一时间只允许一个同步任务（`install.lock`，支持陈旧锁恢复），并发请求返回 `423`。

## 数据目录

```
$DSH_HOME/dsh-research-workbench/
  state.json          来源、停用技能、本地文献目录
  sources/<id>/       完整的上游仓库目录树
  install.lock        同步任务的单写者锁
  roles.json          { version, pending, roles } — Bot id → 模板 + 已选技能
  roles.lock          角色编辑的单写者锁
```

DS-Bot 的数据仍在它自己的位置：默认 `$DSH_HOME/bot/state.json`，或启用中的 `ds-bot` 插件行配置的 `home`。
`$DSH_HOME` 遵循宿主规则：显式 `DSH_HOME` 优先，空白视为未设置，否则用 `~/.dsh`。

`roles.json` 损坏或版本未知时只报错并保留原文件；provider 返回空目录，绝不回退成整个来源库。

## 安装

```bash
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench
# 固定到某个提交，而不是安装时的 main 快照
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench#<sha>
# 或在源码目录中
dsh plugin --profile <profile> add /path/to/dsh-research-workbench
```

科研助手还需要同一 profile 中的 DS-Bot 0.2.3：

```bash
dsh plugin --profile <profile> add ds-bot
```

本包不在 npm 上，GitHub 仓库就是安装源；push 之后重跑这条命令才会取到新版本。

`cordis.patch.yml` 只插入一行插件记录，并带防重挂载守卫：当已有其它启用项挂载本包时自动退让，
聚合 bundle 因此不会产生重复路由。

## 安全

浏览器端不直接访问文件系统、工作区注册表或技能检出。工作台动作都走同源 JSON 接口
`/api/dsh-research-workbench`：

- POST 必须带 `bootstrap` 下发的本次启动令牌 `x-workbench-token`；
- 跨站请求与宿主自身的请求拒绝先被处理；
- 请求体有上限，错误都带稳定的业务码。

DS-Bot 适配器在宿主侧只读。创建、改名、换模型/目录、删除与群聊动作由页面调用 DS-Bot 自己的 `POST /api/bot`，
因此 DS-Bot 的锁、迁移和归档行为仍是唯一权威。工作台不模拟 DS-Bot 的界面点击，也不改写它的 localStorage。

技能隔离是“提供给模型的目录”边界，不是文件系统沙箱。Bot 本来就能读到的路径仍然可读；provider 只决定
DSH 把哪些 `SKILL.md` 作为技能提供出来。

## 开发

```bash
npm install
npm run check   # 对所有 lib 模块执行 node --check
npm test        # node --test：扫描、角色、provider 隔离、HTTP 围栏、git 更新
```

`test/workbench.test.mjs` 构造 `nature-skills` 形状的夹具（同级共享库，加深度 1 与 2 的技能），
校验扫描结果与 provider 契约，并覆盖 HTTP 路由：令牌拒绝、跨站围栏、content-type 校验、锁争用、目录浏览。

`test/roles.test.mjs` 构造 DS-Bot 形状的状态文件，覆盖角色事务与标记恢复、不同 Bot 在自聊/历史段/群会话中的隔离、
pending 标记、同名冲突、停用/移除来源、重启持久化、损坏的 `roles.json`、角色 HTTP 动作与 `roles.lock` 的 423，
并用真实本地 Git 来源验证 `applyUpdate` 后所选技能目录失效。

宿主模块：

| 模块 | 作用 |
| --- | --- |
| `lib/index.js` | 插件入口：数据根、逐 Agent 技能 provider、HTTP 路由 |
| `lib/ds-bot.js` | DS-Bot 版本/目录发现、状态读取、Session → Bot 索引 |
| `lib/research-roles.js` | `roles.json`、模板、选择评估、Session → 角色 |
| `lib/skill-sources.js` | 状态、锁、git 执行、GitHub 归档、原子目录替换 |
| `lib/skill-manager.js` | 来源安装/更新/移除、`SKILL.md` 扫描、管理目录 |
| `lib/workbench-api.js` | JSON 路由：bootstrap、角色、技能、资料、系统打开 |
| `lib/client.js` | 浏览器 bundle：科研模式、科研助手、工作台面板、Skills 页 |

## 已知边界

- DS-Bot 固定支持 0.2.3；其它版本会禁用角色界面，直到升级适配。
- GitHub 来源的安装与更新检查需要网络。
- 本地文件夹来源只原位读取，没有版本可比，因此标记为「本地目录」而不是更新状态。
- 资料列表只看根目录加一层子目录——科研项目把输入放根目录、章节放下一层。
- 上游改名不会被静默跟随。已选技能目录消失时保留选择并显示不可用，等用户选择新的技能名。
- 技能隔离只覆盖提供给模型的目录，不等于文件系统权限。

## 许可

MIT
