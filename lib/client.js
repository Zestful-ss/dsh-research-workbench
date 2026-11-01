globalThis.__ModuleLoader__?.load({id:'dsh-research-workbench',factory:require=>{
 const React=require('react');
 const h=React.createElement;
 const {useState,useEffect,useMemo,useCallback,useRef,useSyncExternalStore}=React;

 const NS='researchWorkbench';
 const PANEL_ID='dsh-research-workbench';
 const API='/api/dsh-research-workbench';
 const CATEGORIES=['reading','writing','review','figure','general'];

 /** Set by apply(); every component resolves host services through it lazily. */
 let boundCtx;

 const zh={
  nav:'科研工作台', title:'科研工作台',
  tabHome:'首页', tabSkills:'科研 Skills',
  refresh:'刷新', loading:'读取中…', retry:'重试', close:'关闭',
  tasksHeading:'科研任务',
  homeHeading:'继续你的研究', homeHint:'阅读文献、整理图表，或继续手头的写作。',
  skillsPageHint:'按用途查找技能，为科研助手选择合适的能力。',
  assistantsPageHint:'打开助手继续对话，或调整它的模型、目录与技能。',
  allCategories:'全部分类', allSources:'全部来源', assignedSkills:'已分配的技能', assistantSettings:'设置',
  taskReading:'论文阅读', taskReadingHint:'精读、提炼方法、实验与结论',
  taskWriting:'写作与润色', taskWritingHint:'起草、改写、翻译与术语统一',
  taskReview:'审稿与核验', taskReviewHint:'审稿视角审阅、核对引用与结论',
  taskFigure:'科研绘图', taskFigureHint:'发表级图表、配色与导出规范',
  taskSkillsCard:'科研 Skills 库',
  projects:'科研项目', projectEmpty:'还没有项目。新建一个项目文件夹，或选择已有的文件夹。',
  addProject:'＋ 添加项目文件夹', addProjectHint:'选择本地文件夹作为科研项目，项目会自动登记为 DSH 工作区。',
  newProject:'＋ 新建项目', chooseFolder:'选择已有文件夹', createProject:'创建项目', projectCreated:'项目已创建。',
  projectNewHint:'填写项目名称并选择父文件夹，工作台会创建该文件夹并登记为项目。',
  projectName:'项目名称', projectParent:'父文件夹（绝对路径）', pickParent:'选择父文件夹',
  projectPath:'项目文件夹', assistantProject:'所属项目', projectUnavailable:'项目文件夹不可用，请检查它是否仍然存在。',
  projectChanged:'项目已切换，请重新为这个任务选择项目。', projectMissing:'这个项目已不在工作区列表中。',
  projectServiceUnavailable:'宿主没有提供工作区服务，无法列出或创建项目。',
  projectSelectHint:'先选择一个科研项目，再使用任务、材料和助手。',
  projectAssistants:'项目助手', unassigned:'未分配项目', unassignedAssistants:'未分配助手',
  orphanAssistants:'原项目不可用', joinProject:'加入当前项目', leaveProject:'移出项目',
  joinTitle:'把助手加入项目', joinHint:'归属只是组织关系；工作目录决定助手默认在哪里读写文件。',
  joinSetDir:'将工作目录设为项目文件夹', joinKeepDir:'保留当前目录',
  dirUpdateFailed:'项目归属已保存，但工作目录没有改成功。', setProjectDir:'设为项目目录',
  leaveHint:'只移除项目归属，不删除 Bot、历史记录或文件，也不改变工作目录。',
  retrySetDir:'重试设置项目目录', leftProject:'已移出项目。', joinedProject:'已加入项目。',
  projectConflict:'这个助手的项目归属已改变，请刷新后重试。',
  dsBotTeamFolder:'DS-Bot 团队工作区',
  projectRooms:'包含本项目助手的群聊', roomsHint:'群聊由 DS-Bot 管理；这里列出成员包含本项目助手的群。',
  roomsEmpty:'还没有包含本项目助手的群聊。', roomsUnavailable:'读取 DS-Bot 群聊失败。',
  roomMixed:'含其他项目的助手', roomNoDir:'群未单独设置目录，成员各用各自的工作目录。',
  roomMemberDirs:'群成员使用各自的工作目录', newRoom:'＋ 新建群聊', roomName:'群聊名称',
  roomMembers:'成员（2–12 名）', roomAdmin:'管理员', roomNameTaken:'DS-Bot 中已有同名群聊，请换一个名称。',
  roomNeedMembers:'至少选择两名本项目助手。', roomCreate:'创建群聊', roomCreated:'群聊已创建。',
  roomDirFailed:'群聊已创建，但设置群目录失败，可以重试。', roomCandidates:'无法确认哪个群是刚创建的，请选择：',
  roomNoCandidate:'请在 DS-Bot 的群列表中检查，然后刷新。', roomOpenFailed:'群聊已创建，但会话列表还没显示它，稍后可重试打开。',
  openRoom:'打开群聊', confirmRoom:'这就是刚创建的群', manageInDsBot:'在 DS-Bot 中管理',
  manageInDsBotHint:'已返回 DS-Bot，请在群聊列表中打开这个群来管理成员、回复方式与权限：', retryRoomDir:'重试设置群目录',
  roomDirSet:'已把群目录设为项目文件夹。', refreshRooms:'刷新群聊',
  assistantMoved:'这个助手已不属于该项目，请刷新后重试。',
  fixedProjectHint:'这个助手会归属当前项目；工作目录默认是项目文件夹。',
  unassignedCreateHint:'从侧栏创建的助手不归属任何项目，可在项目页把它加入项目。',
  memoryNote:'项目只决定组织与默认工作目录：DS-Bot 的团队记忆仍全队共享，文件访问仍受宿主工具、审批与权限限制。',
  fieldPath:'文件夹路径', fieldTitle:'名称（可选）', add:'添加', cancel:'取消',
  sessions:'最近会话', sessionsEmpty:'还没有会话。新建会话后在这里继续。',
  searchSessions:'搜索会话标题', newSession:'新建会话',
  files:'项目资料与本地文献', filesEmpty:'这个目录下暂无科研文件（PDF、Markdown、TeX、Bib、图片、脚本）。',
  open:'打开', reveal:'定位', toChat:'带入对话', fileCount:'个文件',
  litAdd:'＋ 添加本地文献目录', litEmpty:'尚未添加本地文献目录。',
  litHint:'可直接添加本地 PDF 文件夹或 Zotero 附件目录；文件仍在原位置，不会被复制。',
  noWorkspace:'请先添加一个科研项目文件夹。', noFile:'先在项目里放入文献、稿件或数据文件。',
  skillSources:'技能来源', addSource:'＋ 添加来源', presetSources:'推荐来源',
  sourceUrl:'GitHub 仓库地址', sourceBranch:'分支', sourceLocalPath:'本地文件夹路径',
  kindGithub:'GitHub 仓库', kindLocal:'本地文件夹',
  subscribe:'一键订阅', sourceEmpty:'还没有技能来源。可以一键订阅推荐来源，或添加自己的仓库。',
  checkUpdate:'检查更新', previewChanges:'变更预览', applyUpdate:'更新', remove:'移除',
  upToDate:'最新', ahead:'个新提交', localBadge:'本地目录', revision:'版本',
  previewTitle:'变更预览', installedRev:'当前版本', latestRev:'最新版本', pendingCommits:'待更新的提交',
  diffStat:'文件变更', noUpdate:'已是最新版本，无需更新。',
  removeConfirm:'移除后不会删除本地文件，只取消登记。确认移除该来源？',
  skillsList:'技能列表', filterCategory:'分类', filterSource:'来源',
  catReading:'阅读', catWriting:'写作', catReview:'审阅', catFigure:'绘图', catGeneral:'通用',
  enable:'启用', disable:'停用', viewSkill:'用途与详情', useSkill:'在会话中使用',
  guideLocale:'zh', skillIntroTitle:'Skills 是什么？',
  skillIntro:'Skill 是助手处理某类任务时参考的操作说明。先把技能分配给助手，再在对话中描述目标。',
  skillIntroNote:'助手可按需读取已分配的技能；部分任务还需要相应工具、访问权限或外部服务。',
  skillPickerIntro:'勾选这个助手需要的技能。每项下面都有用途说明，同一技能也可以分配给多个助手。',
  skillGuideExample:'可以这样说', skillGuideDetails:'查看用途详情', manageSources:'管理技能来源',
  skillOriginalDescription:'上游原始说明', skillWhenToUse:'上游适用场景',
  skillOriginalDoc:'查看完整 SKILL.md 与文件信息', skillOriginalName:'原始名称',
  skillSourceLabel:'来源', skillPathLabel:'路径',
  shadowedBy:'同名技能已被覆盖',
  siblings:'同级文件', sharedDeps:'共享依赖', none:'无',
  needToken:'面板尚未取得令牌，请点「刷新」重试。',
  worked:'已在新会话中填入草稿，跳转后可继续编辑。',
  promptReading:'请精读这份文献：梳理研究问题、方法、主要实验与结论，并列出可以复用的方法与风险点。',
  promptWriting:'请基于以下材料起草或润色文稿段落：保持术语一致、论证链条完整，并标出需要补证据的位置。',
  promptReview:'请以审稿人的视角审阅以下稿件与参考文献：指出方法、论证、引用上的风险，并给出可执行的修改建议。',
  promptFigure:'请基于以下数据与脚本制作发表级图表：给出可直接运行的绘图代码，并说明字号、配色与导出规范。',
  promptAttach:'请阅读以下文件，并按需要继续。',
  promptFiles:'文件：',
  litDirs:'本地文献目录',
  sessionsCount:'个会话',
  draftFailed:'会话已打开，但没能把内容写入输入框，请重试。',
  searchSkills:'搜索技能名称或说明',
  skillsEmpty:'没有匹配的技能。',
  modeEnter:'进入科研模式', modeExit:'返回经典 Agent', researchNav:'科研导航',
  enterResearchHint:'经典 Agent 与 DS-Bot 仍可单独使用；科研模式只显示科研助手。',
  tabAssistants:'科研助手', assistants:'科研助手',
  assistantsEmpty:'还没有科研助手。从模板创建一个，它会作为同一个 DS-Bot 出现在团队里。',
  newAssistant:'＋ 新建科研助手', assistantName:'助手名称', assistantTemplate:'科研模板',
  assistantModel:'模型', assistantWorkDir:'工作目录（可选）', assistantSkills:'科研 Skills',
  chooseTemplate:'选择模板', chooseAssistant:'选择科研助手',
  chooseAssistantHint:'选择一个具备该技能的助手；任务会写入它的当前对话。',
  noAssistantForSkill:'没有科研助手具备这个技能。', createAssistantFirst:'创建科研助手',
  openChat:'打开对话', chatUnavailable:'该助手还没有可用对话，请先在 DS-Bot 中打开一次。',
  editSkills:'编辑技能', editSettings:'名称、模型与目录', deleteRole:'移除科研角色',
  deleteRoleHint:'只移除本工作台的角色与技能分配，不删除 DS-Bot 中的 Bot。',
  deleteBotToo:'同时删除 DS-Bot 中的 Bot（会归档其对话）', confirmRemove:'确认移除该科研角色？',
  save:'保存', create:'创建', creating:'正在创建…', saved:'已保存', cancelPending:'放弃创建',
  modelRequired:'请选择一个模型。', modelsEmpty:'DS-Bot 没有可用模型，请先在 DSH 中配置模型。',
  skillsEmptySelected:'尚未选择技能。', skillUnavailable:'不可用', skillDisabled:'已停用',
  skillMissing:'来源或技能不存在', skillConflict:'同名技能冲突',
  skillDuplicate:'同一来源有多个同名技能', skillSourceMissing:'来源已移除',
  unavailableSkills:'保留但暂不可用', conflictHint:'同名技能只能保留一个来源；请移除其中一个。',
  pendingTitle:'有未完成的科研助手创建', pendingConflict:'多个 Bot 匹配同一创建事务，请先处理重复项。',
  pendingHint:'若 DS-Bot 中已有匹配的 Bot，会在这里自动补全；否则可重试创建。',
  retryCreate:'重试创建', pendingRetryReady:'DS-Bot 中还没有匹配的 Bot，可直接重试。',
  dsBotUnavailable:'DS-Bot 不可用或版本不兼容', dsBotVersion:'需要 DS-Bot {version}。',
  roleConfigError:'科研角色配置错误', roleMissingBot:'DS-Bot 中已不存在该 Bot',
  roleSkillsPlaceholder:'搜索技能名称或说明', roleNoMatch:'没有匹配的科研助手。',
  roleCreateHint:'模板只决定初始技能；之后可自由增删。', workDirPick:'选择文件夹',
  currentChat:'当前对话', skillsCount:'个技能', assistantCreated:'科研助手已创建。',
  assistantRemoved:'科研角色已移除。', botDeleted:'DS-Bot 中的 Bot 已删除。',
  pendingCancelled:'未完成的创建已取消。', roleLiterature:'文献检索与精读',
  roleLiteratureHint:'检索、精读、文献卡片与论文翻译', roleDesign:'选题与研究设计',
  roleDesignHint:'文献检索、研究计划与社科选题论证', roleAnalysis:'数据与结果分析',
  roleAnalysisHint:'统计报告审查、数据可用性与实验记录', roleWriting:'论文写作与投稿',
  roleWritingHint:'论文写作、润色、翻译与 Word 排版', roleReview:'审稿与质量核验',
  roleReviewHint:'审稿回复、引用核验与统计数据审查', roleFigure:'图表与成果展示',
  roleFigureHint:'科研图表、论文汇报、图片转 PPT 与专利草稿',
 };

 const en={
  nav:'Workbench', title:'Research Workbench',
  tabHome:'Home', tabSkills:'Research Skills',
  refresh:'Refresh', loading:'Loading…', retry:'Retry', close:'Close',
  tasksHeading:'Research tasks',
  homeHeading:'Continue your research', homeHint:'Read a paper, prepare a figure, or pick up your writing.',
  skillsPageHint:'Find Skills by purpose and choose what your research assistants need.',
  assistantsPageHint:'Continue a conversation or adjust an assistant’s model, folder, and Skills.',
  allCategories:'All categories', allSources:'All sources', assignedSkills:'Assigned Skills', assistantSettings:'Settings',
  taskReading:'Read a paper', taskReadingHint:'Close read: method, experiments, conclusions',
  taskWriting:'Write and polish', taskWritingHint:'Draft, rewrite, translate, unify terms',
  taskReview:'Review and verify', taskReviewHint:'Reviewer view, check citations and claims',
  taskFigure:'Make figures', taskFigureHint:'Publication figures, palette, export rules',
  taskSkillsCard:'Research Skills',
  projects:'Projects', projectEmpty:'No project yet. Create a project folder or choose an existing one.',
  addProject:'+ Add project folder', addProjectHint:'Pick a local folder; it is registered as a DSH workspace.',
  newProject:'+ New project', chooseFolder:'Choose existing folder', createProject:'Create project', projectCreated:'Project created.',
  projectNewHint:'Name the project and pick a parent folder; the workbench creates it and registers the project.',
  projectName:'Project name', projectParent:'Parent folder (absolute path)', pickParent:'Choose parent folder',
  projectPath:'Project folder', assistantProject:'Project', projectUnavailable:'The project folder is unavailable; check that it still exists.',
  projectChanged:'The project changed; pick the project for this task again.', projectMissing:'This project is no longer in the workspace list.',
  projectServiceUnavailable:'The host offers no workspace service, so projects cannot be listed or created.',
  projectSelectHint:'Choose a research project before using tasks, materials and assistants.',
  projectAssistants:'Project assistants', unassigned:'No project', unassignedAssistants:'Unassigned assistants',
  orphanAssistants:'Original project unavailable', joinProject:'Add to this project', leaveProject:'Remove from project',
  joinTitle:'Add the assistant to this project', joinHint:'Ownership is organisational; the working folder decides where the assistant reads and writes by default.',
  joinSetDir:'Set the working folder to the project folder', joinKeepDir:'Keep the current folder',
  dirUpdateFailed:'Ownership was saved, but the working folder was not changed.', setProjectDir:'Use project folder',
  leaveHint:'Only the project link is removed; the Bot, its history and its files stay, and the working folder is unchanged.',
  retrySetDir:'Retry setting the project folder', leftProject:'Removed from the project.', joinedProject:'Added to the project.',
  projectConflict:'This assistant’s project changed; refresh and retry.',
  dsBotTeamFolder:'DS-Bot team workspace',
  projectRooms:'Group chats with this project’s assistants', roomsHint:'Group chats live in DS-Bot; these are the groups whose members include this project’s assistants.',
  roomsEmpty:'No group chat includes this project’s assistants yet.', roomsUnavailable:'Could not read the DS-Bot group chats.',
  roomMixed:'includes other projects’ assistants', roomNoDir:'This group sets no folder; each member uses its own working folder.',
  roomMemberDirs:'Members use their own working folders', newRoom:'+ New group chat', roomName:'Group name',
  roomMembers:'Members (2–12)', roomAdmin:'Admin', roomNameTaken:'DS-Bot already has a group with this name; pick another.',
  roomNeedMembers:'Choose at least two assistants from this project.', roomCreate:'Create group chat', roomCreated:'Group chat created.',
  roomDirFailed:'The group was created, but setting its folder failed; you can retry.', roomCandidates:'The response was lost; confirm which group was created:',
  roomNoCandidate:'Check the group list in DS-Bot, then refresh.', roomOpenFailed:'The group exists but is not listed yet; retry opening it later.',
  openRoom:'Open group chat', confirmRoom:'This is the group just created', manageInDsBot:'Manage in DS-Bot',
  manageInDsBotHint:'Back in DS-Bot: open this group in the group list to manage members, reply mode and permissions:', retryRoomDir:'Retry group folder',
  roomDirSet:'The group now works in the project folder.', refreshRooms:'Refresh groups',
  assistantMoved:'This assistant no longer belongs to the project; refresh and retry.',
  fixedProjectHint:'This assistant belongs to the current project; its working folder defaults to the project folder.',
  unassignedCreateHint:'An assistant created from the sidebar belongs to no project; add it to one from the project page.',
  memoryNote:'A project only organises assistants and sets a default folder: DS-Bot team memory stays shared, and file access still follows host tools, approvals and permissions.',
  fieldPath:'Folder path', fieldTitle:'Name (optional)', add:'Add', cancel:'Cancel',
  sessions:'Recent sessions', sessionsEmpty:'No sessions yet. Start one and continue here.',
  searchSessions:'Search session titles', newSession:'New session',
  files:'Materials and local literature', filesEmpty:'No research files here (PDF, Markdown, TeX, Bib, images, scripts).',
  open:'Open', reveal:'Reveal', toChat:'Send to chat', fileCount:'files',
  litAdd:'+ Add literature folder', litEmpty:'No literature folder yet.',
  litHint:'Add a local PDF folder or the Zotero attachment store; files stay where they are.',
  noWorkspace:'Add a research project folder first.', noFile:'Put a paper, draft, or data file in the project first.',
  skillSources:'Skill sources', addSource:'+ Add source', presetSources:'Suggested sources',
  sourceUrl:'GitHub repository URL', sourceBranch:'Branch', sourceLocalPath:'Local folder path',
  kindGithub:'GitHub repository', kindLocal:'Local folder',
  subscribe:'Subscribe', sourceEmpty:'No skill source yet. Subscribe to a suggestion or add your own repository.',
  checkUpdate:'Check', previewChanges:'Preview', applyUpdate:'Update', remove:'Remove',
  upToDate:'Up to date', ahead:'new commits', localBadge:'Local folder', revision:'Revision',
  previewTitle:'Update preview', installedRev:'Installed', latestRev:'Latest', pendingCommits:'Pending commits',
  diffStat:'File changes', noUpdate:'Already up to date.',
  removeConfirm:'Removing a source only unregisters it; local files stay. Remove this source?',
  skillsList:'Skills', filterCategory:'Category', filterSource:'Source',
  catReading:'Reading', catWriting:'Writing', catReview:'Review', catFigure:'Figures', catGeneral:'General',
  enable:'Enable', disable:'Disable', viewSkill:'Purpose and details', useSkill:'Use in session',
  guideLocale:'en', skillIntroTitle:'What are Skills?',
  skillIntro:'A Skill gives an assistant instructions for a kind of task. Assign it to an assistant, then describe your goal in chat.',
  skillIntroNote:'The assistant can load assigned Skills when needed; some tasks also require tools, access permissions, or external services.',
  skillPickerIntro:'Choose the Skills this assistant needs. Each item explains its purpose, and a Skill can be shared by several assistants.',
  skillGuideExample:'Example request', skillGuideDetails:'View usage details', manageSources:'Manage skill sources',
  skillOriginalDescription:'Original upstream description', skillWhenToUse:'Upstream usage guidance',
  skillOriginalDoc:'View full SKILL.md and file information', skillOriginalName:'Original name',
  skillSourceLabel:'Source', skillPathLabel:'Path',
  shadowedBy:'Shadowed by an earlier source',
  siblings:'Neighbour files', sharedDeps:'Shared dependencies', none:'none',
  needToken:'The panel has no token yet. Press Refresh.',
  worked:'Draft is in a new session; edit it after the jump.',
  promptReading:'Read this paper closely: state the problem, method, key experiments and conclusions, and list reusable methods and risks.',
  promptWriting:'Draft or polish the passage below: keep terminology consistent, keep the argument whole, and mark where evidence is missing.',
  promptReview:'Review the manuscript and bibliography as a referee: name risks in method, argument and citations, and give actionable fixes.',
  promptFigure:'Produce a publication figure from the data and scripts below: give runnable plotting code plus font, palette and export rules.',
  promptAttach:'Read these files and continue as needed.',
  promptFiles:'Files:',
  litDirs:'Literature folders',
  sessionsCount:'sessions',
  draftFailed:'The session opened, but the draft could not be placed; try again.',
  searchSkills:'Search skill name or summary',
  skillsEmpty:'No matching skill.',
  modeEnter:'Enter research mode', modeExit:'Back to classic Agent', researchNav:'Research navigation',
  enterResearchHint:'Classic Agent and DS-Bot stay usable on their own; research mode shows only research assistants.',
  tabAssistants:'Research assistants', assistants:'Research assistants',
  assistantsEmpty:'No research assistant yet. Create one from a template; it is the same DS-Bot in the team.',
  newAssistant:'+ New research assistant', assistantName:'Assistant name', assistantTemplate:'Research template',
  assistantModel:'Model', assistantWorkDir:'Working folder (optional)', assistantSkills:'Research skills',
  chooseTemplate:'Choose a template', chooseAssistant:'Choose a research assistant',
  chooseAssistantHint:'Pick an assistant with this skill; the task is written into its current chat.',
  noAssistantForSkill:'No research assistant has this skill.', createAssistantFirst:'Create a research assistant',
  openChat:'Open chat', chatUnavailable:'This assistant has no open chat yet; open it once in DS-Bot.',
  editSkills:'Edit skills', editSettings:'Name, model and folder', deleteRole:'Remove research role',
  deleteRoleHint:'Only this workbench role and its skill selection are removed; the DS-Bot stays.',
  deleteBotToo:'Also delete the Bot in DS-Bot (its chats are archived)', confirmRemove:'Remove this research role?',
  save:'Save', create:'Create', creating:'Creating…', saved:'Saved', cancelPending:'Cancel creation',
  modelRequired:'Choose a model.', modelsEmpty:'DS-Bot has no available model; configure one in DSH first.',
  skillsEmptySelected:'No skill selected yet.', skillUnavailable:'Unavailable', skillDisabled:'Disabled',
  skillMissing:'Source or skill missing', skillConflict:'Same skill name conflict',
  skillDuplicate:'Several same-name skills in one source', skillSourceMissing:'Source removed',
  unavailableSkills:'Kept but unavailable', conflictHint:'One skill name may come from one source only; remove one.',
  pendingTitle:'An unfinished research assistant creation', pendingConflict:'Several Bots match one creation; resolve the duplicates first.',
  pendingHint:'A matching Bot in DS-Bot is completed automatically; otherwise retry the creation.',
  retryCreate:'Retry creation', pendingRetryReady:'No matching Bot in DS-Bot yet; retry when ready.',
  dsBotUnavailable:'DS-Bot unavailable or incompatible', dsBotVersion:'DS-Bot {version} is required.',
  roleConfigError:'Research role configuration error', roleMissingBot:'This Bot no longer exists in DS-Bot',
  roleSkillsPlaceholder:'Search skill name or summary', roleNoMatch:'No matching research assistant.',
  roleCreateHint:'A template only sets the initial skills; add or remove them afterwards.', workDirPick:'Choose folder',
  currentChat:'Current chat', skillsCount:'skills', assistantCreated:'Research assistant created.',
  assistantRemoved:'Research role removed.', botDeleted:'The Bot was deleted in DS-Bot.',
  pendingCancelled:'The unfinished creation was cancelled.', roleLiterature:'Literature search and reading',
  roleLiteratureHint:'Search, close reading, paper notes and translation', roleDesign:'Research questions and design',
  roleDesignHint:'Literature search, research proposals and social-science topics', roleAnalysis:'Data and results analysis',
  roleAnalysisHint:'Statistical reporting review, data availability and experiment logs', roleWriting:'Paper writing and submission',
  roleWritingHint:'Drafting, polishing, translation and Word formatting', roleReview:'Review and quality checks',
  roleReviewHint:'Reviewer responses, citation and statistical checks', roleFigure:'Figures and research presentation',
  roleFigureHint:'Research figures, presentations, image-to-PPT and patent drafts',
 };

 // Plain-language guides for the currently bundled research sources. Other
 // sources keep their own descriptions; their capabilities are never guessed.
 const SKILL_GUIDES={
  'nature-skills/nature-academic-search':{
   zh:['文献检索','按主题跨来源查找文献、核验引文并制定检索策略。','查找近五年关于这个课题的综述，并列出来源和 DOI。'],
   en:['Literature search','Find papers across sources, verify citations, and plan a search strategy.','Find recent reviews on this topic and list their sources and DOIs.'],
  },
  'nature-skills/nature-citation':{
   zh:['Nature 系列引文','为论文中的论点寻找并核对 Nature／CNS 系列支撑文献。','为这段结论寻找 Nature 系列引文，并标明各文献支持哪句话。'],
   en:['Nature-family citations','Find and verify Nature or CNS-family references for specific manuscript claims.','Find Nature-family sources for this paragraph and map each claim to a source.'],
  },
  'nature-skills/nature-data':{
   zh:['数据共享与可用性','整理数据存放、访问和引用方式，起草或审查数据可用性声明；不负责数据清洗。','检查这篇论文的数据可用性声明，指出缺少哪些访问信息。'],
   en:['Data availability','Plan dataset access and citations, or review a data availability statement; this is not data cleaning.','Review this data availability statement and identify missing access details.'],
  },
  'nature-skills/nature-downloader':{
   zh:['获取论文全文','通过开放获取、机构授权或出版商接口查找论文及补充材料。','尝试通过开放获取或学校授权获取这篇论文和补充材料。'],
   en:['Get paper full text','Find lawful full text and supplements through open access, institutional access, or publisher APIs.','Look for an open-access or institutionally available copy of this paper and its supplements.'],
  },
  'nature-skills/nature-experiment-log':{
   zh:['实验日志整理','把提供的文字、图片或语音记录整理成结构化实验日志。','根据这些实验记录整理实验条件、结果和待确认的信息。'],
   en:['Experiment logs','Turn supplied text, images, or voice notes into a structured experiment log.','Organize these notes into experimental conditions, results, and points to confirm.'],
  },
  'nature-skills/nature-figure':{
   zh:['论文图表制作','使用 Python 或 R 制作、修改和检查论文图表，并按投稿要求导出。','根据这份数据制作多面板论文图，并检查字号与导出格式。'],
   en:['Scientific figures','Create, revise, and audit manuscript figures in Python or R, then export them for submission.','Make a multi-panel figure from these data and check fonts and export formats.'],
  },
  'nature-skills/nature-image2ppt':{
   zh:['图片还原为 PPT','将幻灯片截图、图片或扫描页重建成可编辑的 PowerPoint 元素。','把这张幻灯片截图还原成可编辑的 PPT。'],
   en:['Image to editable slides','Reconstruct a slide image or scanned page as editable PowerPoint objects.','Rebuild this slide screenshot as an editable PowerPoint slide.'],
  },
  'nature-skills/nature-literature-pipeline':{
   zh:['文献整理流程','串联文献检索、筛选、阅读和归档；定时推送需要额外配置。','按这个研究方向检索并筛选文献，整理摘要和归档清单。'],
   en:['Literature workflow','Combine paper discovery, screening, reading, and archiving; scheduled delivery needs additional setup.','Find and screen papers on this topic, then organize a digest and archive list.'],
  },
  'nature-skills/nature-paper-card':{
   zh:['论文精读卡','为一篇论文整理研究问题、方法、证据、局限与可借鉴的思路。','把这篇论文整理成精读卡，重点说明方法、证据和局限。'],
   en:['Paper reading card','Make a structured card for one paper covering its question, methods, evidence, limitations, and ideas.','Create a reading card for this paper, emphasizing its methods, evidence, and limits.'],
  },
  'nature-skills/nature-paper-to-patent':{
   zh:['论文转专利草稿','根据论文和发明材料整理中国发明专利草稿或技术交底书。','根据这篇论文和发明说明起草中文技术交底书。'],
   en:['Paper to patent draft','Use a paper and inventor materials to prepare a Chinese patent draft or technical disclosure.','Draft a Chinese technical disclosure from this paper and inventor notes.'],
  },
  'nature-skills/nature-paper-trans':{
   zh:['论文翻译（PDF）','将英文论文的全文或指定页翻译为尽量保留版式的中文图片型 PDF，需要图像生成能力。','把这篇英文论文的第 1 至 5 页翻译为中文 PDF，保留图表和公式。'],
   en:['Translate a paper PDF','Translate selected pages or an English paper into a layout-preserving Chinese image PDF; image generation is required.','Translate pages 1–5 of this paper into a Chinese PDF while preserving figures and equations.'],
  },
  'nature-skills/nature-paper-xray':{
   zh:['论文深度拆解','围绕一篇论文拆解研究思路、关键设计、公式和证据边界。','讲透这篇论文为什么这样设计，并用小例子解释关键公式。'],
   en:['Deep paper analysis','Reconstruct the reasoning, key design choices, formulas, and evidence limits of one paper.','Explain why this paper chose its design and illustrate the key formula with a small example.'],
  },
  'nature-skills/nature-paper2ppt':{
   zh:['论文汇报 PPT','根据论文或读书笔记制作中文学术汇报 PPT，可整理原文图片和讲稿备注。','根据这篇论文制作组会汇报 PPT，包含方法、结果和讲稿备注。'],
   en:['Paper presentation','Create a Chinese academic slide deck from a paper or reading notes, with figures and speaker notes.','Turn this paper into a group-meeting deck with methods, results, and speaker notes.'],
  },
  'nature-skills/nature-paper2word':{
   zh:['论文排版为 Word','将 Markdown 论文排版为 Word，支持公式、表格和参考文献；需要 md-to-word 工具。','把这份 Markdown 论文按目标期刊要求导出为 Word。'],
   en:['Manuscript to Word','Format a Markdown manuscript as Word with equations, tables, and references; the md-to-word tool is required.','Export this Markdown manuscript to Word using the target journal format.'],
  },
  'nature-skills/nature-polishing':{
   zh:['论文润色与翻译','润色、翻译或精简已有学术文本，保留原有事实和术语。','润色这段英文论文，保持原意并统一术语。'],
   en:['Polish and translate','Polish, translate, or shorten existing academic text while preserving facts and terminology.','Polish this manuscript paragraph without changing its meaning.'],
  },
  'nature-skills/researchwrite':{
   zh:['研究计划与开题','基于已有证据起草、修改或审查研究计划、开题报告和项目申请。','根据这些文献和研究目标，梳理开题报告的研究问题与方法。'],
   en:['Research proposals','Draft, revise, or audit research plans and proposals using the evidence supplied.','Use these papers and goals to outline the research questions and methods for a proposal.'],
  },
  'nature-skills/nature-reader':{
   zh:['论文对照阅读','围绕原文阅读论文，可整理中英文对照、图表、公式和指定问题。','阅读这篇论文的结果部分，结合原文和图表解释主要发现。'],
   en:['Source-grounded paper reader','Read a paper with source-linked text, figures, equations, or Chinese–English comparisons.','Explain the results section using the source text and figures.'],
  },
  'nature-skills/nature-ref-verifier':{
   zh:['参考文献核验','逐条核对参考文献的作者、标题、年份和 DOI，标记不一致。','核对这份参考文献表，标出作者、年份或 DOI 有疑问的条目。'],
   en:['Reference verification','Cross-check reference authors, titles, years, and DOIs and flag inconsistencies.','Check this bibliography and flag entries with questionable authors, years, or DOIs.'],
  },
  'nature-skills/nature-response':{
   zh:['审稿意见回复','根据审稿意见和修改内容起草或检查逐条回复、返修信和修订说明。','根据审稿意见和我的修改记录，起草逐条回复。'],
   en:['Reviewer responses','Draft or audit point-by-point replies, revision letters, and manuscript revision notes.','Draft a point-by-point reply using these reviewer comments and my revision notes.'],
  },
  'nature-skills/nature-reviewer':{
   zh:['投稿前模拟审稿','从审稿人视角检查稿件的意义、方法、证据和主要问题。','模拟审稿这篇稿件，区分主要问题与次要问题。'],
   en:['Mock peer review','Review a manuscript from a referee perspective, covering significance, methods, evidence, and concerns.','Review this manuscript and separate major concerns from minor ones.'],
  },
  'nature-skills/nature-social-science':{
   zh:['社科选题与论证','帮助社会科学及相邻学科梳理选题、文献、证据路线和论文论证。','把这个宽泛的社科兴趣整理成研究问题，并分析可行性。'],
   en:['Social-science research design','Develop topics, literature maps, evidence plans, and arguments for social science and related fields.','Turn this broad social-science interest into research questions and assess feasibility.'],
  },
  'nature-skills/nature-statistics':{
   zh:['统计报告审查','检查统计方法、实验单位、重复次数和图注；提供数据并明确要求时可辅助重新分析。','检查论文方法和图注中的样本量、统计检验及不确定性说明。'],
   en:['Statistical reporting review','Check statistical methods, experimental units, replication, and figure legends; reanalysis requires data and a request.','Review the sample sizes, statistical tests, and uncertainty reported in these methods and figures.'],
  },
  'nature-skills/nature-writing':{
   zh:['论文写作与论证','根据作者提供的证据起草或重组论文段落、章节及首次投稿材料。','根据这些结果和文献，起草结果段落并标出需要补充的证据。'],
   en:['Manuscript writing','Draft or restructure manuscript sections and initial submission materials from supplied evidence.','Draft a results section from these findings and mark claims needing more evidence.'],
  },
  'figures4papers/scientific-figure-making':{
   zh:['Matplotlib 发表图','使用 Matplotlib 制作适合论文和报告的图表，包含多面板与矢量导出。','用这份数据制作可投稿的 Matplotlib 图，并导出矢量文件。'],
   en:['Publication figures with Matplotlib','Create paper and report figures with Matplotlib, including multi-panel layouts and vector export.','Make a publication-ready Matplotlib figure from these data and export it as a vector file.'],
  },
 };

 function skillGuide(t,row){
  const guide=SKILL_GUIDES[`${row.sourceId}/${row.name}`]?.[t('guideLocale')==='zh'?'zh':'en'];
  if(guide===undefined)return {title:row.name,summary:String(row.description??''),example:undefined,curated:false};
  return {title:guide[0],summary:guide[1],example:guide[2],curated:true};
 }

 function matchesSkill(t,row,needle){
  const guide=skillGuide(t,row);
  return [row.name,row.description,row.whenToUse,row.sourceTitle,guide.title,guide.summary,guide.example]
   .some(value=>String(value??'').toLowerCase().includes(needle));
 }

 const css=`
 .rw-root,.rw-side{--rw-bg:var(--dsw-alias-bg-base,#fcfcfc);--rw-surface:var(--dsw-alias-bg-layer-1,#fff);--rw-ink:var(--dsw-alias-label-primary,#141414);--rw-muted:var(--dsw-alias-label-secondary,#61666b);--rw-line:var(--dsw-alias-border-l2,rgba(128,128,128,.2));--rw-hover:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08));--rw-active:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.14));--rw-accent:var(--dsw-alias-state-business-primary,#4176e6);--rw-accent-bg:var(--dsw-alias-state-business-tertiary,#e4edfd);--rw-danger:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ec1313) 75%,var(--rw-ink));--rw-warning:color-mix(in srgb,var(--dsw-alias-state-warn-label,#dd8629) 70%,var(--rw-ink))}
 .rw-root{height:100%;min-height:0;display:flex;flex-direction:column;font-family:inherit;font-size:var(--dsw-font-s-14-font-size,14px);line-height:1.6;color:var(--rw-ink);background:var(--rw-bg);container-type:inline-size}
 .rw-root *,.rw-side *{box-sizing:border-box}
 .rw-root :is(b,strong){font-weight:500}
 .rw-bar,.rw-mainbar{display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--rw-line);background:var(--rw-surface);flex:none;flex-wrap:wrap;min-height:64px}
 .rw-title{font-size:var(--dsw-font-s-14-font-size,14px);font-weight:500}
 .rw-crumb{color:var(--rw-muted);font-size:var(--dsw-font-xs-13-font-size,13px);border-left:1px solid var(--rw-line);padding-left:12px}
 .rw-tabs{display:flex;gap:4px;padding:3px;background:var(--rw-hover);border-radius:var(--dsw-radius-sm,8px)}
 .rw-spacer{flex:1}
 .rw-root button{font:inherit;font-size:var(--dsw-font-xs-13-font-size,13px);line-height:20px;border:1px solid var(--rw-line);background:var(--rw-surface);color:inherit;border-radius:var(--dsw-radius-sm,8px);padding:7px 12px;cursor:pointer;white-space:nowrap;min-height:36px}
 .rw-root button:disabled,.rw-side button:disabled{opacity:.45;cursor:default}
 .rw-root button.rw-primary{background:var(--dsw-alias-button-primary-fill,#0f1115);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
 .rw-root button.ghost{border-color:transparent;background:transparent}
 .rw-root button.rw-tab{border:none;background:transparent;color:var(--rw-muted);min-height:32px;padding:5px 12px}
 .rw-root button.rw-tab.on{background:var(--rw-surface);color:var(--rw-ink)}
 .rw-root :is(button,input,select,summary):focus-visible,.rw-side button:focus-visible{outline:2px solid var(--rw-accent);outline-offset:3px}
 .rw-root button:active:not(:disabled),.rw-side button:active:not(:disabled){transform:scale(.98)}
 .rw-root :is(input,select){font:inherit;font-size:var(--dsw-font-xs-13-font-size,13px);color:inherit;background:var(--rw-surface);border:1px solid var(--rw-line);border-radius:var(--dsw-radius-sm,8px);padding:8px 10px;min-height:38px;min-width:0}
 .rw-root input::placeholder{color:var(--rw-muted);opacity:.8}
 .rw-body{flex:1;min-height:0;overflow:auto;padding:32px clamp(20px,4cqi,56px) 48px;display:flex;flex-direction:column;gap:28px;scrollbar-gutter:stable}
 .rw-body>:not(.rw-mask){flex:0 0 auto;width:100%;max-width:1120px;margin-inline:auto}
 .rw-page-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
 .rw-page-heading h1{font-size:var(--dsw-font-xl-24-font-size,24px);line-height:1.35;letter-spacing:-.025em;font-weight:500;margin:0 0 8px;overflow-wrap:anywhere}
 .rw-page-heading p{margin:0;color:var(--rw-muted);max-width:70ch}
 .rw-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
 .rw-h{font-size:var(--dsw-font-base-16-font-size,16px);line-height:1.5;font-weight:500;color:var(--rw-ink);margin:0}
 .rw-section-count{font-size:var(--dsw-font-xxs-12-font-size,12px);font-weight:400;color:var(--rw-muted);margin-left:8px}
 .rw-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr));gap:12px}
 .rw-root .rw-card{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0;text-align:left;white-space:normal;overflow-wrap:anywhere;padding:18px;border-radius:var(--dsw-radius-md,12px);background:var(--rw-surface)}
 .rw-card b{font-size:var(--dsw-font-s-14-font-size,14px);font-weight:500;line-height:1.5}
 .rw-card span{color:var(--rw-muted);font-size:var(--dsw-font-xs-13-font-size,13px);white-space:normal;line-height:1.55}
 .rw-tasks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
 .rw-root .rw-task{display:flex;flex-direction:column;gap:10px;align-items:flex-start;min-height:116px;min-width:0;padding:20px;text-align:left;white-space:normal;border:1px solid var(--rw-line);background:var(--rw-surface);border-radius:var(--dsw-radius-md,12px)}
 .rw-task b{font-size:var(--dsw-font-base-16-font-size,16px);line-height:1.4}
 .rw-task span{font-size:var(--dsw-font-xs-13-font-size,13px);color:var(--rw-muted);line-height:1.55}
 .rw-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
 .rw-cols>*{min-width:0}
 .rw-panel{border:1px solid var(--rw-line);border-radius:var(--dsw-radius-md,12px);padding:20px;display:flex;flex-direction:column;gap:16px;flex:none;min-width:0;overflow-wrap:anywhere;background:var(--rw-surface)}
 .rw-row{display:flex;align-items:center;gap:12px;padding:12px 10px;border-radius:var(--dsw-radius-sm,8px);min-width:0}
 .rw-row .grow{flex:1;min-width:0}
 .rw-row.on{background:var(--rw-active)}
 .rw-root button.rw-row-select{display:block;flex:1;min-width:0;text-align:left;border:none;padding:0;background:transparent;white-space:normal}
 .rw-name{display:block;font-size:var(--dsw-font-s-14-font-size,14px);font-weight:500;overflow-wrap:anywhere}
 .rw-sub{display:block;color:var(--rw-muted);font-size:var(--dsw-font-xxs-12-font-size,12px);line-height:1.6;overflow-wrap:anywhere;margin-top:3px}
 .rw-act{display:flex;gap:4px;flex:none;flex-wrap:wrap;align-items:center}
 .rw-note{color:var(--rw-muted);font-size:var(--dsw-font-xs-13-font-size,13px);line-height:1.65}
 .rw-empty{color:var(--rw-muted);font-size:var(--dsw-font-xs-13-font-size,13px);line-height:1.75;padding:24px 12px;background:var(--rw-bg);border-radius:var(--dsw-radius-sm,8px)}
 .rw-badge{display:inline-flex;align-items:center;gap:5px;font-size:var(--dsw-font-xxs-12-font-size,12px);line-height:1.6;padding:3px 8px;border-radius:var(--dsw-radius-xs,4px);background:var(--rw-hover);color:var(--rw-muted);max-width:100%;overflow-wrap:anywhere;white-space:normal}
 .rw-badge.ok::before{content:'●';color:var(--dsw-alias-state-success-primary,#22c55e);font-size:8px;flex:none}
 .rw-badge.warn{color:var(--rw-warning);background:var(--dsw-alias-state-warn-tertiary,transparent)}
 .rw-badge.err{color:var(--rw-danger)}
 .rw-badge.dot::before{content:'●';font-size:8px}
 .rw-error{color:var(--rw-danger);border:1px solid currentColor;border-radius:var(--dsw-radius-sm,8px);padding:12px 16px;font-size:var(--dsw-font-xs-13-font-size,13px)}
 .rw-ok{color:var(--rw-ink);font-size:var(--dsw-font-xs-13-font-size,13px)}
 .rw-form{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
 .rw-form input[type=text]{flex:1;min-width:min(180px,100%)}
 .rw-chiprow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-width:0}
 .rw-guide-intro,.rw-source-disclosure{border:1px solid var(--rw-line);border-radius:var(--dsw-radius-md,12px);background:var(--rw-surface)}
 .rw-guide-intro>summary,.rw-source-disclosure>summary{padding:14px 18px;font-size:var(--dsw-font-xs-13-font-size,13px);cursor:pointer;font-weight:500}
 .rw-guide-intro p{margin:0;padding:0 18px 14px;line-height:1.65;color:var(--rw-muted);max-width:80ch}
 .rw-source-disclosure>.rw-panel{border:0;border-top:1px solid var(--rw-line);border-radius:0;background:transparent}
 .rw-guide-example{font-size:var(--dsw-font-xs-13-font-size,13px);line-height:1.65;color:var(--rw-muted);overflow-wrap:anywhere}
 .rw-guide-original{font-size:var(--dsw-font-xs-13-font-size,13px);line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--rw-muted)}
 .rw-guide-details>summary,.rw-pick-more>summary{cursor:pointer;color:var(--rw-muted);font-size:var(--dsw-font-xs-13-font-size,13px);padding-block:4px}
 .rw-guide-details p,.rw-pick-more p{margin:8px 0;white-space:pre-wrap;overflow-wrap:anywhere}
 .rw-skill-id{display:block;font-size:var(--dsw-font-xxs-12-font-size,12px);line-height:1.5;color:var(--rw-muted);overflow-wrap:anywhere;margin-top:3px}
 .rw-filters{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:18px 20px;background:var(--rw-surface);border:1px solid var(--rw-line);border-radius:var(--dsw-radius-md,12px)}
 .rw-filter-field{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1}
 .rw-filter-field>span{font-size:var(--dsw-font-xxs-12-font-size,12px);color:var(--rw-muted)}
 .rw-support{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
 .rw-support>details[open]{grid-column:1/-1}
 .rw-filter-field.search{flex:2}
 .rw-catalog{display:flex;flex-direction:column;gap:16px}
 .rw-skill{border-bottom:1px solid var(--rw-line);padding:22px 0;display:flex;gap:24px;align-items:flex-start}
 .rw-skill:first-child{padding-top:8px}
 .rw-skill .grow{flex:1;min-width:0;max-width:78ch}
 .rw-skill h3{font-size:var(--dsw-font-base-16-font-size,16px);font-weight:500;line-height:1.5;margin:0}
 .rw-skill .desc{color:var(--rw-muted);font-size:var(--dsw-font-s-14-font-size,14px);line-height:1.7;margin:10px 0}
 .rw-skill .use{display:flex;flex-direction:column;gap:6px;flex:none;margin-left:auto;align-items:stretch}
 .rw-skill .rw-chiprow{margin-top:12px}
 .rw-skill-more{margin-top:10px}
 .rw-skill-more summary{font-size:var(--dsw-font-xs-13-font-size,13px);color:var(--rw-muted);cursor:pointer;padding:3px 0}
 .rw-skill-more p{margin:6px 0 0}
 .rw-mask{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-3,rgba(0,0,0,.42));display:flex;align-items:center;justify-content:center;padding:24px;z-index:60}
 .rw-dialog{background:var(--rw-surface);color:var(--rw-ink);border-radius:var(--dsw-radius-lg,16px);border:1px solid var(--rw-line);display:flex;flex-direction:column;width:640px;max-width:100%;max-height:100%;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,.18)}
 .rw-dialog[aria-modal=true]{outline:none}
 .rw-dialog header{display:flex;align-items:center;gap:16px;padding:18px 24px;border-bottom:1px solid var(--rw-line)}
 .rw-dialog header b{font-size:var(--dsw-font-base-16-font-size,16px);line-height:1.5;overflow-wrap:anywhere}
 .rw-dialog .content{padding:24px;overflow:auto;display:flex;flex-direction:column;gap:18px;font-size:var(--dsw-font-s-14-font-size,14px);scrollbar-gutter:stable}
 .rw-dialog pre{margin:12px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:var(--dsw-font-xxs-12-font-size,12px);line-height:1.65;white-space:pre-wrap;word-break:break-word;background:var(--rw-hover);border-radius:var(--dsw-radius-sm,8px);padding:16px;max-height:52vh;overflow:auto}
 .rw-kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 20px;font-size:var(--dsw-font-xs-13-font-size,13px);margin:0}
 .rw-kv dt{color:var(--rw-muted)}
 .rw-kv dd{margin:0;overflow-wrap:anywhere}
 .rw-navicon{display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%}
 /* Research surface chrome. Every rule is gated on the body attribute so the
    classic Agent and DS-Bot never lose their own navigation. */
 body[data-rw-surface='research'] [class*='_logoRow']>[class*='_brand'],
 body[data-rw-surface='research'] nav[class*='_panelList'],
 body[data-rw-surface='research'] [class*='_newSession'],
 body[data-rw-surface='research'] [class*='_footArea'],
 body[data-rw-surface='research'] [class*='_widthHandle'],
 body[data-rw-surface='research'] .bt-account,
 body[data-rw-surface='research'] .bt-return{display:none!important}
 .rw-side{height:100%;min-height:0;display:flex;flex-direction:column;gap:6px;padding:16px 10px;font-family:inherit;font-size:var(--dsw-font-xs-13-font-size,13px);color:var(--rw-ink)}
 .rw-side-head{display:flex;align-items:center;gap:8px;padding:0 10px 16px}
 .rw-side-title{font-size:var(--dsw-font-s-14-font-size,14px);font-weight:500;flex:1;min-width:0;overflow-wrap:anywhere}
 .rw-side button{font:inherit;border:none;background:transparent;color:inherit;border-radius:var(--dsw-radius-sm,8px);padding:10px 12px;cursor:pointer;text-align:left;min-width:0;min-height:40px}
 .rw-side-row{display:flex;align-items:center;gap:12px;width:100%}
 .rw-side-row .rw-navicon{width:18px;height:18px;flex:none}
 .rw-side-row.on{background:var(--rw-active);font-weight:500}
 .rw-side-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-side-count{font-size:var(--dsw-font-xxs-12-font-size,12px);color:var(--rw-muted);flex:none}
 .rw-side-sep{height:1px;background:var(--rw-line);margin:12px 10px}
 .rw-side-section{font-size:var(--dsw-font-xxs-12-font-size,12px);color:var(--rw-muted);padding:4px 12px}
 .rw-side-list{display:flex;flex-direction:column;gap:4px;min-height:0;overflow:auto}
 .rw-side .rw-empty{padding:12px;line-height:1.7;font-size:var(--dsw-font-xxs-12-font-size,12px);color:var(--rw-muted)}
 .rw-side-assist{display:flex;flex-direction:column;gap:4px;width:100%}
 .rw-side-assist b{font-weight:500;font-size:var(--dsw-font-xs-13-font-size,13px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-side-assist span{font-size:var(--dsw-font-xxs-12-font-size,12px);color:var(--rw-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-side-assist.on{background:var(--rw-active)}
 .rw-side-grow{flex:1;min-height:16px}
 [class*='_collapsed'] .rw-side :is(.rw-side-title,.rw-side-label,.rw-side-count,.rw-side-section,.rw-side-list,.rw-side-head,.rw-side-back,.rw-side-sep){display:none}
 [class*='_collapsed'] .rw-side{padding:12px 4px}
 [class*='_collapsed'] .rw-side .rw-side-row{justify-content:center;padding:10px}
 .rw-side .rw-side-back{width:100%;font-size:var(--dsw-font-xxs-12-font-size,12px);color:var(--rw-muted);border-top:1px solid var(--rw-line);border-radius:0;padding-top:16px}
 .rw-floatnav{display:none;position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:45;align-items:center;gap:8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,inherit);font:inherit;font-size:13px;padding:10px 14px;box-shadow:0 4px 16px rgba(0,0,0,.12);cursor:pointer;white-space:nowrap}
 .rw-floatnav .rw-navicon{width:16px;height:16px;flex:none}
 .rw-assistant-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
 .rw-assistant{border:1px solid var(--rw-line);border-radius:var(--dsw-radius-md,12px);padding:24px;display:flex;flex-direction:column;gap:18px;min-width:0;background:var(--rw-surface)}
 .rw-assistant-head{display:flex;align-items:flex-start;gap:14px;min-width:0}
 .rw-assistant-head .grow{flex:1;min-width:0}
 .rw-avatar{display:flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;border-radius:var(--dsw-radius-md,12px);font-size:var(--dsw-font-base-16-font-size,16px);font-weight:500;background:var(--rw-accent-bg);color:var(--rw-ink)}
 .rw-assistant-name{font-size:var(--dsw-font-base-16-font-size,16px);font-weight:500;line-height:1.5;overflow-wrap:anywhere;margin:0}
 .rw-assistant-sub{font-size:var(--dsw-font-xs-13-font-size,13px);line-height:1.6;color:var(--rw-muted);overflow-wrap:anywhere;margin-top:4px}
 .rw-assistant-meta{font-size:var(--dsw-font-xs-13-font-size,13px);color:var(--rw-muted);display:flex;flex-direction:column;gap:6px;overflow-wrap:anywhere}
 .rw-assistant-actions{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:auto;padding-top:16px;border-top:1px solid var(--rw-line)}
 .rw-root button.rw-danger{color:var(--rw-danger)}
 .rw-assigned summary{cursor:pointer;font-size:var(--dsw-font-xs-13-font-size,13px);color:var(--rw-muted);padding-block:4px}
 .rw-assigned .rw-chiprow{margin-top:12px}
 .rw-skill-pick{display:flex;flex-direction:column;max-height:360px;overflow:auto;border:1px solid var(--rw-line);border-radius:var(--dsw-radius-md,12px);padding:4px;scrollbar-gutter:stable}
 .rw-check{display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:var(--dsw-radius-sm,8px);cursor:pointer;min-width:0}
 .rw-check:has(input:checked){background:var(--rw-hover)}
 .rw-check input{margin:4px 0 0;flex:none;width:16px;height:16px;min-height:0;accent-color:var(--rw-accent)}
 .rw-check .grow{flex:1;min-width:0}
 .rw-check b{font-size:var(--dsw-font-s-14-font-size,14px);font-weight:500;color:var(--rw-ink);display:block;overflow-wrap:anywhere}
 .rw-check span{display:block;font-size:var(--dsw-font-xxs-12-font-size,12px);color:var(--rw-muted);overflow-wrap:anywhere;line-height:1.6}
 .rw-pick-entry{border-top:1px solid var(--rw-line);padding:4px 0}
 .rw-pick-entry:first-child{border-top:none}
 .rw-check .rw-pick-purpose{font-size:var(--dsw-font-xs-13-font-size,13px);line-height:1.6;color:var(--rw-muted);margin:6px 0}
 .rw-pick-more{margin:0 12px 8px 40px}
 .rw-selected{display:flex;flex-direction:column;gap:8px}
 .rw-selected-row{display:flex;align-items:center;gap:8px;padding:8px;border-radius:var(--dsw-radius-sm,8px);border:1px solid var(--rw-line);font-size:var(--dsw-font-xs-13-font-size,13px)}
 .rw-selected-row .grow{flex:1;min-width:0;overflow-wrap:anywhere}
 .rw-field{display:flex;flex-direction:column;gap:8px;min-width:0}
 .rw-field label{font-size:var(--dsw-font-xs-13-font-size,13px);color:var(--rw-muted)}
 .rw-field input[type=text],.rw-field select{width:100%}
 .rw-form-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
 .rw-modal-actions{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;padding-top:16px;border-top:1px solid var(--rw-line)}
 .rw-pending{border:1px solid var(--rw-warning);border-radius:var(--dsw-radius-md,12px);padding:16px;display:flex;flex-direction:column;gap:8px;font-size:var(--dsw-font-xs-13-font-size,13px)}
 .rw-space{height:8px}
 .rw-loading{display:grid;place-items:center}
 .rw-loading>.rw-spinner{width:24px;height:24px;border:2px solid var(--rw-line);border-top-color:var(--rw-ink);border-radius:50%;animation:rw-spin .75s linear infinite}
 @keyframes rw-spin{to{transform:rotate(360deg)}}
 @media (prefers-reduced-motion:reduce){.rw-loading>.rw-spinner{animation:none}}
 @media (hover:hover){.rw-root button:hover:not(:disabled),.rw-side button:hover:not(:disabled),.rw-check:hover{background:var(--rw-hover)}.rw-root button.rw-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#43454a)}.rw-root button.rw-task:hover:not(:disabled){border-color:var(--rw-accent)}.rw-root button.rw-danger:hover{background:var(--dsw-alias-interactive-bg-hover-danger,transparent)}}
 @media (pointer:coarse){.rw-root input,.rw-root select{font-size:16px}.rw-root button,.rw-side button{min-height:44px}}
 @media (max-width:720px){.rw-floatnav{display:inline-flex}}
 @container (max-width:960px){.rw-tasks{grid-template-columns:repeat(2,minmax(0,1fr))}.rw-assistant-grid,.rw-cols{grid-template-columns:1fr}}
 @container (max-width:600px){.rw-support{grid-template-columns:minmax(0,1fr)}.rw-picker-filters input[type=text]{flex-basis:100%}.rw-picker-filters select{flex:1;min-width:0}}
 @container (max-width:600px){.rw-body{padding:24px 20px 88px;gap:24px}.rw-bar,.rw-mainbar{padding:12px 20px;gap:8px}.rw-crumb{display:none}.rw-page-heading{flex-direction:column;gap:12px}.rw-page-heading h1{font-size:var(--dsw-font-l-20-font-size,20px)}.rw-panel,.rw-assistant{padding:16px}.rw-row{flex-wrap:wrap;padding:12px 4px}.rw-row>.grow{flex-basis:100%}.rw-form-grid{grid-template-columns:1fr}.rw-filters{padding:16px;gap:12px}.rw-filter-field.search{flex-basis:100%}.rw-filter-field{flex-basis:calc(50% - 6px)}.rw-skill{flex-direction:column;gap:12px}.rw-skill .grow{width:100%}.rw-skill .use{flex-direction:row;flex-wrap:wrap;align-items:center;margin-left:0}.rw-mask{padding:12px}.rw-dialog header{padding:16px}.rw-dialog .content{padding:16px;gap:16px}.rw-kv{grid-template-columns:1fr;gap:4px}.rw-kv dd{margin-bottom:8px}}
 @container (max-width:400px){.rw-tasks{grid-template-columns:1fr}.rw-root .rw-task{min-height:0;padding:16px;gap:6px}.rw-root .rw-mainbar>.rw-note{display:none}.rw-assistant-actions{gap:4px}}
 `;

 if(typeof document!=='undefined'&&document.querySelector('style[data-plugin-css="dsh-research-workbench"]')===null){
  const tag=document.createElement('style');
  tag.dataset.plugin='dsh-research-workbench';
  tag.dataset.pluginCss='dsh-research-workbench';
  tag.textContent=css;
  document.head.appendChild(tag);
 }

 const svc=name=>{try{return boundCtx?.get?.(name);}catch{return undefined;}};

 const SURFACE_ATTR='data-rw-surface';
 const SURFACE_STORAGE='dsh-research-workbench.surface';
 const PROJECT_STORAGE='dsh-research-workbench.project';
 const RESEARCH_MODE_PRIORITY=-300;
 const rwMarker=transactionId=>`<!-- research-workbench:${transactionId} -->`;

 /** The project the workbench showed last, as a DSH workspace id. */
 function readStoredProject(){
  try{const value=globalThis.localStorage?.getItem(PROJECT_STORAGE);return typeof value==='string'&&value!==''?value:undefined;}catch{return undefined;}
 }
 function writeStoredProject(id){
  try{
   if(typeof id==='string'&&id!=='')globalThis.localStorage?.setItem(PROJECT_STORAGE,id);
   else globalThis.localStorage?.removeItem?.(PROJECT_STORAGE);
  }catch{}
 }

 function readStoredSurface(){
  try{return globalThis.localStorage?.getItem(SURFACE_STORAGE)==='research'?'research':'classic';}catch{return 'classic';}
 }
 function writeStoredSurface(mode){
  try{globalThis.localStorage?.setItem(SURFACE_STORAGE,mode);}catch{}
 }
 function applySurfaceAttr(on){
  if(typeof document==='undefined'||!document.body)return;
  if(on)document.body.setAttribute(SURFACE_ATTR,'research');
  else document.body.removeAttribute(SURFACE_ATTR);
 }

 /** Small cross-slot store: the sidebar, main panel and dialogs share one view. */
 const researchView=(()=>{
  let state={mode:readStoredSurface(),tab:'home',selectedBotId:undefined,selectedWorkspaceId:readStoredProject(),createRequested:0};
  const listeners=new Set();
  return {
   get:()=>state,
   set(patch){
    state={...state,...patch};
    if(Object.hasOwn(patch,'selectedWorkspaceId'))writeStoredProject(state.selectedWorkspaceId);
    for(const listener of [...listeners]){try{listener();}catch{}}
   },
   subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  };
 })();

 /** Last bootstrap payload, so the sidebar keeps roles after the main panel closes. */
 const bootStore=(()=>{
  let value;
  const listeners=new Set();
  const emit=()=>{for(const listener of [...listeners]){try{listener();}catch{}}};
  return {
   get:()=>value,
   set(next){value=next;emit();},
   patch(updater){value=updater(value);emit();},
   subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  };
 })();

 function useBootState(){
  return useSyncExternalStore(
   useCallback(listener=>bootStore.subscribe(listener),[]),
   useCallback(()=>bootStore.get(),[]));
 }

 function useResearchView(){
  return useSyncExternalStore(
   useCallback(listener=>researchView.subscribe(listener),[]),
   useCallback(()=>researchView.get(),[]));
 }

 function applyBootPayload(payload){
  if(payload===undefined)return;
  bootStore.patch(current=>{
   if(current===undefined)return current;
   const next={...current};
   if(payload.skillStatus)next.skillStatus=payload.skillStatus;
   if(payload.roleStatus)next.roleStatus=payload.roleStatus;
   if(payload.literatureDirs||payload.literatureFiles){
    next.literatureDirs=payload.literatureDirs??current.literatureDirs;
    next.literatureFiles=payload.literatureFiles??current.literatureFiles;
   }
   return next;
  });
 }

 async function postBoot(action,body={}){
  const boot=bootStore.get();
  if(!boot?.token)throw new Error('needToken');
  const payload=await request(API,{method:'POST',headers:{'content-type':'application/json','x-workbench-token':boot.token},body:JSON.stringify({action,...body})});
  applyBootPayload(payload);
  return payload;
 }

 function sidebarCollapsed(){
  if(typeof document==='undefined')return true;
  return document.querySelector('[class*=\"_collapsed\"] .rw-side, [class*=\"_railIn\"] .rw-side')!==null;
 }

 function collapseSidebarIfNarrow(){
  try{
   if(typeof window!=='undefined'&&window.innerWidth>720)return;
   if(!sidebarCollapsed())svc('layout')?.toggleSidebar?.();
  }catch{}
 }

 function enterResearch(){
  writeStoredSurface('research');
  applySurfaceAttr(true);
  researchView.set({mode:'research',tab:'home'});
  try{svc('layout')?.selectPanel?.(PANEL_ID);}catch{}
 }

 function exitResearch(){
  writeStoredSurface('classic');
  applySurfaceAttr(false);
  researchView.set({mode:'classic'});
  try{svc('layout')?.selectPanel?.(null);}catch{}
 }

 /** Never reuse a slot priority another plugin already holds. */
 function freePriority(entries,options={}){
  const taken=(Array.isArray(entries)?entries:[])
   .filter(entry=>(options.key===undefined||entry?.options?.key===options.key)&&(options.id===undefined||entry?.options?.id===options.id))
   .map(entry=>(entry?.options?.priority??0)-1);
  return taken.length===0?options.priority:Math.min(options.priority,...taken);
 }

 function useT(){
  const locale=svc('locale');
  useSyncExternalStore(
   useCallback(cb=>typeof locale?.subscribe==='function'?locale.subscribe(cb):()=>{},[locale]),
   useCallback(()=>locale?.getSnapshot?.(),[locale]));
  return useCallback((key,params)=>{
   const bound=locale?.bind?.(NS);
   const text=typeof bound==='function'?bound(key):key;
   if(!params)return text;
   return String(text).replace(/\{(\w+)\}/g,(match,name)=>name in params?String(params[name]):match);
  },[locale]);
 }

 function useFace(fetcher){
  const subscribe=useCallback(cb=>{const face=fetcher();return typeof face?.subscribe==='function'?face.subscribe(cb):()=>{};},[fetcher]);
  const snapshot=useCallback(()=>{try{return fetcher()?.getSnapshot?.();}catch{return undefined;}},[fetcher]);
  return useSyncExternalStore(subscribe,snapshot);
 }

 const useSessionsState=()=>useFace(useCallback(()=>svc('sessions')?.list,[]));
 const useWorkspacesState=()=>useFace(useCallback(()=>svc('workspaces')?.list,[]));

 function basename(path){
  if(typeof path!=='string'||path==='')return '';
  const parts=path.split(/[\\/]+/).filter(Boolean);
  return parts.length===0?path:parts[parts.length-1];
 }
 function shortSha(sha){return typeof sha==='string'&&sha.length>8?sha.slice(0,8):(sha||'—');}
 function fileSize(bytes){
  if(!Number.isFinite(bytes)||bytes<=0)return '';
  if(bytes<1024)return bytes+' B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(0)+' KB';
  return (bytes/1024/1024).toFixed(1)+' MB';
 }
 function stamp(ms){
  if(!Number.isFinite(ms))return '';
  const date=new Date(ms);
  const pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
 }

 async function request(url,init){
  const response=await fetch(url,init);
  let payload;
  try{payload=await response.json();}catch{payload={error:`HTTP ${response.status}`};}
  if(!response.ok)throw new Error(payload?.error??`HTTP ${response.status}`);
  return payload;
 }

 /** Call DS-Bot's own same-origin API; the workbench never writes its state file. */
 async function botApi(endpoint,payload={}){
  const response=await fetch('/api/bot',{
   method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify({endpoint,payload}),
  });
  let body;
  try{body=await response.json();}catch{throw new Error(`DS-Bot HTTP ${response.status}`);}
  if(body?.ok!==true)throw new Error(body?.error?.message??`DS-Bot HTTP ${response.status}`);
  return body.value;
 }

 /** Complete pending creations whose Bot already exists, once at a time. */
 const reconcilingRoles=new Set();
 function useRoleReconcile(boot,api){
  useEffect(()=>{
   const pending=Array.isArray(boot?.roleStatus?.pending)?boot.roleStatus.pending:[];
   for(const item of pending){
    if(item.matchedBotIds?.length!==1)continue;
    if(reconcilingRoles.has(item.transactionId))continue;
    reconcilingRoles.add(item.transactionId);
    api.post('complete-role',{transactionId:item.transactionId,botId:item.matchedBotIds[0]})
     .catch(()=>reconcilingRoles.delete(item.transactionId));
   }
  },[boot,api]);
 }

 function Modal(props){
  const {title,onClose,children,wide}=props;
  const t=useT();
  const dialogRef=useRef(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  useEffect(()=>{
   const previous=document.activeElement;
   dialogRef.current?.focus({preventScroll:true});
   const onKey=event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();return;}
    if(event.key!=='Tab')return;
    const dialog=dialogRef.current;
    const controls=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')]
     .filter(node=>node.getClientRects().length>0);
    const target=event.shiftKey?controls.at(-1):controls[0];
    if(!target){event.preventDefault();return;}
    if(document.activeElement===dialog||!dialog.contains(document.activeElement)||document.activeElement===(event.shiftKey?controls[0]:controls.at(-1))){event.preventDefault();target.focus();}
   };
   window.addEventListener('keydown',onKey);
   return()=>{window.removeEventListener('keydown',onKey);if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[]);
  return h('div',{className:'rw-mask',onMouseDown:event=>{if(event.target===event.currentTarget)onClose();}},
   h('div',{className:'rw-dialog',ref:dialogRef,role:'dialog','aria-modal':true,'aria-label':title,tabIndex:-1,style:wide?{width:'960px'}:undefined},
    h('header',null,h('b',null,title),h('div',{className:'rw-spacer'}),h('button',{className:'ghost','aria-label':t('close'),onClick:onClose},'×')),
    h('div',{className:'content'},children)));
 }

 function NavIcon(owner={}){
  const size=owner.size??16;
  return h('span',{className:'rw-navicon'},
   h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round'},
    h('path',{d:'M9 3v6.2L5.2 16A2 2 0 0 0 7 19h10a2 2 0 0 0 1.8-3L15 9.2V3'}),
    h('path',{d:'M8 3h8'}),
    h('path',{d:'M7.4 13h9.2'})));
 }

 function useWorkbenchApi(){
  const [boot,setBoot]=useState(undefined);
  const [error,setError]=useState(null);
  const [busy,setBusy]=useState(null);
  const [notice,setNotice]=useState(null);

  const refresh=useCallback(async()=>{
   setBusy('boot');
   setError(null);
   try{
    const payload=await request(`${API}?action=bootstrap`);
    setBoot(payload);
    bootStore.set(payload);
    return payload;
   }catch(cause){
    setError(String(cause?.message??cause));
    return undefined;
   }finally{
    setBusy(null);
   }
  },[]);

  const post=useCallback(async(action,body={})=>{
   if(!boot?.token){
    setError('needToken');
    throw new Error('missing token');
   }
   setBusy(action);
   setError(null);
   setNotice(null);
   try{
    const payload=await request(API,{method:'POST',headers:{'content-type':'application/json','x-workbench-token':boot.token},body:JSON.stringify({action,...body})});
    applyBootPayload(payload);
    setBoot(current=>{
     if(current===undefined)return current;
     const next={...current};
     if(payload?.skillStatus)next.skillStatus=payload.skillStatus;
     if(payload?.roleStatus)next.roleStatus=payload.roleStatus;
     if(payload?.literatureDirs||payload?.literatureFiles){
      next.literatureDirs=payload.literatureDirs??current.literatureDirs;
      next.literatureFiles=payload.literatureFiles??current.literatureFiles;
     }
     return next;
    });
    return payload;
   }catch(cause){
    setError(String(cause?.message??cause));
    throw cause;
   }finally{
    setBusy(null);
   }
  },boot);

  useEffect(()=>{refresh();},[refresh]);

  return {boot,setBoot,error,setError,busy,notice,setNotice,refresh,post};
 }

 /**
  * Write text into one session's composer.
  *
  * The composer is mounted per session scope, and a freshly opened session
  * publishes that scope a tick later, so the facade is polled instead of
  * assumed.
  * @param sessionId - target session.
  * @param text - draft to place.
  * @returns whether the draft reached the composer.
  */
 async function seedDraft(sessionId,text){
  for(let attempt=0;attempt<25;attempt+=1){
   try{
    const scope=svc('sessions')?.scope?.(sessionId);
    const input=scope===undefined?undefined:svc('conversation')?.input?.for?.(scope);
    if(typeof input?.setDraft==='function'){
     input.setDraft(text);
     input.focus?.();
     return true;
    }
   }catch{
    // A scope that is not published yet answers nothing; try again.
   }
   await new Promise(resolve=>setTimeout(resolve,80));
  }
  return false;
 }

 /**
  * Open one research assistant's current DS-Bot chat and optionally seed it.
  *
  * A research action never creates a blank workspace session: the Bot owns the
  * conversation, its model, and its context. DS-Bot starts a fresh segment when
  * a working folder changes, so the Bot is read again at click time instead of
  * trusting the session id taken when the page loaded.
  */
 async function openAssistantChat(api,entry,text){
  api.setError(null);
  api.setNotice(null);
  if(typeof entry?.botId!=='string'||entry.botId===''){
   api.setError('chatUnavailable');
   return false;
  }
  if(entry?.missing===true){
   api.setError('roleMissingBot');
   return false;
  }
  let bot;
  try{bot=await liveBot(entry.botId);}catch(cause){api.setError(String(cause?.message??cause));return false;}
  if(bot.missing===true){api.setError('roleMissingBot');return false;}
  if(typeof bot.sessionId!=='string'||bot.sessionId===''){api.setError('chatUnavailable');return false;}
  try{svc('uiWorkspace')?.openSession?.(bot.sessionId);}catch{api.setError('chatUnavailable');return false;}
  try{svc('layout')?.selectPanel?.(null);}catch{}
  researchView.set({selectedBotId:entry.botId});
  collapseSidebarIfNarrow();
  if(typeof text!=='string'||text.trim()==='')return true;
  const seeded=await seedDraft(bot.sessionId,text);
  if(seeded)api.setNotice('worked');
  else api.setError('draftFailed');
  return seeded;
 }

 /**
  * Open one assistant from the sidebar, where there is no place for an error.
  * @returns whether the chat opened.
  */
 async function openAssistantSession(entry){
  if(typeof entry?.botId!=='string'||entry.botId==='')return false;
  let bot;
  try{bot=await liveBot(entry.botId);}catch{return false;}
  if(bot.missing===true||typeof bot.sessionId!=='string'||bot.sessionId==='')return false;
  try{
   svc('uiWorkspace')?.openSession?.(bot.sessionId);
   try{svc('layout')?.selectPanel?.(null);}catch{}
   return true;
  }catch{return false;}
 }

 function skillRows(boot){
  const rows=boot?.skillStatus?.skills;
  return Array.isArray(rows)?rows:[];
 }

 function roleEntries(boot){
  const rows=boot?.roleStatus?.entries;
  return Array.isArray(rows)?rows:[];
 }

 function roleTemplates(boot){
  const rows=boot?.roleStatus?.templates;
  return Array.isArray(rows)?rows:[];
 }

 function templateOf(boot,templateId){
  return roleTemplates(boot).find(template=>template.id===templateId);
 }

 function skillKey(skill){
  return typeof skill?.key==='string'?skill.key:`${skill?.sourceId}/${skill?.name}`;
 }

 function assistantsWithSkill(entries,key){
  return entries.filter(entry=>(entry.skills??[]).some(skill=>skillKey(skill)===key&&skill.available===true));
 }

 function assistantsWithCategory(entries,category,fallbackName){
  return entries.filter(entry=>(entry.skills??[]).some(skill=>skill.available===true&&(skill.category===category||(fallbackName!==undefined&&skill.name===fallbackName))));
 }

 function firstSkillFor(entry,category,fallbackName){
  return (entry?.skills??[]).find(skill=>skill.available===true&&(skill.category===category||(fallbackName!==undefined&&skill.name===fallbackName)));
 }

 function roleSkillReason(t,skill){
  if(skill.reason==='disabled')return t('skillDisabled');
  if(skill.reason==='source-missing')return t('skillSourceMissing');
  if(skill.reason==='missing')return t('skillMissing');
  if(skill.reason==='conflict')return t('skillConflict');
  if(skill.reason==='duplicate')return t('skillDuplicate');
  return skill.available===true?null:t('skillUnavailable');
 }

 function templateLabel(t,boot,templateId){
  const template=templateOf(boot,templateId);
  return template===undefined?templateId:t(template.labelKey);
 }
 function buildPrompt(t,instruction,skillName,files){
  const head=skillName===undefined?instruction:`/${skillName} ${instruction}`;
  if(!Array.isArray(files)||files.length===0)return head;
  return `${head}\n\n${t('promptFiles')}\n${files.map(file=>file.path).join('\n')}`;
 }

 function pickFile(files,extensions){
  if(!Array.isArray(files))return undefined;
  return files.find(file=>extensions.includes(file.ext));
 }

 /**
  * Projects this page just registered, before the workspaces face lists them.
  *
  * `create-workspace` returns the registry entry immediately, while the face
  * updates a tick later; keeping the row here makes the new project selectable
  * and usable for creation at once.
  */
 const freshProjects=new Map();

 /** Keep one returned registry entry until the workspaces face carries it. */
 function rememberProject(workspace){
  if(workspace===null||typeof workspace!=='object')return;
  const id=workspace.workspaceId??workspace.id;
  if(typeof id!=='string'||id==='')return;
  freshProjects.set(id,{
   workspaceId:id,
   title:typeof workspace.title==='string'?workspace.title:'',
   path:typeof workspace.path==='string'?workspace.path:'',
   sessionIds:Array.isArray(workspace.sessionIds)?[...workspace.sessionIds]:[],
  });
 }

 /** The project rows the workspaces face currently holds, plus fresh ones. */
 function projectList(workspaces){
  const items=Array.isArray(workspaces?.items)?[...workspaces.items]:[];
  const listed=new Set(items.map(item=>item?.workspaceId));
  for(const [id,item] of freshProjects){
   if(!listed.has(id)){items.push(item);continue;}
   freshProjects.delete(id);
  }
  return items;
 }

 function projectById(items,id){
  if(typeof id!=='string'||id==='')return undefined;
  return items.find(item=>item?.workspaceId===id);
 }

 function projectEntriesOf(entries,workspaceId){
  if(typeof workspaceId!=='string'||workspaceId==='')return [];
  return entries.filter(entry=>entry.workspaceId===workspaceId);
 }

 /** Roles whose project is no longer in the workspace list. */
 function orphanEntriesOf(entries,items){
  const known=new Set(items.map(item=>item?.workspaceId));
  return entries.filter(entry=>typeof entry.workspaceId==='string'&&entry.workspaceId!==''&&!known.has(entry.workspaceId));
 }

 /** Cut text to a UTF-16 budget without leaving half a surrogate pair. */
 function truncateUtf16(text,limit){
  const value=String(text??'');
  if(value.length<=limit)return value;
  let out='';
  for(const character of value){
   if(out.length+character.length>limit)break;
   out+=character;
  }
  return out.trim();
 }

 /** DS-Bot accepts a Bot name of at most 40 UTF-16 units. */
 function defaultAssistantName(project,templateLabel){
  const stem=project===null||project===undefined?'':(project.title||basename(project.path));
  return truncateUtf16(stem===''?templateLabel:`${stem} · ${templateLabel}`,40);
 }

 /** Compare workspace paths the way DS-Bot does: case and separators do not matter. */
 function sameFolder(left,right){
  const key=value=>String(value??'').replace(/\\/g,'/').replace(/\/+$/,'').toLowerCase();
  const a=key(left);
  return a!==''&&a===key(right);
 }

 function roomMembersOf(room){
  return Array.isArray(room?.members)?room.members:[];
 }

 function sameMembers(left,right){
  const a=[...new Set(left??[])].sort();
  const b=[...new Set(right??[])].sort();
  return a.length===b.length&&a.every((value,index)=>value===b[index]);
 }

 /**
  * Open one already existing DS-Bot Session once the session list holds it.
  *
  * DS-Bot creates a group's Session before its row reaches the browser, so a
  * freshly made group is retried for about five seconds instead of opening
  * nothing.
  * @param sessionId - Session or group id.
  * @returns whether the Session list showed it and it was opened.
  */
 async function openListedSession(sessionId){
  if(typeof sessionId!=='string'||sessionId==='')return false;
  for(let attempt=0;attempt<50;attempt+=1){
   let listed=false;
   try{listed=svc('sessions')?.list?.getSnapshot?.()?.byId?.[sessionId]!==undefined;}catch{listed=false;}
   if(listed){
    try{
     svc('uiWorkspace')?.openSession?.(sessionId);
     try{svc('layout')?.selectPanel?.(null);}catch{}
     return true;
    }catch{return false;}
   }
   if(attempt===0){try{void svc('sessions')?.refresh?.();}catch{}}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  return false;
 }

 /** The Bot as DS-Bot holds it now, so a fresh chat segment is never missed. */
 async function liveBot(botId){
  const state=await botApi('state',{});
  const rows=Array.isArray(state?.bots)?state.bots:[];
  const bot=rows.find(entry=>entry?.id===botId);
  if(bot===undefined)return {missing:true,state};
  const sessionId=typeof bot.sessionId==='string'&&bot.sessionId!==''?bot.sessionId:bot.id;
  return {...bot,sessionId,state};
 }

 function ProjectsPanel(props){
  const {t,workspaces,selected,onSelect,onCreateProject,onAddExisting,onNewAssistant,busy,availability,fileCounts}=props;
  const items=projectList(workspaces);
  const counts=fileCounts??{};
  const available=id=>(availability===null||availability===undefined?true:availability[id]===true);
  return h('section',{className:'rw-panel'},
   h('div',{className:'rw-section-head'},
    h('h2',{className:'rw-h'},t('projects'),h('span',{className:'rw-section-count'},items.length)),
    h('div',{className:'rw-act'},
     h('button',{className:'rw-primary',onClick:onCreateProject,disabled:busy===true},t('newProject')),
     h('button',{className:'ghost',onClick:onAddExisting,disabled:busy===true},t('chooseFolder')))),
   availability===null&&h('div',{className:'rw-note'},t('projectServiceUnavailable')),
   items.length===0&&h('div',{className:'rw-empty'},t('projectEmpty')),
   items.map(item=>{
    const files=Array.isArray(counts[item.workspaceId])?counts[item.workspaceId]:[];
    const usable=available(item.workspaceId);
    return h('div',{key:item.workspaceId,className:`rw-row${selected===item.workspaceId?' on':''}`},
     h('button',{className:'rw-row-select','aria-pressed':selected===item.workspaceId,onClick:()=>onSelect(item.workspaceId)},
      h('b',{className:'rw-name'},item.title||basename(item.path)),
      h('span',{className:'rw-sub'},item.path),
      h('span',{className:'rw-sub'},`${item.sessionIds.length} ${t('sessionsCount')} · ${files.length} ${t('fileCount')}`),
      usable?null:h('span',{className:'rw-badge err'},t('projectUnavailable'))),
     h('button',{className:'ghost',onClick:()=>{onSelect(item.workspaceId);onNewAssistant?.(item);},disabled:busy===true||!usable},t('newAssistant')));
   }));
 }

 /** Create one project folder inside a parent the user picks. */
 function NewProjectDialog(props){
  const {t,api,onClose,onCreated}=props;
  const [name,setName]=useState('');
  const [parent,setParent]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  const canPick=svc('uiWorkspace')?.pickDirectory!==undefined;

  const pickParent=async()=>{
   const uiWorkspace=svc('uiWorkspace');
   if(uiWorkspace?.pickDirectory===undefined)return;
   try{
    const path=await uiWorkspace.pickDirectory();
    if(typeof path==='string'&&path!=='')setParent(path);
   }catch(cause){
    setError(String(cause?.message??cause));
   }
  };

  const submit=async()=>{
   setBusy(true);
   setError(null);
   try{
    const payload=await api.post('create-workspace',{parentPath:parent.trim(),name:name.trim()});
    rememberProject(payload?.workspace);
    api.setNotice('projectCreated');
    onCreated(payload?.workspace?.id);
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  return h(Modal,{title:t('newProject'),onClose},
   h('div',{className:'rw-note'},t('projectNewHint')),
   h('div',{className:'rw-field'},h('label',null,t('projectName')),
    h('input',{type:'text',value:name,onChange:event=>setName(event.target.value),disabled:busy})),
   h('div',{className:'rw-field'},h('label',null,t('projectParent')),
    h('div',{className:'rw-form'},
     h('input',{type:'text',value:parent,onChange:event=>setParent(event.target.value),disabled:busy}),
     canPick&&h('button',{className:'ghost',onClick:pickParent,disabled:busy},t('pickParent')))),
   error!==null&&h('div',{className:'rw-error',role:'alert'},error),
   h('div',{className:'rw-modal-actions'},
    h('button',{className:'ghost',onClick:onClose,disabled:busy},t('cancel')),
    h('button',{className:'rw-primary',onClick:submit,disabled:busy||name.trim()===''||parent.trim()===''},busy?t('creating'):t('createProject'))));
 }

 /** The selected project's assistants, with their real working folder. */
 function ProjectAssistantsPanel(props){
  const {t,boot,entries,onOpen,onCreate,disabled}=props;
  return h('section',{className:'rw-panel'},
   h('div',{className:'rw-section-head'},
    h('h2',{className:'rw-h'},t('projectAssistants'),h('span',{className:'rw-section-count'},entries.length)),
    h('button',{className:'ghost',onClick:onCreate,disabled:disabled===true},t('newAssistant'))),
   entries.length===0&&h('div',{className:'rw-empty'},t('assistantsEmpty')),
   entries.map(entry=>h('div',{key:entry.botId,className:'rw-row'},
    h('span',{className:'rw-avatar','aria-hidden':true},Array.from(entry.name||entry.botId)[0]),
    h('div',{className:'grow'},
     h('b',{className:'rw-name'},entry.name??entry.botId),
     h('span',{className:'rw-sub'},templateLabel(t,boot,entry.templateId)),
     h('span',{className:'rw-sub'},entry.workDir??t('dsBotTeamFolder'))),
    h('button',{disabled:entry.sessionId===null,onClick:()=>onOpen(entry)},t('openChat')))));
 }

 function FilesPanel(props){
  const {t,boot,workspace,onOpenFile,onRevealFile,onToChat,onAddLiterature,onRemoveLiterature,busy}=props;
  const files=boot?.filesByWorkspace?.[workspace?.workspaceId]??[];
  const literatureDirs=Array.isArray(boot?.literatureDirs)?boot.literatureDirs:[];
  const literatureFiles=boot?.literatureFiles??{};
  return h('div',{className:'rw-panel'},
   h('div',{className:'rw-section-head'},
    h('h2',{className:'rw-h'},t('files')),
    h('button',{className:'ghost',onClick:onAddLiterature,disabled:busy===true},t('litAdd'))),
   h('div',{className:'rw-note'},t('litHint')),
   files.length===0&&h('div',{className:'rw-empty'},t('filesEmpty')),
   files.map(file=>h('div',{key:file.path,className:'rw-row'},
    h('div',{className:'grow'},
     h('b',{className:'rw-name'},file.name),
     h('span',{className:'rw-sub'},`${file.relativePath} · ${fileSize(file.size)} · ${stamp(file.mtimeMs)}`)),
    h('div',{className:'rw-act'},
     h('button',{className:'ghost',onClick:()=>onOpenFile(file)},t('open')),
     h('button',{className:'ghost',onClick:()=>onRevealFile(file)},t('reveal')),
     h('button',{onClick:()=>onToChat([file])},t('toChat'))))),
   literatureDirs.length>0&&h('h3',{className:'rw-h',style:{marginTop:'4px'}},t('litDirs')),
   literatureDirs.length===0&&h('div',{className:'rw-empty'},t('litEmpty')),
   literatureDirs.map(dir=>{
    const rows=Array.isArray(literatureFiles[dir])?literatureFiles[dir]:[];
    return h('div',{key:dir,style:{display:'flex',flexDirection:'column',gap:'2px'}},
     h('div',{className:'rw-row'},
      h('div',{className:'grow'},
       h('b',{className:'rw-name'},basename(dir)),
       h('span',{className:'rw-sub'},`${dir} · ${rows.length} ${t('fileCount')}`)),
      h('div',{className:'rw-act'},
       h('button',{className:'ghost',onClick:()=>onOpenFile({path:dir})},t('open')),
       h('button',{className:'ghost',onClick:()=>onRemoveLiterature(dir),disabled:busy===true},t('remove')))),
     rows.map(row=>h('div',{key:row.path,className:'rw-row',style:{paddingLeft:'14px'}},
      h('div',{className:'grow'},
       h('b',{className:'rw-name'},row.name),
       h('span',{className:'rw-sub'},`${fileSize(row.size)} · ${stamp(row.mtimeMs)}`)),
      h('div',{className:'rw-act'},
       h('button',{className:'ghost',onClick:()=>onOpenFile(row)},t('open')),
       h('button',{onClick:()=>onToChat([row])},t('toChat'))))));
   }));
 }

 function HomeView(props){
  const {t,boot,api,askAssistant,onCreate,createDisabled,workspaceId,onSelectProject,onOpenSkills}=props;
  const workspacesState=useWorkspacesState();
  const items=projectList(workspacesState);
  const workspace=projectById(items,workspaceId);
  const availability=boot?.workspaceAvailability;
  const projectUsable=workspace===undefined?false:(availability===null||availability===undefined?true:availability[workspace.workspaceId]===true);
  const files=workspace===undefined?[]:(boot?.filesByWorkspace?.[workspace.workspaceId]??[]);
  const entries=roleEntries(boot);
  const projectEntries=projectEntriesOf(entries,workspaceId);
  const [dialog,setDialog]=useState(null);
  const [newProject,setNewProject]=useState(false);

  const tasks=useMemo(()=>[
   {key:'reading',category:'reading',fallback:'mineru',extensions:['.pdf','.md'],skillLabel:'taskReading',hintLabel:'taskReadingHint',promptLabel:'promptReading'},
   {key:'writing',category:'writing',extensions:['.md','.tex'],skillLabel:'taskWriting',hintLabel:'taskWritingHint',promptLabel:'promptWriting'},
   {key:'review',category:'review',extensions:['.tex','.md','.bib'],skillLabel:'taskReview',hintLabel:'taskReviewHint',promptLabel:'promptReview'},
   {key:'figure',category:'figure',fallback:'scientific-figure-making',extensions:['.py','.csv','.png'],skillLabel:'taskFigure',hintLabel:'taskFigureHint',promptLabel:'promptFigure'},
  ],[]);

  /**
   * Refuse to deliver a task whose project, folder, or assistant changed while
   * the chooser was open; nothing is written into another project's chat.
   */
  const deliver=async(entry,prompt)=>{
   if(workspace===undefined)return;
   const captured=workspace.workspaceId;
   const latest=await api.refresh();
   if(researchView.get().selectedWorkspaceId!==captured){
    api.setError('projectChanged');
    return;
   }
   const available=latest?.workspaceAvailability;
   if(available!==null&&available!==undefined&&available[captured]!==true){
    api.setError('projectUnavailable');
    return;
   }
   const rows=Array.isArray(latest?.roleStatus?.entries)?latest.roleStatus.entries:[];
   const still=rows.find(row=>row.botId===entry.botId);
   if(still===undefined||still.workspaceId!==captured){
    api.setError('assistantMoved');
    return;
   }
   await openAssistantChat(api,still,prompt);
  };

  const toChat=(rows)=>{
   if(workspace===undefined){
    api.setError('noWorkspace');
    return;
   }
   askAssistant({title:t('chooseAssistant'),entries:projectEntries,onPick:entry=>{
    void deliver(entry,buildPrompt(t,t('promptAttach'),undefined,rows));
   }});
  };

  const runTask=(task)=>{
   if(workspace===undefined||!projectUsable){
    api.setError(workspace===undefined?'noWorkspace':'projectUnavailable');
    return;
   }
   const matching=assistantsWithCategory(projectEntries,task.category,task.fallback);
   const file=pickFile(files,task.extensions);
   askAssistant({title:t('chooseAssistant'),entries:matching,onPick:entry=>{
    const skill=firstSkillFor(entry,task.category,task.fallback);
    void deliver(entry,buildPrompt(t,t(task.promptLabel),skill?.name,file===undefined?[]:[file]));
   }});
  };

  const addExisting=async()=>{
   const uiWorkspace=svc('uiWorkspace');
   if(uiWorkspace?.pickDirectory!==undefined){
    try{
     const path=await uiWorkspace.pickDirectory();
     if(typeof path==='string'&&path!==''){
      const payload=await api.post('add-workspace',{path});
      rememberProject(payload?.workspace);
      onSelectProject?.(payload?.workspace?.id);
     }
    }catch(cause){
     api.setError(String(cause?.message??cause));
    }
    return;
   }
   setDialog({kind:'path',title:t('chooseFolder'),placeholder:t('fieldPath'),onSubmit:async path=>{
    const payload=await api.post('add-workspace',{path});
    rememberProject(payload?.workspace);
    onSelectProject?.(payload?.workspace?.id);
   }});
  };

  const addLiterature=async()=>{
   const uiWorkspace=svc('uiWorkspace');
   if(uiWorkspace?.pickDirectory!==undefined){
    try{
     const path=await uiWorkspace.pickDirectory();
     if(typeof path==='string'&&path!=='')await api.post('add-literature-dir',{path});
    }catch(cause){
     api.setError(String(cause?.message??cause));
    }
    return;
   }
   setDialog({kind:'path',title:t('litAdd'),placeholder:t('litHint'),onSubmit:path=>api.post('add-literature-dir',{path})});
  };

  const openFile=file=>api.post('open-native-path',{path:file.path,mode:'open'}).catch(()=>{});
  const openProjectAssistant=entry=>{void openAssistantChat(api,entry,'');};

  return h(React.Fragment,null,
   h('div',{className:'rw-page-heading'},h('div',null,
    h('h1',null,workspace===undefined?t('projects'):(workspace.title||basename(workspace.path))),
    h('p',null,workspace===undefined?t('projectSelectHint'):workspace.path),
    workspace!==undefined&&!projectUsable&&h('span',{className:'rw-badge err'},t('projectUnavailable')))),
   h(ProjectsPanel,{t,workspaces:workspacesState,selected:workspaceId,onSelect:onSelectProject,onCreateProject:()=>setNewProject(true),
    onAddExisting:addExisting,onNewAssistant:item=>props.onNewAssistant?.(item),busy:api.busy!==null,availability,
    fileCounts:boot?.filesByWorkspace}),
   workspace===undefined
    ?h('div',{className:'rw-panel'},
     h('div',{className:'rw-note'},t('projectSelectHint')),
     workspaceId!==undefined&&h('div',{className:'rw-note'},t('projectMissing')))
    :h(React.Fragment,null,
     h('section',null,
      h('div',{className:'rw-section-head'},
       h('h2',{className:'rw-h'},t('tasksHeading')),
       h('button',{className:'ghost',onClick:onOpenSkills},t('taskSkillsCard'))),
      h('div',{className:'rw-tasks'},
       tasks.map(task=>h('button',{key:task.key,className:'rw-task',onClick:()=>runTask(task),disabled:api.busy!==null||!projectUsable},
        h('b',null,t(task.skillLabel)),
        h('span',null,t(task.hintLabel)))))),
     h('div',{className:'rw-cols'},
      h(ProjectAssistantsPanel,{t,boot,entries:projectEntries,onOpen:openProjectAssistant,onCreate:()=>props.onNewAssistant?.(workspace),disabled:createDisabled||!projectUsable}),
      h(ProjectRoomsPanel,{t,api,project:workspace,entries:projectEntries,workspaces:workspacesState,onManage:room=>props.onManageRoom?.(room)})),
     h(FilesPanel,{t,boot,workspace,busy:api.busy!==null,onOpenFile:openFile,
      onRevealFile:file=>api.post('open-native-path',{path:file.path,mode:'reveal'}).catch(()=>{}),
      onToChat:toChat,onAddLiterature:addLiterature,
      onRemoveLiterature:dir=>api.post('remove-literature-dir',{path:dir}).catch(()=>{})}),
     h('div',{className:'rw-note'},t('memoryNote'))),
   dialog!==null&&h(PathDialog,{t,dialog,onClose:()=>setDialog(null),onSubmit:async path=>{await dialog.onSubmit(path);setDialog(null);}}),
   newProject&&h(NewProjectDialog,{t,api,onClose:()=>setNewProject(false),onCreated:id=>{setNewProject(false);if(typeof id==='string')onSelectProject?.(id);}}));
 }

 function PathDialog(props){
  const {t,dialog,onClose,onSubmit}=props;
  const [path,setPath]=useState('');
  const [title,setTitle]=useState('');
  return h(Modal,{title:dialog.title,onClose},
   h('div',{className:'rw-form',style:{flexDirection:'column',alignItems:'stretch'}},
    h('input',{type:'text',value:path,placeholder:dialog.placeholder??t('fieldPath'),onChange:event=>setPath(event.target.value),autoFocus:true}),
    h('input',{type:'text',value:title,placeholder:t('fieldTitle'),onChange:event=>setTitle(event.target.value)}),
    h('div',{className:'rw-form'},
     h('div',{className:'rw-spacer'}),
     h('button',{className:'ghost',onClick:onClose},t('cancel')),
     h('button',{className:'rw-primary',disabled:path.trim()==='',onClick:()=>onSubmit(path.trim())},t('add')))));
 }

 function SourcesSection(props){
  const {t,boot,api}=props;
  const status=boot?.skillStatus;
  const sources=Array.isArray(status?.sources)?status.sources:[];
  const presets=Array.isArray(status?.presets)?status.presets:[];
  const [form,setForm]=useState({kind:'github',url:'',branch:'',title:'',path:''});
  const [preview,setPreview]=useState(null);
  const busy=api.busy;

  const installPreset=preset=>api.post('add-skill-source',{url:preset.url,branch:preset.branch,title:preset.title,id:preset.id}).catch(()=>{});

  const addSource=async()=>{
   if(form.kind==='local'){
    await api.post('add-skill-source',{kind:'local',path:form.path.trim(),title:form.title.trim()}).catch(()=>{});
   }else{
    await api.post('add-skill-source',{url:form.url.trim(),branch:form.branch.trim(),title:form.title.trim()}).catch(()=>{});
   }
   setForm({kind:'github',url:'',branch:'',title:'',path:''});
  };

  return h('div',{className:'rw-panel'},
   h('h3',{className:'rw-h'},t('skillSources')),
   sources.length===0&&h('div',{className:'rw-empty'},t('sourceEmpty')),
   sources.map(source=>h('div',{key:source.id,className:'rw-row',style:{cursor:'default',alignItems:'flex-start'}},
    h('div',{className:'grow'},
     h('b',{className:'rw-name'},source.title),
     h('span',{className:'rw-sub'},source.kind==='local'?source.localPath:`${source.repository} · ${source.branch} · ${shortSha(source.installedRevision)}`),
     h('div',{className:'rw-chiprow',style:{marginTop:'3px'}},
      source.kind==='local'
       ?h('span',{className:'rw-badge'},t('localBadge'))
       :source.aheadCount>0
        ?h('span',{className:'rw-badge warn'},`${source.aheadCount} ${t('ahead')}`)
        :h('span',{className:'rw-badge ok'},t('upToDate')),
      h('span',{className:'rw-badge'},source.syncMode))),
    h('div',{className:'rw-act'},
     source.kind==='local'?null:h('button',{className:'ghost',disabled:busy!==null,onClick:()=>api.post('check-skill-source',{sourceId:source.id}).catch(()=>{})},t('checkUpdate')),
     source.kind==='local'?null:h('button',{className:'ghost',disabled:busy!==null,onClick:async()=>{try{const payload=await api.post('preview-skill-update',{sourceId:source.id});setPreview(payload.preview);}catch{}}},t('previewChanges')),
     source.kind==='local'?null:h('button',{disabled:busy!==null,onClick:()=>api.post('apply-skill-update',{sourceId:source.id}).catch(()=>{})},t('applyUpdate')),
     h('button',{className:'ghost',disabled:busy!==null,onClick:()=>{if(window.confirm(t('removeConfirm')))api.post('remove-skill-source',{sourceId:source.id}).catch(()=>{});}},t('remove'))))),
   h('div',{className:'rw-form',style:{marginTop:'4px'}},
    h('select',{value:form.kind,onChange:event=>setForm({...form,kind:event.target.value})},
     h('option',{value:'github'},t('kindGithub')),
     h('option',{value:'local'},t('kindLocal'))),
    form.kind==='local'
     ?h('input',{type:'text',value:form.path,placeholder:t('sourceLocalPath'),onChange:event=>setForm({...form,path:event.target.value})})
     :h(React.Fragment,null,
       h('input',{type:'text',value:form.url,placeholder:t('sourceUrl'),onChange:event=>setForm({...form,url:event.target.value})}),
       h('input',{type:'text',value:form.branch,placeholder:t('sourceBranch'),style:{maxWidth:'120px'},onChange:event=>setForm({...form,branch:event.target.value})})),
    h('input',{type:'text',value:form.title,placeholder:t('fieldTitle'),style:{maxWidth:'140px'},onChange:event=>setForm({...form,title:event.target.value})}),
    h('button',{className:'rw-primary',disabled:busy!==null||(form.kind==='local'?form.path.trim()==='':form.url.trim()===''),onClick:addSource},t('addSource'))),
   presets.some(preset=>!preset.installed)&&h(React.Fragment,null,
    h('h3',{className:'rw-h',style:{marginTop:'6px'}},t('presetSources')),
    h('div',{className:'rw-cards'},
     presets.filter(preset=>!preset.installed).map(preset=>h('button',{key:preset.id,className:'rw-card',disabled:busy!==null,onClick:()=>installPreset(preset)},
      h('b',null,preset.title),
      h('span',null,preset.description),
      h('span',null,h('span',{className:'rw-badge ok'},t('subscribe'))))))),
   preview!==null&&h(UpdatePreview,{t,preview,onClose:()=>setPreview(null)}));
 }

 function UpdatePreview(props){
  const {t,preview,onClose}=props;
  return h(Modal,{title:t('previewTitle'),onClose},
   h('dl',{className:'rw-kv'},
    h('dt',null,t('installedRev')),h('dd',null,shortSha(preview.installedRevision)),
    h('dt',null,t('latestRev')),h('dd',null,shortSha(preview.latestRevision)),
    h('dt',null,t('revision')),h('dd',null,preview.syncMode)),
   preview.pendingCommits.length===0
    ?h('div',{className:'rw-note'},t('noUpdate'))
    :h(React.Fragment,null,
     h('h3',{className:'rw-h'},`${t('pendingCommits')} (${preview.pendingCommits.length})`),
     h('pre',null,preview.pendingCommits.map(row=>`${shortSha(row.sha)}  ${row.date}  ${row.subject}`).join('\n'))),
   preview.diffStat!==''&&h(React.Fragment,null,
    h('h3',{className:'rw-h'},t('diffStat')),
    h('pre',null,preview.diffStat)));
 }

 function SkillDetail(props){
  const {t,detail,onClose}=props;
  const guide=skillGuide(t,detail);
  return h(Modal,{title:guide.title,onClose,wide:true},
   h('div',{className:'rw-guide-original'},guide.summary),
   guide.example!==undefined&&h('div',{className:'rw-guide-example'},`${t('skillGuideExample')}：${guide.example}`),
   h('dl',{className:'rw-kv'},
    h('dt',null,t('skillOriginalName')),h('dd',null,detail.name),
    h('dt',null,t('skillSourceLabel')),h('dd',null,`${detail.sourceTitle} · ${shortSha(detail.revision)}`)),
   guide.curated&&h('details',{className:'rw-guide-details'},
    h('summary',null,t('skillOriginalDescription')),
    h('p',{className:'rw-guide-original'},detail.description),
    detail.whenToUse&&h('p',{className:'rw-guide-original'},`${t('skillWhenToUse')}：${detail.whenToUse}`)),
   !guide.curated&&detail.whenToUse&&h('p',{className:'rw-guide-original'},`${t('skillWhenToUse')}：${detail.whenToUse}`),
   h('details',{className:'rw-guide-details'},
    h('summary',null,t('skillOriginalDoc')),
    h('dl',{className:'rw-kv'},
     h('dt',null,t('skillPathLabel')),h('dd',null,detail.skillDirPath),
     h('dt',null,t('sharedDeps')),h('dd',null,detail.sharedDeps.length===0?t('none'):detail.sharedDeps.map(dep=>`${dep.name} ${dep.exists?'✓':'✗'}`).join('  '))),
    h('h3',{className:'rw-h'},t('siblings')),
    h('div',{className:'rw-chiprow'},detail.siblings.map(entry=>h('span',{key:entry.name,className:'rw-badge'},`${entry.kind==='directory'?'▸ ':'· '}${entry.name}`))),
    h('pre',null,detail.content)));
 }

 function SkillsView(props){
  const {t,boot,api,onUseSkill,allowUse=true}=props;
  const rows=skillRows(boot);
  const status=boot?.skillStatus;
  const sources=Array.isArray(status?.sources)?status.sources:[];
  const [category,setCategory]=useState('all');
  const [source,setSource]=useState('all');
  const [query,setQuery]=useState('');
  const [detail,setDetail]=useState(null);

  const needle=query.trim().toLowerCase();
  const filtered=rows.filter(row=>{
   if(category!=='all'&&row.category!==category)return false;
   if(source!=='all'&&row.sourceId!==source)return false;
   return needle===''||matchesSkill(t,row,needle);
  });

  const openDetail=async row=>{
   try{
    const payload=await request(`${API}?action=skill-detail&sourceId=${encodeURIComponent(row.sourceId)}&skillName=${encodeURIComponent(row.name)}`);
    setDetail(payload);
   }catch(cause){
    api.setError(String(cause?.message??cause));
   }
  };

  return h(React.Fragment,null,
   h('div',{className:'rw-page-heading'},h('div',null,
    h('h1',null,t('tabSkills')),
    h('p',null,t('skillsPageHint')))),
   h('div',{className:'rw-support'},
    h('details',{className:'rw-guide-intro'},
     h('summary',null,t('skillIntroTitle')),
     h('p',null,t('skillIntro')),
     h('p',null,t('skillIntroNote'))),
    h('details',{className:'rw-source-disclosure',open:sources.length===0},
     h('summary',null,`${t('manageSources')} (${sources.length})`),
     h(SourcesSection,{t,boot,api}))),
   h('div',{className:'rw-filters'},
    h('label',{className:'rw-filter-field search'},
     h('span',null,t('searchSkills')),
     h('input',{type:'search',value:query,placeholder:t('searchSkills'),onChange:event=>setQuery(event.target.value)})),
    h('label',{className:'rw-filter-field'},
     h('span',null,t('filterCategory')),
     h('select',{value:category,onChange:event=>setCategory(event.target.value)},
      h('option',{value:'all'},t('allCategories')),
      CATEGORIES.map(key=>h('option',{key,value:key},t(`cat${key.charAt(0).toUpperCase()}${key.slice(1)}`))))),
    h('label',{className:'rw-filter-field'},
     h('span',null,t('filterSource')),
     h('select',{value:source,onChange:event=>setSource(event.target.value)},
      h('option',{value:'all'},t('allSources')),
      sources.map(entry=>h('option',{key:entry.id,value:entry.id},entry.title))))),
   h('section',{className:'rw-catalog'},
    h('h2',{className:'rw-h','aria-live':'polite'},t('skillsList'),h('span',{className:'rw-section-count'},filtered.length)),
    filtered.length===0&&h('div',{className:'rw-empty'},t('skillsEmpty')),
    h('div',null,filtered.map(row=>{
     const guide=skillGuide(t,row);
     return h('article',{key:`${row.sourceId}/${row.name}`,className:'rw-skill'},
      h('div',{className:'grow'},
       h('h3',null,guide.title),
       guide.curated&&h('span',{className:'rw-skill-id'},row.name),
       h('div',{className:'desc'},guide.summary),
       h('div',{className:'rw-chiprow'},
        h('span',{className:'rw-badge'},t(`cat${row.category.charAt(0).toUpperCase()}${row.category.slice(1)}`)),
        h('span',{className:'rw-note'},row.sourceTitle),
        row.revision&&h('span',{className:'rw-note'},shortSha(row.revision)),
        row.disabled===true&&h('span',{className:'rw-badge warn'},t('skillDisabled')),
        row.shadowedBy!==undefined&&h('span',{className:'rw-badge warn'},t('shadowedBy')),
        row.sharedDeps.filter(dep=>!dep.exists).map(dep=>h('span',{key:dep.name,className:'rw-badge warn'},`${dep.name} ✗`))),
       guide.example!==undefined&&h('details',{className:'rw-skill-more'},
        h('summary',null,t('skillGuideExample')),
        h('p',{className:'rw-guide-example'},guide.example))),
      h('div',{className:'use'},
       allowUse!==false&&h('button',{onClick:()=>onUseSkill(row)},t('useSkill')),
       h('button',{className:'ghost',onClick:()=>openDetail(row)},t('viewSkill')),
       h('button',{className:'ghost',disabled:api.busy!==null,onClick:()=>api.post('toggle-skill',{sourceId:row.sourceId,name:row.name,enabled:row.disabled===true}).catch(()=>{})},row.disabled===true?t('enable'):t('disable'))));
    }))),
   detail!==null&&h(SkillDetail,{t,detail,onClose:()=>setDetail(null)}));
 }

 function RoleSkillsPicker(props){
  const {t,boot,selected,onChange}=props;
  const rows=skillRows(boot);
  const sources=Array.isArray(boot?.skillStatus?.sources)?boot.skillStatus.sources:[];
  const [query,setQuery]=useState('');
  const [source,setSource]=useState('all');
  const [category,setCategory]=useState('all');
  const keys=new Set(selected.map(skillKey));
  const catalogKeys=new Set(rows.map(row=>`${row.sourceId}/${row.name}`));
  const extras=selected.filter(skill=>!catalogKeys.has(skillKey(skill)));
  const needle=query.trim().toLowerCase();
  const seen=new Set();
  const filtered=rows.filter(row=>{
   const key=`${row.sourceId}/${row.name}`;
   if(seen.has(key))return false;
   if(source!=='all'&&row.sourceId!==source)return false;
   if(category!=='all'&&row.category!==category)return false;
   if(needle!==''&&!matchesSkill(t,row,needle))return false;
   seen.add(key);
   return true;
  });
  const toggle=key=>{
   const next=new Set(keys);
   if(next.has(key))next.delete(key);
   else next.add(key);
   onChange([...next].map(value=>{
    const at=value.indexOf('/');
    return {sourceId:value.slice(0,at),name:value.slice(at+1)};
   }));
  };
  return h(React.Fragment,null,
   h('div',{className:'rw-guide-example'},t('skillPickerIntro')),
   h('div',{className:'rw-form rw-picker-filters'},
    h('input',{type:'text',value:query,'aria-label':t('searchSkills'),placeholder:t('roleSkillsPlaceholder'),onChange:event=>setQuery(event.target.value)}),
    h('select',{value:source,'aria-label':t('filterSource'),onChange:event=>setSource(event.target.value)},
     h('option',{value:'all'},t('allSources')),
     sources.map(entry=>h('option',{key:entry.id,value:entry.id},entry.title))),
    h('select',{value:category,'aria-label':t('filterCategory'),onChange:event=>setCategory(event.target.value)},
     h('option',{value:'all'},t('allCategories')),
     CATEGORIES.map(key=>h('option',{key,value:key},t(`cat${key.charAt(0).toUpperCase()}${key.slice(1)}`))))),
   extras.length>0&&h('div',{className:'rw-selected'},
    h('div',{className:'rw-note'},t('unavailableSkills')),
    extras.map(skill=>h('div',{key:skillKey(skill),className:'rw-selected-row'},
     h('span',{className:'rw-badge warn'},t('skillUnavailable')),
     h('span',{className:'grow'},`${skill.sourceId}/${skill.name}`),
     h('button',{className:'ghost',onClick:()=>toggle(skillKey(skill))},t('remove'))))),
   h('div',{className:'rw-skill-pick'},
    filtered.length===0&&h('div',{className:'rw-empty'},t('skillsEmpty')),
    filtered.map(row=>{
     const key=`${row.sourceId}/${row.name}`;
     const guide=skillGuide(t,row);
     const categoryLabel=t(`cat${row.category.charAt(0).toUpperCase()}${row.category.slice(1)}`);
     return h('div',{key,className:'rw-pick-entry'},
      h('label',{className:'rw-check'},
       h('input',{type:'checkbox',checked:keys.has(key),onChange:()=>toggle(key)}),
       h('span',{className:'grow'},
        h('b',null,guide.title),
        h('span',{className:'rw-pick-purpose'},guide.summary),
        h('span',null,`${row.name} · ${row.sourceTitle} · ${categoryLabel}${row.disabled===true?` · ${t('skillDisabled')}`:''}${row.shadowedBy!==undefined?` · ${t('shadowedBy')}`:''}`))),
      h('details',{className:'rw-pick-more'},
       h('summary',null,t('skillGuideDetails')),
       guide.example!==undefined&&h('p',{className:'rw-guide-example'},`${t('skillGuideExample')}：${guide.example}`),
       h('p',{className:'rw-guide-original'},`${t('skillOriginalDescription')}：${row.description}`),
       row.whenToUse&&h('p',{className:'rw-guide-original'},`${t('skillWhenToUse')}：${row.whenToUse}`)));
    })));
 }

 function AssistantChooser(props){
  const {t,boot,request,onClose,onCreate,disabled}=props;
  if(request===null||request===undefined)return null;
  const entries=Array.isArray(request.entries)?request.entries:[];
  const pick=entry=>{request.onPick?.(entry);onClose();};
  return h(Modal,{title:request.title??t('chooseAssistant'),onClose},
   h('div',{className:'rw-note'},t('chooseAssistantHint')),
   entries.length===0&&h('div',{className:'rw-empty'},t('noAssistantForSkill')),
   entries.map(entry=>h('div',{key:entry.botId,className:'rw-row'},
    h('div',{className:'grow'},
     h('b',{className:'rw-name'},entry.name??entry.botId),
     h('span',{className:'rw-sub'},`${templateLabel(t,boot,entry.templateId)} · ${entry.model??'—'}`),
     h('div',{className:'rw-chiprow',style:{marginTop:'3px'}},
      (entry.skills??[]).filter(skill=>skill.available===true).slice(0,4).map(skill=>h('span',{key:skillKey(skill),className:'rw-badge'},skill.name)))),
    h('div',{className:'rw-act'},
     h('button',{className:'rw-primary',disabled:entry.sessionId===null,onClick:()=>pick(entry)},t('openChat'))))),
   h('div',{className:'rw-modal-actions',style:{marginTop:'8px'}},
    h('button',{className:'ghost',onClick:onClose},t('cancel')),
    h('button',{onClick:()=>{onClose();onCreate();},disabled:disabled===true},t('createAssistantFirst'))));
 }

 function markedBots(bots,transactionId){
  const needle=rwMarker(transactionId);
  return (Array.isArray(bots)?bots:[]).filter(bot=>typeof bot.instructions==='string'&&bot.instructions.includes(needle));
 }

 function roleInstructions(t,template,selected,transactionId){
  const purpose=t(template.purposeKey);
  const names=selected.map(skill=>skill.name).join(', ')||t('skillsEmptySelected');
  return `你是科研工作台的科研助手。职责：${purpose}。\n你只能使用分配给这个助手的科研技能：${names}。需要方法细节时先读取对应 SKILL.md 及其同级资源。\n${rwMarker(transactionId)}`;
 }

 function RoleCreateDialog(props){
  const {t,boot,api,pending,project,onClose,onCreated}=props;
  const templates=roleTemplates(boot);
  const initialTemplate=templates.find(item=>item.id===pending?.templateId)??templates[0];
  const projectId=typeof project?.workspaceId==='string'?project.workspaceId:null;
  const [activePending,setActivePending]=useState(pending??null);
  const [templateId,setTemplateId]=useState(initialTemplate?.id);
  const [name,setName]=useState(pending?.name??defaultAssistantName(project,initialTemplate===undefined?t('assistantName'):t(initialTemplate.labelKey)));
  const editedName=useRef(typeof pending?.name==='string');
  const [selected,setSelected]=useState(()=>{
   if(Array.isArray(pending?.skills)&&pending.skills.length>0)return pending.skills.map(skill=>({sourceId:skill.sourceId,name:skill.name}));
   const template=templates[0];
   return template===undefined?[]:template.skills.map(skill=>({sourceId:skill.sourceId,name:skill.name}));
  });
  const [model,setModel]=useState(pending?.model??'');
  const [workDir,setWorkDir]=useState(pending?.workDir??(project?.path??''));
  const [ds,setDs]=useState(undefined);
  const [dsError,setDsError]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);

  useEffect(()=>{
   let live=true;
   botApi('state',{}).then(value=>{
    if(!live)return;
    setDs(value);
    const served=Array.isArray(value?.models)?value.models:[];
    const preferred=served.find(entry=>entry.ref===value?.defaultModel)??served[0];
    if(preferred!==undefined)setModel(current=>current===''?preferred.ref:current);
   }).catch(cause=>{if(live)setDsError(String(cause?.message??cause));});
   return()=>{live=false;};
  },[]);

  const template=templates.find(item=>item.id===templateId)??templates[0];
  const models=Array.isArray(ds?.models)?ds.models:[];

  const chooseTemplate=id=>{
   setTemplateId(id);
   const next=templates.find(item=>item.id===id);
   if(next!==undefined){
    setSelected(next.skills.map(skill=>({sourceId:skill.sourceId,name:skill.name})));
    if(!editedName.current)setName(defaultAssistantName(project,t(next.labelKey)));
   }
  };

  const changeName=value=>{
   editedName.current=true;
   setName(value);
  };

  const pickFolder=async()=>{
   const uiWorkspace=svc('uiWorkspace');
   if(uiWorkspace?.pickDirectory===undefined)return;
   try{
    const path=await uiWorkspace.pickDirectory();
    if(typeof path==='string')setWorkDir(path);
   }catch(cause){
    setError(String(cause?.message??cause));
   }
  };

  const signature=value=>JSON.stringify({
   templateId:value?.templateId??null,
   name:value?.name??'',
   skills:(value?.skills??[]).map(skill=>`${skill.sourceId}/${skill.name}`).sort(),
   workspaceId:value?.workspaceId||null,
   model:value?.model??'',
   workDir:value?.workDir??'',
  });
  const changed=activePending!==null&&signature({templateId,name,skills:selected,workspaceId:projectId,model,workDir:workDir.trim()})!==signature(activePending);

  const finish=async()=>{
   await api.refresh();
   onCreated?.();
   onClose();
  };

  const submit=async()=>{
   setBusy(true);
   setError(null);
   try{
    if(template===undefined)throw new Error(t('roleConfigError'));
    if(name.trim()==='')throw new Error(t('assistantName'));
    if(model==='')throw new Error(t('modelRequired'));
    let dsState=await botApi('state',{});
    let transactionId=activePending?.transactionId;

    // A previous attempt may have created the Bot but lost its response.
    if(transactionId!==undefined){
     const matches=markedBots(dsState?.bots,transactionId);
     if(matches.length>1)throw new Error(t('pendingConflict'));
     if(matches.length===1){
      await api.post('complete-role',{transactionId,botId:matches[0].id});
      await finish();
      return;
     }
    }

    if(transactionId!==undefined&&changed){
     await api.post('cancel-role',{transactionId});
     transactionId=undefined;
     setActivePending(null);
    }
    if(transactionId===undefined){
     const prepared=await api.post('prepare-role',{
      templateId:template.id,
      name:name.trim(),
      skills:selected,
      ...(projectId===null?{}:{workspaceId:projectId}),
      ...(model===''?{}:{model}),
      ...(workDir.trim()===''?{}:{workDir:workDir.trim()}),
     });
     transactionId=prepared.transactionId;
     setActivePending(prepared.pending===undefined
      ?{transactionId,templateId:template.id,name:name.trim(),skills:selected,workspaceId:projectId,model,workDir:workDir.trim()}
      :{...prepared.pending,transactionId});
    }

    const instructions=roleInstructions(t,template,selected,transactionId);
    let bot;
    try{
     bot=await botApi('create-bot',{
      name:name.trim(),
      role:t(template.labelKey),
      instructions,
      model,
      ...(workDir.trim()===''?{}:{workDir:workDir.trim()}),
     });
    }catch(cause){
     const after=await botApi('state',{}).catch(()=>undefined);
     const matches=after===undefined?[]:markedBots(after?.bots,transactionId);
     if(matches.length===1){
      await api.post('complete-role',{transactionId,botId:matches[0].id});
      await finish();
      return;
     }
     await api.post('cancel-role',{transactionId}).catch(()=>{});
     throw cause;
    }
    await api.post('complete-role',{transactionId,botId:bot.id});
    await finish();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  const cancelPending=async()=>{
   if(activePending===null)return;
   setBusy(true);
   try{
    await api.post('cancel-role',{transactionId:activePending.transactionId});
    setActivePending(null);
    api.setNotice('pendingCancelled');
    onClose();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  return h(Modal,{title:t('newAssistant'),onClose,wide:true},
   dsError!==null&&h('div',{className:'rw-error',role:'alert'},dsError),
   projectId===null
    ?h('div',{className:'rw-note'},t('unassignedCreateHint'))
    :h(React.Fragment,null,
      h('dl',{className:'rw-kv'},
       h('dt',null,t('assistantProject')),h('dd',null,`${project.title||basename(project.path)}${project.path===''?'':` · ${project.path}`}`),
       h('dt',null,t('assistantWorkDir')),h('dd',null,t('fixedProjectHint'))),
      project?.unavailable===true&&h('span',{className:'rw-badge err'},t('projectUnavailable'))),
   activePending!==null&&h('div',{className:'rw-pending'},
    h('b',null,t('pendingTitle')),
    h('span',{className:'rw-note'},t('pendingHint')),
    h('div',{className:'rw-form'},
     h('button',{className:'ghost',disabled:busy,onClick:cancelPending},t('cancelPending')))),
   templates.length===0&&h('div',{className:'rw-error',role:'alert'},boot?.roleStatus?.error??t('roleConfigError')),
   templates.length>0&&h(React.Fragment,null,
    h('div',{className:'rw-field'},
     h('label',null,t('assistantTemplate')),
     h('select',{value:templateId,onChange:event=>chooseTemplate(event.target.value),disabled:busy||activePending!==null},
      templates.map(item=>h('option',{key:item.id,value:item.id},`${t(item.labelKey)} — ${t(item.purposeKey)}`)))),
    h('div',{className:'rw-form-grid'},
     h('div',{className:'rw-field'},h('label',null,t('assistantName')),h('input',{type:'text',value:name,onChange:event=>changeName(event.target.value),disabled:busy})),
     h('div',{className:'rw-field'},h('label',null,t('assistantModel')),
      models.length===0
       ?h('div',{className:'rw-note'},t('modelsEmpty'))
       :h('select',{value:model,onChange:event=>setModel(event.target.value),disabled:busy},
        models.map(entry=>h('option',{key:entry.ref,value:entry.ref},`${entry.providerName} · ${entry.name}${entry.needsKey===true?' !':''}`))))),
    h('div',{className:'rw-field'},
     h('label',null,t('assistantWorkDir')),
     h('div',{className:'rw-form'},
      h('input',{type:'text',value:workDir,onChange:event=>setWorkDir(event.target.value),disabled:busy}),
      h('button',{className:'ghost',onClick:pickFolder,disabled:busy},t('workDirPick')))),
    h('div',{className:'rw-field'},
     h('label',null,`${t('assistantSkills')} (${selected.length})`),
     h(RoleSkillsPicker,{t,boot,selected,onChange:setSelected})),
    h('div',{className:'rw-note'},t('roleCreateHint')),
    error!==null&&h('div',{className:'rw-error',role:'alert'},error),
    h('div',{className:'rw-modal-actions'},
     h('button',{className:'ghost',onClick:onClose,disabled:busy},t('cancel')),
     h('button',{className:'rw-primary',onClick:submit,disabled:busy||models.length===0||name.trim()===''},busy?t('creating'):t('create')))));
 }

 function RoleSkillsDialog(props){
  const {t,boot,api,entry,onClose}=props;
  const [selected,setSelected]=useState((entry.skills??[]).map(skill=>({sourceId:skill.sourceId,name:skill.name})));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  const save=async()=>{
   setBusy(true);
   setError(null);
   try{
    await api.post('set-role-skills',{botId:entry.botId,skills:selected});
    api.setNotice('saved');
    await api.refresh();
    onClose();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };
  return h(Modal,{title:`${t('editSkills')} · ${entry.name??entry.botId}`,onClose,wide:true},
   (entry.conflicts??[]).length>0&&h('div',{className:'rw-pending'},
    h('b',null,t('conflictHint')),
    h('div',{className:'rw-chiprow'},entry.conflicts.map(conflict=>h('span',{key:`${conflict.kind}:${conflict.name}`,className:'rw-badge warn'},conflict.name)))),
   h(RoleSkillsPicker,{t,boot,selected,onChange:setSelected}),
   error!==null&&h('div',{className:'rw-error',role:'alert'},error),
   h('div',{className:'rw-modal-actions'},
    h('button',{className:'ghost',onClick:onClose,disabled:busy},t('cancel')),
    h('button',{className:'rw-primary',onClick:save,disabled:busy},busy?t('loading'):t('save'))));
 }

 function RoleSettingsDialog(props){
  const {t,api,entry,onClose}=props;
  const [name,setName]=useState(entry.name??'');
  const [model,setModel]=useState(entry.model??'');
  const [workDir,setWorkDir]=useState(entry.workDir??'');
  const [ds,setDs]=useState(undefined);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  useEffect(()=>{
   let live=true;
   botApi('state',{}).then(value=>{if(live)setDs(value);}).catch(cause=>{if(live)setError(String(cause?.message??cause));});
   return()=>{live=false;};
  },[]);
  const models=Array.isArray(ds?.models)?ds.models:[];
  const pickFolder=async()=>{
   const uiWorkspace=svc('uiWorkspace');
   if(uiWorkspace?.pickDirectory===undefined)return;
   try{
    const path=await uiWorkspace.pickDirectory();
    if(typeof path==='string')setWorkDir(path);
   }catch(cause){
    setError(String(cause?.message??cause));
   }
  };
  const save=async()=>{
   setBusy(true);
   setError(null);
   try{
    const patch={id:entry.botId,name:name.trim(),model};
    if(workDir.trim()!==(entry.workDir??'').trim())patch.workDir=workDir.trim();
    await botApi('update-bot',patch);
    api.setNotice('saved');
    await api.refresh();
    onClose();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };
  return h(Modal,{title:`${t('editSettings')} · ${entry.name??entry.botId}`,onClose},
   h('div',{className:'rw-field'},h('label',null,t('assistantName')),h('input',{type:'text',value:name,onChange:event=>setName(event.target.value),disabled:busy})),
   h('div',{className:'rw-field'},h('label',null,t('assistantModel')),
    models.length===0
     ?h('div',{className:'rw-note'},`${t('modelsEmpty')}${entry.model===null?'':` (${entry.model})`}`)
     :h('select',{value:model,onChange:event=>setModel(event.target.value),disabled:busy},
      models.map(option=>h('option',{key:option.ref,value:option.ref},`${option.providerName} · ${option.name}${option.needsKey===true?' !':''}`)))),
   h('div',{className:'rw-field'},
    h('label',null,t('assistantWorkDir')),
    h('div',{className:'rw-form'},
     h('input',{type:'text',value:workDir,onChange:event=>setWorkDir(event.target.value),disabled:busy}),
     h('button',{className:'ghost',onClick:pickFolder,disabled:busy},t('workDirPick')))),
   error!==null&&h('div',{className:'rw-error',role:'alert'},error),
   h('div',{className:'rw-modal-actions'},
    h('button',{className:'ghost',onClick:onClose,disabled:busy},t('cancel')),
    h('button',{className:'rw-primary',onClick:save,disabled:busy||name.trim()===''},busy?t('loading'):t('save'))));
 }

 function RoleDeleteDialog(props){
  const {t,api,entry,onClose}=props;
  const [deleteBot,setDeleteBot]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  const remove=async()=>{
   setBusy(true);
   setError(null);
   try{
    await api.post('remove-role',{botId:entry.botId});
    api.setNotice('assistantRemoved');
    if(deleteBot){
     await botApi('delete-bot',{id:entry.botId});
     api.setNotice('botDeleted');
    }
    await api.refresh();
    onClose();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };
  return h(Modal,{title:`${t('deleteRole')} · ${entry.name??entry.botId}`,onClose},
   h('div',{className:'rw-note'},t('deleteRoleHint')),
   h('label',{className:'rw-check'},
    h('input',{type:'checkbox',checked:deleteBot,onChange:event=>setDeleteBot(event.target.checked)}),
    h('span',{className:'grow'},h('b',null,t('deleteBotToo')),h('span',null,entry.model??''))),
   error!==null&&h('div',{className:'rw-error',role:'alert'},error),
   h('div',{className:'rw-modal-actions'},
    h('button',{className:'ghost',onClick:onClose,disabled:busy},t('cancel')),
    h('button',{className:'rw-primary',onClick:remove,disabled:busy},busy?t('loading'):t('remove'))));
 }

 /**
  * Group chats that include at least one of the project's assistants.
  *
  * DS-Bot owns these rooms: membership, replies, permissions, and history stay
  * there. The project only shows the rooms its assistants take part in and
  * offers the same folder/default actions DS-Bot has.
  */
 function ProjectRoomsPanel(props){
  const {t,api,project,entries,workspaces,onManage}=props;
  const [ds,setDs]=useState(undefined);
  const [error,setError]=useState(null);
  const [busy,setBusy]=useState(false);
  const [createOpen,setCreateOpen]=useState(false);
  const [dirRoom,setDirRoom]=useState(null);
  const [dirError,setDirError]=useState(null);
  const [dirBusy,setDirBusy]=useState(false);

  const load=useCallback(async()=>{
   setBusy(true);
   try{
    const state=await botApi('state',{});
    setDs(state);
    setError(null);
    return state;
   }catch(cause){
    setError(String(cause?.message??cause));
    return undefined;
   }finally{
    setBusy(false);
   }
  },[]);

  useEffect(()=>{void load();},[load,project?.workspaceId]);

  const bots=useMemo(()=>new Map((Array.isArray(ds?.bots)?ds.bots:[]).map(bot=>[bot.id,bot])),[ds]);
  const memberIds=useMemo(()=>new Set(entries.map(entry=>entry.botId)),[entries]);
  const teamWorkspace=projectById(projectList(workspaces),ds?.workspaceId);
  const teamIsProject=project!==undefined&&teamWorkspace!==undefined&&sameFolder(teamWorkspace.path,project.path);
  const rooms=useMemo(()=>{
   const rows=Array.isArray(ds?.rooms)?ds.rooms:[];
   return rows.filter(room=>room?.hidden!==true&&roomMembersOf(room).some(id=>memberIds.has(id)));
  },[ds,memberIds]);
  const validEntries=entries.filter(entry=>entry.missing!==true&&typeof entry.botId==='string');

  const memberLabel=id=>bots.get(id)?.name??id;
  const memberFolder=id=>bots.get(id)?.workDir??t('dsBotTeamFolder');

  const openRoom=async room=>{
   const opened=await openListedSession(room.id);
   if(!opened)api.setError('roomOpenFailed');
   else api.setNotice(null);
  };

  const setDir=async room=>{
   setDirBusy(true);
   setDirError(null);
   try{
    await botApi('update-room',{id:room.id,workDir:project.path});
    api.setNotice('roomDirSet');
    await load();
   }catch(cause){
    setDirError(String(cause?.message??cause));
   }finally{
    setDirBusy(false);
   }
  };

  const dirText=room=>{
   const members=roomMembersOf(room);
   if(teamIsProject||(typeof room.workDir!=='string'||room.workDir==='')){
    return `${t('roomMemberDirs')}：${members.map(id=>`${memberLabel(id)} · ${memberFolder(id)}`).join('；')}`;
   }
   return `${t('projectPath')}：${room.workDir}`;
  };

  return h('section',{className:'rw-panel'},
   h('div',{className:'rw-section-head'},
    h('h2',{className:'rw-h'},t('projectRooms'),h('span',{className:'rw-section-count'},rooms.length)),
    h('div',{className:'rw-act'},
     h('button',{className:'ghost',onClick:()=>load(),disabled:busy},t('refreshRooms')),
     h('button',{onClick:()=>setCreateOpen(true),disabled:busy||validEntries.length<2},t('newRoom')))),
   h('div',{className:'rw-note'},t('roomsHint')),
   error!==null&&h('div',{className:'rw-error',role:'alert'},`${t('roomsUnavailable')} ${error}`,h('div',null,h('button',{className:'ghost',onClick:()=>load()},t('retry')))),
   ds!==undefined&&rooms.length===0&&h('div',{className:'rw-empty'},t('roomsEmpty')),
   rooms.map(room=>{
    const members=roomMembersOf(room);
    const mixed=members.some(id=>!memberIds.has(id));
    const hasOwnDir=!teamIsProject&&typeof room.workDir==='string'&&room.workDir!=='';
    return h('div',{key:room.id,className:'rw-row'},
     h('div',{className:'grow'},
      h('b',{className:'rw-name'},room.name??room.id),
      h('span',{className:'rw-sub'},members.map(memberLabel).join('、')),
      mixed&&h('span',{className:'rw-badge warn'},t('roomMixed')),
      h('span',{className:'rw-sub'},dirText(room))),
     h('div',{className:'rw-act'},
      h('button',{onClick:()=>{void openRoom(room);}},t('openRoom')),
      h('button',{className:'ghost',onClick:()=>onManage?.(room)},t('manageInDsBot')),
      project!==undefined&&!teamIsProject&&!sameFolder(room.workDir,project.path)
       ?h('button',{className:'ghost',disabled:dirBusy,onClick:()=>{setDirRoom(room);void setDir(room);}},t('setProjectDir'))
       :null));
   }),
   dirRoom!==null&&dirError!==null&&h('div',{className:'rw-error',role:'alert'},
    t('roomDirFailed'),
    h('div',null,dirError),
    h('div',{className:'rw-form'},
     h('button',{className:'ghost',disabled:dirBusy,onClick:()=>{void setDir(dirRoom);}},t('retryRoomDir')),
     h('button',{className:'ghost',onClick:()=>{setDirRoom(null);setDirError(null);}},t('close')))),
   createOpen&&h(RoomCreateDialog,{t,api,project,entries:validEntries,isTeamProject:teamIsProject,
    onClose:()=>setCreateOpen(false),onCreated:()=>{void load();}}));
 }

 /** Create a DS-Bot group chat for this project, then give it the project folder. */
 function RoomCreateDialog(props){
  const {t,api,project,entries,isTeamProject,onClose,onCreated}=props;
  const [name,setName]=useState(project===undefined?'':truncateUtf16(`${project.title||basename(project.path)}`,60));
  const [members,setMembers]=useState(()=>entries.slice(0,2).map(entry=>entry.botId));
  const [admin,setAdmin]=useState(()=>entries[0]?.botId);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  const [candidates,setCandidates]=useState(null);
  const [created,setCreated]=useState(null);
  const ready=name.trim()!==''&&name.trim().length<=60&&members.length>=2&&members.length<=12&&typeof admin==='string'&&members.includes(admin);

  const toggle=id=>{
   setMembers(current=>{
    const next=current.includes(id)?current.filter(value=>value!==id):[...current,id];
    setAdmin(currentAdmin=>(typeof currentAdmin==='string'&&next.includes(currentAdmin)?currentAdmin:next[0]));
    return next;
   });
  };

  const finish=async roomId=>{
   try{await api.refresh();}catch{}
   const opened=await openListedSession(roomId);
   onCreated?.();
   if(opened){onClose();return;}
   setCreated(current=>({...(current??{}),id:roomId,openFailed:true}));
  };

  const applyDir=async roomId=>{
   if(isTeamProject){await finish(roomId);return;}
   try{
    await botApi('update-room',{id:roomId,workDir:project.path});
   }catch(cause){
    onCreated?.();
    setCreated({id:roomId,dirError:String(cause?.message??cause)});
    return;
   }
   await finish(roomId);
  };

  const submit=async()=>{
   if(!ready)return;
   setBusy(true);
   setError(null);
   const cleanName=name.trim();
   try{
    const before=await botApi('state',{});
    const beforeRooms=Array.isArray(before?.rooms)?before.rooms:[];
    const beforeIds=new Set(beforeRooms.map(room=>room.id));
    if(beforeRooms.some(room=>room.hidden!==true&&room.name===cleanName))throw new Error(t('roomNameTaken'));
    let roomId;
    try{
     const room=await botApi('create-room',{name:cleanName,members,admin});
     roomId=room?.id;
    }catch(cause){
     // The response may be lost after DS-Bot already wrote the group: look for
     // exactly the group this form asked for instead of creating a second one.
     const after=await botApi('state',{}).catch(()=>undefined);
     const rows=Array.isArray(after?.rooms)?after.rooms:[];
     const found=rows.filter(room=>!beforeIds.has(room.id)&&room.name===cleanName&&sameMembers(room.members,members)&&(room.admin??null)===admin);
     // Even one candidate is the user's call: DS-Bot may hold a group made
     // meanwhile, and only the user saw what this form asked for.
     if(found.length>0){setCandidates(found);return;}
     throw cause;
    }
    if(typeof roomId!=='string'||roomId==='')throw new Error(t('roomNoCandidate'));
    await applyDir(roomId);
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  if(candidates!==null){
   return h(Modal,{title:t('newRoom'),onClose},
    h('div',{className:'rw-note'},t('roomCandidates')),
    candidates.map(room=>h('div',{key:room.id,className:'rw-row'},
     h('div',{className:'grow'},
      h('b',{className:'rw-name'},room.name??room.id),
      h('span',{className:'rw-sub'},roomMembersOf(room).map(id=>entries.find(entry=>entry.botId===id)?.name??id).join('、'))),
     h('button',{className:'rw-primary',disabled:busy,onClick:()=>{setBusy(true);void applyDir(room.id).finally(()=>setBusy(false));}},t('confirmRoom')))),
    h('div',{className:'rw-modal-actions'},h('button',{className:'ghost',onClick:onClose},t('close'))));
  }

  if(created!==null){
   return h(Modal,{title:t('newRoom'),onClose},
    h('div',{className:created.dirError!==undefined||created.openFailed===true?'rw-error':'rw-ok',role:'status'},
     created.dirError!==undefined?t('roomDirFailed'):created.openFailed===true?t('roomOpenFailed'):t('roomCreated')),
    created.dirError!==undefined&&h('div',{className:'rw-note'},created.dirError),
    created.openFailed===true&&isTeamProject&&h('div',{className:'rw-note'},t('roomMemberDirs')),
    h('div',{className:'rw-modal-actions'},
     created.dirError!==undefined&&h('button',{className:'ghost',disabled:busy,onClick:()=>{setBusy(true);setCreated({id:created.id});void applyDir(created.id).finally(()=>setBusy(false));}},t('retryRoomDir')),
     h('button',{className:'ghost',disabled:busy,onClick:()=>{setBusy(true);void finish(created.id).finally(()=>setBusy(false));}},t('openRoom')),
     h('button',{className:'ghost',onClick:onClose},t('close'))));
  }

  return h(Modal,{title:t('newRoom'),onClose},
   h('div',{className:'rw-note'},t('roomsHint')),
   h('div',{className:'rw-field'},h('label',null,t('roomName')),
    h('div',{className:'rw-form'},
     h('input',{type:'text',value:name,onChange:event=>setName(event.target.value),disabled:busy}),
     h('span',{className:'rw-badge'},`${name.trim().length}/60`))),
   h('div',{className:'rw-field'},h('label',null,`${t('roomMembers')} (${members.length})`),
    h('div',{className:'rw-skill-pick'},
     entries.map(entry=>h('label',{key:entry.botId,className:'rw-check'},
      h('input',{type:'checkbox',checked:members.includes(entry.botId),disabled:busy,onChange:()=>toggle(entry.botId)}),
      h('span',{className:'grow'},
       h('b',null,entry.name??entry.botId),
       h('span',null,entry.workDir??t('dsBotTeamFolder'))))))),
   members.length<2&&h('div',{className:'rw-note'},t('roomNeedMembers')),
   h('div',{className:'rw-field'},h('label',null,t('roomAdmin')),
    h('select',{value:admin??'',disabled:busy,onChange:event=>setAdmin(event.target.value)},
     members.map(id=>h('option',{key:id,value:id},entries.find(entry=>entry.botId===id)?.name??id)))),
   isTeamProject&&h('div',{className:'rw-note'},t('roomMemberDirs')),
   error!==null&&h('div',{className:'rw-error',role:'alert'},error),
   h('div',{className:'rw-modal-actions'},
    h('button',{className:'ghost',onClick:onClose,disabled:busy},t('cancel')),
    h('button',{className:'rw-primary',onClick:submit,disabled:busy||!ready},busy?t('creating'):t('roomCreate'))));
 }

 /**
  * Move one assistant's project ownership, and optionally its working folder.
  *
  * Saving the ownership and changing the folder are two DS-Bot/workbench
  * writes. The ownership is saved first and reported honestly when the folder
  * update fails, so a retry never loses the project the user chose.
  */
 function ProjectAssignDialog(props){
  const {t,api,entry,project,mode,onClose}=props;
  const [setDir,setSetDir]=useState(mode==='join');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  const [saved,setSaved]=useState(false);
  const [dirFailed,setDirFailed]=useState(false);

  const applyFolder=async()=>{
   await botApi('update-bot',{id:entry.botId,workDir:project.path});
   setDirFailed(false);
  };

  const assign=async()=>{
   setBusy(true);
   setError(null);
   try{
    await api.post('set-role-project',{botId:entry.botId,workspaceId:project.workspaceId,expectedWorkspaceId:entry.workspaceId??null});
    setSaved(true);
    if(setDir){
     try{
      await applyFolder();
     }catch(cause){
      setDirFailed(true);
      setError(String(cause?.message??cause));
      await api.refresh();
      return;
     }
    }
    api.setNotice('joinedProject');
    await api.refresh();
    onClose();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  const retryFolder=async()=>{
   setBusy(true);
   setError(null);
   try{
    await applyFolder();
    api.setNotice('joinedProject');
    await api.refresh();
    if(mode!=='dir')onClose();
   }catch(cause){
    setDirFailed(true);
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  const leave=async()=>{
   setBusy(true);
   setError(null);
   try{
    await api.post('set-role-project',{botId:entry.botId,workspaceId:null,expectedWorkspaceId:entry.workspaceId??null});
    api.setNotice('leftProject');
    await api.refresh();
    onClose();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  const detach=async()=>{
   setBusy(true);
   setError(null);
   try{
    // The join already saved the new owner; the entry prop still shows the old one.
    await api.post('set-role-project',{botId:entry.botId,workspaceId:null,expectedWorkspaceId:saved?project.workspaceId:(entry.workspaceId??null)});
    api.setNotice('leftProject');
    await api.refresh();
   }catch(cause){
    setError(String(cause?.message??cause));
   }finally{
    setBusy(false);
   }
  };

  const title=mode==='join'?t('joinTitle'):mode==='leave'?t('leaveProject'):t('setProjectDir');
  const canLeave=saved&&mode==='join';

  return h(Modal,{title:`${title} · ${entry.name??entry.botId}`,onClose},
   project!==undefined&&h('dl',{className:'rw-kv'},
    h('dt',null,t('projectPath')),h('dd',null,project.path)),
   mode==='leave'
    ?h('div',{className:'rw-note'},t('leaveHint'))
    :mode==='join'
     ?h(React.Fragment,null,
       h('div',{className:'rw-note'},t('joinHint')),
       h('label',{className:'rw-check'},
        h('input',{type:'checkbox',checked:setDir,disabled:busy||saved,onChange:event=>setSetDir(event.target.checked)}),
        h('span',{className:'grow'},h('b',null,t('joinSetDir')),h('span',null,project?.path??''))),
       !setDir&&h('div',{className:'rw-note'},t('joinKeepDir')))
     :h('div',{className:'rw-note'},t('joinHint')),
   dirFailed&&h('div',{className:'rw-error',role:'alert'},t('dirUpdateFailed')),
   error!==null&&h('div',{className:'rw-error',role:'alert'},error),
   h('div',{className:'rw-modal-actions'},
    h('button',{className:'ghost',onClick:onClose,disabled:busy},t('close')),
    dirFailed&&h('button',{className:'ghost',disabled:busy,onClick:retryFolder},t('retrySetDir')),
    canLeave&&h('button',{className:'ghost rw-danger',disabled:busy,onClick:detach},t('leaveProject')),
    mode==='leave'&&h('button',{className:'rw-primary',disabled:busy,onClick:leave},t('leaveProject')),
    mode==='dir'&&!dirFailed&&h('button',{className:'rw-primary',disabled:busy,onClick:retryFolder},t('save')),
    mode==='join'&&!saved&&h('button',{className:'rw-primary',disabled:busy,onClick:assign},busy?t('loading'):t('joinProject'))));
 }

 function AssistantsView(props){
  const {t,boot,api,workspaces,workspaceId,onSelectProject,onCreate,onOpen}=props;
  const items=projectList(workspaces);
  const project=projectById(items,workspaceId);
  const entries=roleEntries(boot);
  const status=boot?.roleStatus;
  const projectEntries=projectEntriesOf(entries,workspaceId);
  const unassigned=entries.filter(entry=>entry.workspaceId===null||entry.workspaceId===undefined);
  const orphan=orphanEntriesOf(entries,items);
  const [dialog,setDialog]=useState(null);
  const [newProject,setNewProject]=useState(false);
  const disabled=status?.compatible!==true;

  const card=(entry,actions)=>h('article',{key:entry.botId,className:'rw-assistant'},
   h('div',{className:'rw-assistant-head'},
    h('span',{className:'rw-avatar','aria-hidden':true},Array.from(entry.name||entry.botId)[0]),
    h('div',{className:'grow'},
     h('h2',{className:'rw-assistant-name'},entry.name??entry.botId),
     h('div',{className:'rw-assistant-sub'},templateLabel(t,boot,entry.templateId)))),
   h('div',{className:'rw-assistant-meta'},
    h('span',null,`${t('assistantModel')}：${entry.model??'—'}`),
    h('span',null,`${t('assistantWorkDir')}：${entry.workDir??t('dsBotTeamFolder')}`),
    entry.workspaceId!==null&&entry.workspaceId!==undefined&&h('span',null,`${t('assistantProject')}：${projectById(items,entry.workspaceId)?.title??t('orphanAssistants')}`)),
   entry.missing===true&&h('span',{className:'rw-badge err'},t('roleMissingBot')),
   (entry.conflicts??[]).length>0&&h('div',{className:'rw-chiprow'},
    entry.conflicts.map(conflict=>h('span',{key:`${conflict.kind}:${conflict.name}`,className:'rw-badge warn'},`${conflict.name} · ${t('skillConflict')}`))),
   (entry.skills??[]).some(skill=>roleSkillReason(t,skill)!==null)&&h('div',{className:'rw-chiprow'},
    (entry.skills??[]).map(skill=>{
     const reason=roleSkillReason(t,skill);
     return reason===null?null:h('span',{key:skillKey(skill),className:'rw-badge warn'},`${skillGuide(t,skill).title} · ${reason}`);
    })),
   h('details',{className:'rw-assigned'},
    h('summary',null,`${t('assignedSkills')} (${(entry.skills??[]).length})`),
    h('div',{className:'rw-chiprow'},(entry.skills??[]).map(skill=>{
     const reason=roleSkillReason(t,skill);
     return h('span',{key:skillKey(skill),className:`rw-badge ${reason===null?'':'warn'}`},
      `${skillGuide(t,skill).title}${reason===null?'':` · ${reason}`}`);
    }))),
   h('div',{className:'rw-assistant-actions'},
    h('button',{disabled:entry.sessionId===null,onClick:()=>onOpen(entry)},t('openChat')),
    h('button',{className:'ghost',onClick:()=>setDialog({kind:'skills',entry}),disabled},t('editSkills')),
    h('button',{className:'ghost',onClick:()=>setDialog({kind:'settings',entry}),disabled},t('assistantSettings')),
    h('button',{className:'ghost rw-danger',onClick:()=>setDialog({kind:'delete',entry})},t('deleteRole')),
    actions??null));

  const section=(title,rows,extra)=>h(React.Fragment,null,
   h('div',{className:'rw-section-head'},
    h('h2',{className:'rw-h'},title,h('span',{className:'rw-section-count'},rows.length)),
    extra??null),
   rows.length===0&&h('div',{className:'rw-empty'},t('assistantsEmpty')),
   h('div',{className:'rw-assistant-grid'},rows));

  const rowsFor=(entry)=>entry.workspaceId===null||entry.workspaceId===undefined
   ?h('button',{className:'ghost',disabled:project===undefined||disabled,onClick:()=>setDialog({kind:'join',entry})},t('joinProject'))
   :h(React.Fragment,null,
    entry.workspaceId===project?.workspaceId&&!sameFolder(entry.workDir,project?.path)
     ?h('button',{className:'ghost',onClick:()=>setDialog({kind:'dir',entry})},t('setProjectDir'))
     :null,
    h('button',{className:'ghost',onClick:()=>setDialog({kind:'leave',entry})},t('leaveProject')));

  return h(React.Fragment,null,
   h('div',{className:'rw-page-heading'},
    h('div',null,
     h('h1',null,t('assistants'),h('span',{className:'rw-section-count'},entries.length)),
     h('p',null,t('assistantsPageHint'))),
    h('div',{className:'rw-act'},
     h('select',{value:project?.workspaceId??'','aria-label':t('projects'),onChange:event=>onSelectProject(event.target.value===''?undefined:event.target.value)},
      h('option',{value:''},t('unassigned')),
      items.map(item=>h('option',{key:item.workspaceId,value:item.workspaceId},item.title||basename(item.path)))),
     h('button',{className:'ghost',onClick:()=>setNewProject(true)},t('newProject')),
     h('button',{className:'rw-primary',onClick:()=>onCreate(project??null),disabled},t('newAssistant')))),
   (status?.compatible===false)&&h('div',{className:'rw-error',role:'alert'},
    h('b',null,t('dsBotUnavailable')),
    h('div',null,status.error??t('roleConfigError')),
    status?.dsBot?.supportedVersion!==undefined&&h('div',{className:'rw-note'},t('dsBotVersion',{version:status.dsBot.supportedVersion}))),
   project===undefined
    ?h('div',{className:'rw-panel'},h('div',{className:'rw-note'},t('projectSelectHint')),
      workspaceId!==undefined&&h('div',{className:'rw-note'},t('projectMissing')))
    :section(t('projectAssistants'),projectEntries.map(entry=>card(entry,rowsFor(entry)))),
   section(t('unassignedAssistants'),unassigned.map(entry=>card(entry,rowsFor(entry)))),
   orphan.length>0&&section(t('orphanAssistants'),orphan.map(entry=>card(entry,rowsFor(entry)))),
   dialog?.kind==='skills'&&h(RoleSkillsDialog,{t,boot,api,entry:dialog.entry,onClose:()=>setDialog(null)}),
   dialog?.kind==='settings'&&h(RoleSettingsDialog,{t,api,entry:dialog.entry,onClose:()=>setDialog(null)}),
   dialog?.kind==='delete'&&h(RoleDeleteDialog,{t,api,entry:dialog.entry,onClose:()=>setDialog(null)}),
   (dialog?.kind==='join'||dialog?.kind==='dir'||dialog?.kind==='leave')&&h(ProjectAssignDialog,{
    t,api,entry:dialog.entry,project,mode:dialog.kind,onClose:()=>setDialog(null)}),
   newProject&&h(NewProjectDialog,{t,api,onClose:()=>setNewProject(false),onCreated:id=>{setNewProject(false);if(typeof id==='string')onSelectProject?.(id);}}));
 }

 const roleBootApi={post:postBoot};

 function messageText(t,code){
  if(code===null||code===undefined)return null;
  const known=['needToken','noWorkspace','draftFailed','worked','saved','chatUnavailable','pendingCancelled','assistantRemoved','botDeleted','assistantCreated',
   'projectCreated','projectUnavailable','projectChanged','projectMissing','projectServiceUnavailable','assistantMoved','joinedProject','leftProject',
   'projectConflict','roomCreated','roomDirFailed','roomOpenFailed','roomDirSet','roomNameTaken','manageInDsBot','roleMissingBot'];
  return known.includes(code)?t(code):code;
 }

 function ResearchNavIcon(props){
  const kind=props.kind;
  const size=props.size??16;
  const path=kind==='skills'
   ?h('path',{d:'M7 3h7l4 4v14H7z M14 3v5h4 M10 12h5 M10 16h5'})
   :kind==='assistants'
    ?h(React.Fragment,null,h('circle',{cx:9,cy:8,r:3}),h('path',{d:'M4 20a5 5 0 0 1 10 0 M16 8h5 M18.5 5.5v5'}))
    :h(React.Fragment,null,h('path',{d:'M4 11l8-7 8 7'}),h('path',{d:'M6 10v10h12V10'}));
  return h('span',{className:'rw-navicon'},
   h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round'},path));
 }

 function ResearchFloatNav(){
  const t=useT();
  return h('button',{type:'button',className:'rw-floatnav',onClick:()=>{try{svc('layout')?.toggleSidebar?.();}catch{}}},
   h(ResearchNavIcon,{kind:'home',size:14}),t('researchNav'));
 }

 function ResearchSidebar(){
  const t=useT();
  const state=useResearchView();
  const boot=useBootState();
  const workspaces=useWorkspacesState();
  const items=projectList(workspaces);
  useRoleReconcile(boot,roleBootApi);
  const entries=roleEntries(boot);
  const project=projectById(items,state.selectedWorkspaceId);
  const visible=projectEntriesOf(entries,state.selectedWorkspaceId);

  useEffect(()=>{
   let live=true;
   if(bootStore.get()===undefined){
    request(`${API}?action=bootstrap`).then(payload=>{if(live)bootStore.set(payload);}).catch(()=>{});
   }
   return()=>{live=false;};
  },[]);

  const go=tab=>{
   researchView.set({tab});
   try{svc('layout')?.selectPanel?.(PANEL_ID);}catch{}
   collapseSidebarIfNarrow();
  };
  const open=async entry=>{
   const opened=await openAssistantSession(entry);
   if(!opened){go('assistants');return;}
   researchView.set({selectedBotId:entry.botId});
   collapseSidebarIfNarrow();
  };

  return h('div',{className:'rw-side'},
   h('div',{className:'rw-side-head'},
    h('span',{className:'rw-side-title',title:t('title')},t('title')),
    h('span',{className:'rw-spacer'}),
    h('button',{className:'ghost','aria-label':t('newAssistant'),onClick:()=>{researchView.set({tab:'assistants',createRequested:state.createRequested+1,createFor:null});try{svc('layout')?.selectPanel?.(PANEL_ID);}catch{}}},t('create'))),
   h('button',{className:`rw-side-row${state.tab==='home'?' on':''}`,'aria-label':t('tabHome'),'aria-current':state.tab==='home'?'page':undefined,onClick:()=>go('home')},
    h(ResearchNavIcon,{kind:'home'}),h('span',{className:'rw-side-label'},t('tabHome'))),
   h('button',{className:`rw-side-row${state.tab==='skills'?' on':''}`,'aria-label':t('tabSkills'),'aria-current':state.tab==='skills'?'page':undefined,onClick:()=>go('skills')},
    h(ResearchNavIcon,{kind:'skills'}),h('span',{className:'rw-side-label'},t('tabSkills'))),
   h('button',{className:`rw-side-row${state.tab==='assistants'?' on':''}`,'aria-label':t('tabAssistants'),'aria-current':state.tab==='assistants'?'page':undefined,onClick:()=>go('assistants')},
    h(ResearchNavIcon,{kind:'assistants'}),h('span',{className:'rw-side-label'},t('tabAssistants')),
    h('span',{className:'rw-side-count'},String(entries.length))),
   h('div',{className:'rw-side-sep'}),
   h('div',{className:'rw-side-section'},project===undefined?t('unassigned'):(project.title||basename(project.path))),
   h('div',{className:'rw-side-list'},
    visible.length===0&&h('div',{className:'rw-empty'},project===undefined?t('projectSelectHint'):t('assistantsEmpty')),
    visible.map(entry=>h('button',{key:entry.botId,className:`rw-side-assist${state.selectedBotId===entry.botId?' on':''}`,onClick:()=>{void open(entry);}},
     h('b',null,entry.name??entry.botId),
     h('span',null,`${templateLabel(t,boot,entry.templateId)} · ${entry.model??'—'}`)))),
   h('div',{className:'rw-side-grow'}),
   h('button',{className:'rw-side-back',onClick:exitResearch},`← ${t('modeExit')}`));
 }

 function ResearchPanel(props){
  const {t,boot,api}=props;
  const state=useResearchView();
  const workspaces=useWorkspacesState();
  const items=projectList(workspaces);
  const workspaceId=state.selectedWorkspaceId;
  const project=projectById(items,workspaceId)??null;
  const [chooser,setChooser]=useState(null);
  const [createRequest,setCreateRequest]=useState(null);
  const handledCreate=useRef(state.createRequested);
  const entries=roleEntries(boot);
  const incompatible=boot?.roleStatus?.compatible!==true;
  const incompatibleText=boot?.roleStatus?.error??t('dsBotUnavailable');
  useRoleReconcile(boot,api);

  // Project folders and the registry change outside this page: keep the
  // availability map fresh when the project changes, on focus, and on refresh.
  // `refresh` is stable; depending on the whole `api` object would refresh on
  // every render and leave the panel permanently busy.
  const refresh=api.refresh;
  useEffect(()=>{void refresh();},[refresh,workspaceId]);
  useEffect(()=>{
   const onFocus=()=>{void refresh();};
   window.addEventListener('focus',onFocus);
   return()=>window.removeEventListener('focus',onFocus);
  },[refresh]);

  const pendingList=Array.isArray(boot?.roleStatus?.pending)?boot.roleStatus.pending:[];
  const pendingFor=id=>pendingList.find(item=>(item.workspaceId??null)===(id??null))??null;
  const pendingConflict=pendingList.find(item=>(item.matchedBotIds?.length??0)>1);
  const orphanPendings=pendingList.filter(item=>(item.matchedBotIds?.length??0)===0);

  const openCreate=(projectSnapshot,withPending)=>setCreateRequest({project:projectSnapshot,pending:withPending===undefined?pendingFor(projectSnapshot?.workspaceId??null):withPending});

  useEffect(()=>{
   if(state.createRequested!==handledCreate.current){
    handledCreate.current=state.createRequested;
    if(incompatible){api.setError(incompatibleText);return;}
    const target=typeof state.createFor==='string'?projectById(projectList(workspaces),state.createFor)??null:null;
    openCreate(target);
   }
  },[state.createRequested,state.createFor,incompatible,incompatibleText,api,workspaces,pendingList]);

  const page=state.tab;
  const pageLabel=page==='home'?t('tabHome'):page==='skills'?t('tabSkills'):t('tabAssistants');
  const askAssistant=useCallback(request=>setChooser(request),[]);
  const openAssistant=useCallback(entry=>{void openAssistantChat(api,entry,'');},[api]);
  const selectProject=useCallback(id=>{researchView.set({selectedWorkspaceId:id});},[]);
  const create=useCallback(()=>{
   if(incompatible){api.setError(incompatibleText);return;}
   openCreate(project);
  },[incompatible,incompatibleText,project,api,pendingList]);
  const createIn=useCallback(item=>{
   if(incompatible){api.setError(incompatibleText);return;}
   openCreate(item);
  },[incompatible,incompatibleText,api,pendingList]);
  const manageRoom=useCallback(room=>{
   // DS-Bot owns group settings; the workbench only points at the group's row.
   exitResearch();
   try{
    window.alert(`${t('manageInDsBotHint')}\n${room?.name??''}`);
   }catch{}
  },[t]);

  const useSkill=useCallback(row=>{
   const key=`${row.sourceId}/${row.name}`;
   const matching=assistantsWithSkill(projectEntriesOf(entries,workspaceId),key);
   setChooser({title:t('chooseAssistant'),entries:matching,onPick:entry=>{void openAssistantChat(api,entry,`/${row.name} `);}});
  },[entries,api,t,workspaceId]);

  const body=boot===undefined
   ?h('div',{className:'rw-body rw-loading'},api.error!==null?h('div',{className:'rw-error',role:'alert'},messageText(t,api.error)):h('span',{className:'rw-spinner',role:'status','aria-label':t('loading')}))
   :page==='home'
    ?h('div',{className:'rw-body'},h(HomeView,{t,boot,api,askAssistant,onCreate:create,createDisabled:incompatible,
      workspaceId,onSelectProject:selectProject,onNewAssistant:createIn,onManageRoom:manageRoom,
      onOpenSkills:()=>researchView.set({tab:'skills'})}))
    :page==='skills'
     ?h('div',{className:'rw-body'},h(SkillsView,{t,boot,api,onUseSkill:useSkill,allowUse:true}))
     :h('div',{className:'rw-body'},h(AssistantsView,{t,boot,api,workspaces,workspaceId,onSelectProject:selectProject,
       onCreate:createIn,onOpen:openAssistant}));

  const errorText=messageText(t,api.error);
  const noticeText=messageText(t,api.notice);

  return h('div',{className:'rw-root'},
   h('div',{className:'rw-mainbar'},
    h('span',{className:'rw-title'},t('title')),
    h('span',{className:'rw-crumb'},pageLabel),
    h('div',{className:'rw-spacer'}),
    boot!==undefined&&h('span',{className:'rw-note'},`v${boot.version}`),
    h('button',{className:'ghost',onClick:()=>api.refresh(),disabled:api.busy!==null},t('refresh')),
    h('button',{className:'rw-primary',onClick:create,disabled:incompatible},t('newAssistant'))),
   boot!==undefined&&incompatible&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},incompatibleText)),
   pendingConflict!==undefined&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},t('pendingConflict'))),
   orphanPendings.map(item=>{
    const target=projectById(items,item.workspaceId);
    // A pending whose project left the registry keeps its id: the dialog says
    // the project is unavailable instead of presenting the assistant as new
    // and unassigned, and completion still stores the original id.
    const snapshot=item.workspaceId===null
     ?null
     :(target??{workspaceId:item.workspaceId,title:t('orphanAssistants'),path:item.workDir??'',unavailable:true});
    const where=snapshot===null?t('unassigned'):(snapshot.title||basename(snapshot.path));
    return h('div',{key:item.transactionId,style:{padding:'8px 12px 0'}},h('div',{className:'rw-pending'},
     h('b',null,t('pendingTitle')),
     h('span',{className:'rw-note'},`${item.name} · ${where} · ${t('pendingRetryReady')}`),
     h('div',{className:'rw-form'},h('button',{className:'ghost',onClick:()=>openCreate(snapshot,item),disabled:incompatible},t('retryCreate')))));
   }),
   errorText!==null&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},errorText)),
   noticeText!==null&&noticeText!==undefined&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-ok',role:'status'},noticeText)),
   body,
   h(AssistantChooser,{t,boot,request:chooser,onClose:()=>setChooser(null),onCreate:create,disabled:incompatible}),
   createRequest!==null&&h(RoleCreateDialog,{t,boot,api,pending:createRequest.pending,project:createRequest.project,
    onClose:()=>setCreateRequest(null),onCreated:()=>researchView.set({tab:'assistants'})}));
 }

 function WorkbenchRoot(){
  const t=useT();
  const api=useWorkbenchApi();
  const state=useResearchView();
  const [tab,setTab]=useState('home');
  const boot=api.boot;
  useRoleReconcile(boot,api);

  if(state.mode==='research')return h(ResearchPanel,{t,boot,api});

  const body=boot===undefined
   ?h('div',{className:'rw-body rw-loading'},api.error!==null?h('div',{className:'rw-error',role:'alert'},messageText(t,api.error)):h('span',{className:'rw-spinner',role:'status','aria-label':t('loading')}))
   :tab==='home'
    ?h('div',{className:'rw-body'},h('div',{className:'rw-panel'},
     h('h3',{className:'rw-h'},t('title')),
     h('div',{className:'rw-note'},t('enterResearchHint')),
     h('div',{className:'rw-space'}),
     h('button',{className:'rw-primary',onClick:enterResearch},t('modeEnter'))))
    :h('div',{className:'rw-body'},h(SkillsView,{t,boot,api,allowUse:false}));

  const errorText=messageText(t,api.error);
  const noticeText=messageText(t,api.notice);

  return h('div',{className:'rw-root'},
   h('div',{className:'rw-bar'},
    h('span',{className:'rw-title'},t('title')),
    h('div',{className:'rw-tabs'},
     h('button',{className:`rw-tab${tab==='home'?' on':''}`,onClick:()=>setTab('home')},t('tabHome')),
     h('button',{className:`rw-tab${tab==='skills'?' on':''}`,onClick:()=>setTab('skills')},t('tabSkills'))),
    h('div',{className:'rw-spacer'}),
    boot!==undefined&&h('span',{className:'rw-note'},`v${boot.version}`),
    h('button',{className:'rw-primary',onClick:enterResearch},t('modeEnter')),
    h('button',{className:'ghost',onClick:()=>api.refresh(),disabled:api.busy!==null},t('refresh'))),
   errorText!==null&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},errorText)),
   noticeText!==null&&noticeText!==undefined&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-ok',role:'status'},noticeText)),
   body);
 }

 /** Install shell overrides once their slot declarations exist, then keep them while research mode lasts. */
 function installResearchSurface(ctx){
  let timer;
  let tries=0;
  let installed=undefined;
  const offs=[];
  const names=['sidebar.workspaces','shell.overlay','conversation.input.model'];
  const components={
   'sidebar.workspaces':ResearchSidebar,
   'shell.overlay':ResearchFloatNav,
   'conversation.input.model':()=>null,
  };
  const options={
   'sidebar.workspaces':{priority:RESEARCH_MODE_PRIORITY},
   'shell.overlay':{id:'research-nav',order:40},
   'conversation.input.model':{priority:RESEARCH_MODE_PRIORITY},
  };
  const declared=name=>{
   if(typeof ctx.slots.spec!=='function')return true;
   try{return ctx.slots.spec(name)!==undefined;}catch{return false;}
  };
  const attempt=()=>{
   timer=undefined;
   if(researchView.get().mode!=='research')return;
   installed??=new Set();
   for(const name of names){
    if(installed.has(name))continue;
    if(!declared(name))continue;
    try{
     const entries=typeof ctx.slots.entries==='function'?ctx.slots.entries(name):[];
     const base=options[name];
     const priority=base.priority===undefined?undefined:freePriority(entries,base);
     offs.push(ctx.slots.inject(name,()=>ctx.slots.register({name,...base,...(priority===undefined?{}:{priority})},components[name])));
    }catch(error){
     // A declared slot that refuses this registration keeps its own component.
     try{console.warn('research-workbench: slot %s not overridden: %s',name,error?.message??error);}catch{}
    }
    installed.add(name);
   }
   if(installed.size<names.length&&tries<100){tries+=1;timer=setTimeout(attempt,120);}
  };
  const sync=()=>{
   const research=researchView.get().mode==='research';
   applySurfaceAttr(research);
   if(!research){
    if(timer!==undefined){clearTimeout(timer);timer=undefined;}
    for(const off of offs.splice(0)){try{off?.();}catch{}}
    installed=undefined;
    return;
   }
   if(installed===undefined){
    installed=new Set();
    tries=0;
    timer=setTimeout(attempt,0);
   }
  };
  const unsubscribe=researchView.subscribe(sync);
  sync();
  return ()=>{
   unsubscribe();
   if(timer!==undefined)clearTimeout(timer);
   for(const off of offs.splice(0)){try{off?.();}catch{}}
   installed=undefined;
   applySurfaceAttr(false);
  };
 }

 return {
  inject:['slots','locale','sessions','layout','uiWorkspace','workspaces'],
  apply(ctx){
   boundCtx=ctx;
   ctx.effect(()=>ctx.locale.register(NS,{zh,en}),'research-workbench: dictionaries');
   const t=ctx.locale.bind(NS);
   ctx.effect(()=>ctx.slots.inject('sidebar.panellist',()=>{
    const offPanel=ctx.slots.register({name:'main',key:PANEL_ID,locale:NS},WorkbenchRoot);
    const offRow=ctx.slots.register({name:'sidebar.panellist',id:PANEL_ID,order:25,label:()=>t('nav'),locale:NS},NavIcon);
    return ()=>{
     if(typeof offPanel==='function')offPanel();
     if(typeof offRow==='function')offRow();
    };
   }),'research-workbench: sidebar entry');
   ctx.effect(()=>installResearchSurface(ctx),'research-workbench: research surface');
   if(researchView.get().mode==='research'){
    try{ctx.layout?.selectPanel?.(PANEL_ID);}catch{}
   }
  },
 };
}});
