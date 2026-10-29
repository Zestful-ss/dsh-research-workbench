# dsh-research-workbench（DSH 科研工作台）

DeepSeek Harness（DSH）原生插件。左侧主导航新增「科研工作台」入口，把科研会话真正需要的四样东西收在一处：
正在使用的项目文件夹、已有的会话、磁盘上的文献与稿件，以及负责阅读、写作、审阅、绘图的**上游科研 Skills**。

插件不重建 DSH 已有的能力：工作区来自 `workspaceRegistry`，会话与标题来自 `sessionController` / `sessionTitle`，
文件夹选择来自 `directoryPicker`，系统打开来自会话控制器，技能目录来自 `ctx.skills`。工作台只增加入口、
上游技能来源管理和一个面向这些来源的 `ctx.skills` provider。

## 界面

**工作台面板**（左栏「科研工作台」，同时注册为设置页一项）：

- **任务卡片**：论文阅读、写作与润色、审稿与核验、科研绘图。每张卡片自动挑一个匹配的上游技能，带上当前项目里
  最新的对应文件，新建（或复用空白）会话并把 `/<skill> <指令>` 连同文件绝对路径填进输入框。`/skill` 是宿主自己的
  技能手势，下一步会自动注入技能正文。
- **科研项目**：所有已登记工作区的路径、会话数、资料数；「添加项目文件夹」直接调用宿主的文件夹选择器并登记为工作区。
- **最近会话**：实时读取宿主会话列表，点击即跳回。
- **项目资料与本地文献**：按项目列出最新的 PDF、Markdown、TeX、Bib、图片与脚本；另可登记本地文献目录
  （Zotero 的 `storage` 目录也可以）。文件可在系统程序中打开、在资源管理器中定位，或直接带入对话。

**科研 Skills 页**：

- 一键订阅推荐来源，或添加任意 GitHub 仓库／本地文件夹。
- 每个来源：当前版本、更新状态、`检查更新`、`变更预览`（当前版本 → 最新版本、待更新提交、diffstat）、`更新`、`移除`。
- 每个技能：分类、来源、版本、**共享依赖状态**、启用/停用、完整的上游 `SKILL.md`、「在会话中使用」。

## 上游来源按整仓保留

一个来源就是仓库的完整目录树，存放在 `$DSH_HOME/dsh-research-workbench/sources/<id>/`。不做改写、不拍平，
因为科研技能仓库通常把共享库放在同级目录、技能用相对路径引用：例如 `nature-skills` 里
`nature-writing` 引用 `../nature-shared/journal-profiles.md`。技能以自身目录作为 provider 的 `resourceBase`，
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
```

`$DSH_HOME` 遵循宿主规则：显式 `DSH_HOME` 优先，空白视为未设置，否则用 `~/.dsh`。

## 安装

```bash
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench
# 固定到某个提交，而不是安装时的 main 快照
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench#<sha>
# 或在源码目录中
dsh plugin --profile <profile> add /path/to/dsh-research-workbench
```

本包不在 npm 上，GitHub 仓库就是安装源；push 之后重跑这条命令才会取到新版本。

`cordis.patch.yml` 只插入一行插件记录，并带防重挂载守卫：当已有其它启用项挂载本包时自动退让，
聚合 bundle 因此不会产生重复路由。

## 安全

浏览器端不直接访问文件系统、工作区注册表或技能检出。所有动作都走同源 JSON 接口
`/api/dsh-research-workbench`：

- POST 必须带 `bootstrap` 下发的本次启动令牌 `x-workbench-token`；
- 跨站请求与宿主自身的请求拒绝先被处理；
- 请求体有上限，错误都带稳定的业务码。

宿主侧只通过 `ctx.get(...)` 读取服务，不触碰其它插件的内部实现。

## 开发

```bash
npm install
npm run check   # 对所有 lib 模块执行 node --check
npm test        # node --test：扫描、provider 契约、HTTP 围栏
```

`test/workbench.test.mjs` 构造 `nature-skills` 形状的夹具（同级共享库，加深度 1 与 2 的技能），
校验扫描结果与 provider 契约，并覆盖 HTTP 路由：令牌拒绝、跨站围栏、content-type 校验、锁争用、目录浏览。

宿主模块：

| 模块 | 作用 |
| --- | --- |
| `lib/index.js` | 插件入口：数据根、`ctx.skills` provider、HTTP 路由 |
| `lib/skill-sources.js` | 状态、锁、git 执行、GitHub 归档、原子目录替换 |
| `lib/skill-manager.js` | 来源安装/更新/移除、`SKILL.md` 扫描、provider 目录 |
| `lib/workbench-api.js` | JSON 路由：bootstrap、技能、资料、系统打开 |
| `lib/client.js` | 浏览器 bundle：导航入口、工作台面板、Skills 页 |

## 已知边界

- GitHub 来源的安装与更新检查需要网络。
- 本地文件夹来源只原位读取，没有版本可比，因此标记为「本地目录」而不是更新状态。
- 资料列表只看根目录加一层子目录——科研项目把输入放根目录、章节放下一层。
- 任务卡片打开的仍是普通 DSH 会话；停止、归档、模型选择都交给 DSH。

## 许可

MIT
