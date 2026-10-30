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
  taskReading:'论文阅读', taskReadingHint:'精读、提炼方法、实验与结论',
  taskWriting:'写作与润色', taskWritingHint:'起草、改写、翻译与术语统一',
  taskReview:'审稿与核验', taskReviewHint:'审稿视角审阅、核对引用与结论',
  taskFigure:'科研绘图', taskFigureHint:'发表级图表、配色与导出规范',
  taskSkillsCard:'科研 Skills 库', taskSkillsCardHint:'管理上游技能来源与更新',
  projects:'科研项目', projectEmpty:'还没有项目文件夹。添加一个 DSH 工作区即可开始。',
  addProject:'＋ 添加项目文件夹', addProjectHint:'选择本地文件夹作为科研项目，项目会自动登记为 DSH 工作区。',
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
  skillsList:'技能列表', filterCategory:'分类', filterSource:'来源', filterAll:'全部',
  catReading:'阅读', catWriting:'写作', catReview:'审阅', catFigure:'绘图', catGeneral:'通用',
  enable:'启用', disable:'停用', viewSkill:'查看 SKILL.md', useSkill:'在会话中使用',
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
  assistantsHint:'每个助手是一个长期运行的 DS-Bot，只在这里获得自己的科研技能。',
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
  pendingCancelled:'未完成的创建已取消。', roleLiterature:'文献检索与核验',
  roleLiteratureHint:'检索、下载、引用核验与文献流水线', roleReading:'论文精读与转化',
  roleReadingHint:'精读、翻译、PPT/Word/专利与图片还原', roleWriting:'写作与投稿',
  roleWritingHint:'起草、润色、研究计划与社科论证', roleReview:'审稿、统计与数据',
  roleReviewHint:'审稿回复、统计审查与数据可用性', roleFigure:'图表与实验记录',
  roleFigureHint:'发表级图表、配色与实验日志',
 };

 const en={
  nav:'Workbench', title:'Research Workbench',
  tabHome:'Home', tabSkills:'Research Skills',
  refresh:'Refresh', loading:'Loading…', retry:'Retry', close:'Close',
  tasksHeading:'Research tasks',
  taskReading:'Read a paper', taskReadingHint:'Close read: method, experiments, conclusions',
  taskWriting:'Write and polish', taskWritingHint:'Draft, rewrite, translate, unify terms',
  taskReview:'Review and verify', taskReviewHint:'Reviewer view, check citations and claims',
  taskFigure:'Make figures', taskFigureHint:'Publication figures, palette, export rules',
  taskSkillsCard:'Research Skills', taskSkillsCardHint:'Manage upstream sources and updates',
  projects:'Projects', projectEmpty:'No project folder yet. Add a DSH workspace to begin.',
  addProject:'+ Add project folder', addProjectHint:'Pick a local folder; it is registered as a DSH workspace.',
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
  skillsList:'Skills', filterCategory:'Category', filterSource:'Source', filterAll:'All',
  catReading:'Reading', catWriting:'Writing', catReview:'Review', catFigure:'Figures', catGeneral:'General',
  enable:'Enable', disable:'Disable', viewSkill:'View SKILL.md', useSkill:'Use in session',
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
  assistantsHint:'Each assistant is a long-lived DS-Bot that gets its own research skills here only.',
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
  pendingCancelled:'The unfinished creation was cancelled.', roleLiterature:'Literature search and verification',
  roleLiteratureHint:'Search, download, citation checks and literature pipelines', roleReading:'Paper reading and conversion',
  roleReadingHint:'Close reading, translation, PPT/Word/patent and image conversion', roleWriting:'Writing and submission',
  roleWritingHint:'Drafting, polishing, proposals and social-science argument', roleReview:'Review, statistics and data',
  roleReviewHint:'Referee responses, statistical audit and data availability', roleFigure:'Figures and experiment logs',
  roleFigureHint:'Publication figures, palettes and experiment logging',
 };

 const css=`
 .rw-root{height:100%;min-height:0;display:flex;flex-direction:column;font-family:inherit;font-size:12.5px;line-height:1.55;color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-layer-1,transparent);container-type:inline-size}
 .rw-root *{box-sizing:border-box}
 .rw-bar{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.22));flex:none;flex-wrap:wrap}
 .rw-title{font-size:13px;font-weight:600;margin-right:4px}
 .rw-tabs{display:flex;gap:2px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.1));padding:2px;border-radius:8px}
 .rw-tab{border:none;background:transparent;color:var(--dsw-alias-label-secondary,inherit);font:inherit;padding:4px 10px;border-radius:6px;cursor:pointer}
 .rw-tab.on{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,inherit);box-shadow:0 1px 2px rgba(0,0,0,.08)}
 .rw-spacer{flex:1}
 .rw-root button{font:inherit;border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.28));background:transparent;color:inherit;border-radius:6px;padding:3px 9px;cursor:pointer;white-space:nowrap}
 .rw-root button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
 .rw-root button:disabled{opacity:.45;cursor:default}
 .rw-root button.rw-primary{background:var(--dsw-alias-button-primary-fill,#0f1115)!important;border-color:transparent!important;color:var(--dsw-alias-label-primary-foreground,#fff)!important}
 .rw-root button.ghost{border-color:transparent}
 .rw-root input,.rw-root select{font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.08));border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.28));border-radius:6px;padding:4px 7px;min-width:0}
 .rw-body{flex:1;min-height:0;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:14px}
 .rw-body>*{flex:0 0 auto}
 .rw-h{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,inherit);margin:0 0 6px}
 .rw-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
 .rw-card{text-align:left;border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.24));border-radius:10px;padding:9px 10px;background:var(--dsw-alias-bg-base,transparent);display:flex;flex-direction:column;gap:2px;min-width:0;overflow:hidden;font:inherit;color:inherit}
 .rw-card b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-card span{color:var(--dsw-alias-label-tertiary,inherit);font-size:11.5px;white-space:normal;overflow-wrap:anywhere;line-height:1.35}
 .rw-cols{display:grid;grid-template-columns:minmax(220px,1fr) minmax(240px,1.2fr);gap:12px;align-items:start}
 .rw-cols>*{min-width:0}
 @container (max-width:680px){.rw-cols{grid-template-columns:1fr}}
 .rw-panel{border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.24));border-radius:10px;padding:10px;min-height:80px;display:flex;flex-direction:column;gap:6px;flex:none;min-width:0;overflow-wrap:anywhere}
 .rw-row{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:7px;cursor:pointer;min-width:0}
 .rw-row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}
 .rw-row.on{background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16))}
 .rw-row .grow{flex:1;min-width:0}
 .rw-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-sub{display:block;color:var(--dsw-alias-label-tertiary,inherit);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-act{display:flex;gap:4px;flex:none}
 .rw-note{color:var(--dsw-alias-label-tertiary,inherit);font-size:11.5px}
 .rw-empty{color:var(--dsw-alias-label-tertiary,inherit);font-size:11.5px;padding:6px 2px}
 .rw-badge{font-size:10.5px;padding:1px 6px;border-radius:999px;border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.3));color:var(--dsw-alias-label-secondary,inherit);white-space:nowrap}
 .rw-badge.ok{color:var(--dsw-alias-state-success-primary,#2e9e5b);border-color:currentColor}
 .rw-badge.warn{color:var(--dsw-alias-state-warn-primary,#b7861a);border-color:currentColor}
 .rw-badge.dot::before{content:'● '}
 .rw-error{color:var(--dsw-alias-state-error-primary,#d33);border:1px solid currentColor;border-radius:8px;padding:6px 9px;font-size:11.5px}
 .rw-ok{color:var(--dsw-alias-state-success-primary,#2e9e5b);font-size:11.5px}
 .rw-form{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
 .rw-form input[type=text]{flex:1;min-width:150px}
 .rw-chiprow{display:flex;gap:4px;flex-wrap:wrap}
 .rw-skill{border-top:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.16));padding:7px 2px;display:flex;gap:8px;align-items:flex-start}
 .rw-skill:first-child{border-top:none}
 .rw-skill .grow{flex:1;min-width:0}
 .rw-skill .desc{color:var(--dsw-alias-label-secondary,inherit);font-size:11.5px;margin:1px 0 3px}
 .rw-skill .use{display:flex;flex-direction:column;gap:4px;flex:none}
 .rw-mask{position:fixed;inset:0;background:rgba(0,0,0,.42);display:flex;align-items:center;justify-content:center;padding:24px;z-index:60}
 .rw-dialog{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,inherit);border-radius:12px;border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.3));display:flex;flex-direction:column;max-width:min(760px,100%);max-height:100%;min-width:min(420px,100%);overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,.28)}
 .rw-dialog header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.22))}
 .rw-dialog .content{padding:12px;overflow:auto;display:flex;flex-direction:column;gap:8px;font-size:12px}
 .rw-dialog pre{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.08));border-radius:8px;padding:9px;max-height:52vh;overflow:auto}
 .rw-kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:11.5px}
 .rw-kv dt{color:var(--dsw-alias-label-tertiary,inherit)}
 .rw-kv dd{margin:0;word-break:break-all}
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
 .rw-side{height:100%;min-height:0;display:flex;flex-direction:column;gap:4px;padding:6px 4px 8px;font-family:inherit;font-size:12.5px;color:var(--dsw-alias-label-primary,inherit)}
 .rw-side *{box-sizing:border-box}
 .rw-side-head{display:flex;align-items:center;gap:6px;padding:4px 6px 8px;border-bottom:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.22));margin-bottom:4px}
 .rw-side-title{font-size:12px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-side button{font:inherit;border:none;background:transparent;color:inherit;border-radius:7px;padding:6px 8px;cursor:pointer;text-align:left;min-width:0}
 .rw-side button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
 .rw-side button:disabled{opacity:.45;cursor:default}
 .rw-side-row{display:flex;align-items:center;gap:7px;width:100%}
 .rw-side-row .rw-navicon{width:16px;height:16px;flex:none}
 .rw-side-row.on{background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16));font-weight:600}
 .rw-side-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-side-count{font-size:10.5px;color:var(--dsw-alias-label-tertiary,inherit);flex:none}
 .rw-side-sep{height:1px;background:var(--dsw-alias-hairline,rgba(128,128,128,.18));margin:6px 2px}
 .rw-side-section{font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,inherit);padding:4px 8px 2px}
 .rw-side-list{display:flex;flex-direction:column;gap:1px;min-height:0;overflow:auto}
 .rw-side-assist{display:flex;flex-direction:column;gap:1px;width:100%;padding:6px 8px;border-radius:7px;border:none;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
 .rw-side-assist:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
 .rw-side-assist b{font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-side-assist span{font-size:10.5px;color:var(--dsw-alias-label-tertiary,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-side-grow{flex:1;min-height:8px}
 [class*='_collapsed'] .rw-side .rw-side-title,
 [class*='_collapsed'] .rw-side .rw-side-label,
 [class*='_collapsed'] .rw-side .rw-side-count,
 [class*='_collapsed'] .rw-side .rw-side-section,
 [class*='_collapsed'] .rw-side .rw-side-list,
 [class*='_collapsed'] .rw-side .rw-side-head,
 [class*='_collapsed'] .rw-side .rw-side-back{display:none}
 [class*='_collapsed'] .rw-side .rw-side-row{justify-content:center;padding:8px}
 [class*='_collapsed'] .rw-side .rw-side-row .rw-navicon{width:18px;height:18px}
 .rw-side-back{width:100%;border-top:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.18));border-radius:0!important;padding-top:9px!important;color:var(--dsw-alias-label-secondary,inherit)!important}
 .rw-floatnav{display:none;position:fixed;right:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:45;align-items:center;gap:5px;border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.3));border-radius:999px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,inherit);font:inherit;font-size:12px;padding:6px 11px;box-shadow:0 4px 16px rgba(0,0,0,.16);cursor:pointer}
 @media (max-width:720px){.rw-floatnav{display:inline-flex}}
 .rw-mainbar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.22));flex:none;flex-wrap:wrap}
 .rw-mainbar .rw-title{font-size:13px;font-weight:600}
 .rw-crumb{color:var(--dsw-alias-label-tertiary,inherit);font-size:11.5px}
 .rw-assistant{border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.24));border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:7px;background:var(--dsw-alias-bg-base,transparent)}
 .rw-assistant-head{display:flex;align-items:flex-start;gap:8px;min-width:0}
 .rw-assistant-head .grow{flex:1;min-width:0}
 .rw-assistant-name{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-assistant-sub{font-size:11.5px;color:var(--dsw-alias-label-tertiary,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-assistant-actions{display:flex;gap:4px;flex-wrap:wrap;flex:none}
 .rw-skill-pick{display:flex;flex-direction:column;gap:3px;max-height:260px;overflow:auto;border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.22));border-radius:8px;padding:5px}
 .rw-check{display:flex;align-items:flex-start;gap:7px;padding:4px 5px;border-radius:6px;cursor:pointer;min-width:0}
 .rw-check:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}
 .rw-check input{margin:2px 0 0;flex:none}
 .rw-check .grow{flex:1;min-width:0}
 .rw-check b{font-weight:500;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-check span{display:block;font-size:10.5px;color:var(--dsw-alias-label-tertiary,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-selected{display:flex;flex-direction:column;gap:3px}
 .rw-selected-row{display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:6px;border:1px dashed var(--dsw-alias-hairline,rgba(128,128,128,.3));font-size:11.5px}
 .rw-selected-row .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .rw-field{display:flex;flex-direction:column;gap:3px;min-width:0}
 .rw-field label{font-size:11px;color:var(--dsw-alias-label-tertiary,inherit)}
 .rw-field input,.rw-field select{width:100%}
 .rw-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
 @container (max-width:560px){.rw-form-grid{grid-template-columns:1fr}}
 .rw-badge.err{color:var(--dsw-alias-state-error-primary,#d33);border-color:currentColor}
 .rw-modal-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
 .rw-pending{border:1px solid var(--dsw-alias-state-warn-primary,#b7861a);border-radius:9px;padding:8px 10px;display:flex;flex-direction:column;gap:5px;font-size:11.5px}
 .rw-space{height:6px}
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
 const RESEARCH_MODE_PRIORITY=-300;
 const rwMarker=transactionId=>`<!-- research-workbench:${transactionId} -->`;

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
  let state={mode:readStoredSurface(),tab:'home',selectedBotId:undefined,createRequested:0};
  const listeners=new Set();
  return {
   get:()=>state,
   set(patch){
    state={...state,...patch};
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
  useEffect(()=>{
   const onKey=event=>{if(event.key==='Escape')onClose();};
   window.addEventListener('keydown',onKey);
   return ()=>window.removeEventListener('keydown',onKey);
  },[onClose]);
  return h('div',{className:'rw-mask',onMouseDown:event=>{if(event.target===event.currentTarget)onClose();}},
   h('div',{className:'rw-dialog',style:wide?{maxWidth:'min(960px,100%)'}:undefined},
    h('header',null,h('b',null,title),h('div',{className:'rw-spacer'}),h('button',{className:'ghost',onClick:onClose},'×')),
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
  * A research action never creates a blank workspace session: the Bot owns the
  * conversation, its model, and its context.
  */
 async function openAssistantChat(api,entry,text){
  api.setError(null);
  api.setNotice(null);
  if(entry?.missing===true||typeof entry?.sessionId!=='string'||entry.sessionId===''){
   api.setError('chatUnavailable');
   return false;
  }
  try{svc('uiWorkspace')?.openSession?.(entry.sessionId);}catch{api.setError('chatUnavailable');return false;}
  try{svc('layout')?.selectPanel?.(null);}catch{}
  researchView.set({selectedBotId:entry.botId});
  collapseSidebarIfNarrow();
  if(typeof text!=='string'||text.trim()==='')return true;
  const seeded=await seedDraft(entry.sessionId,text);
  if(seeded)api.setNotice('worked');
  else api.setError('draftFailed');
  return seeded;
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

 function ProjectsPanel(props){
  const {t,boot,workspaces,selected,onSelect,onAdd,onNewSession,busy}=props;
  const items=Array.isArray(workspaces?.items)?workspaces.items:[];
  const fileCounts=boot?.filesByWorkspace??{};
  return h('div',{className:'rw-panel'},
   h('div',{style:{display:'flex',alignItems:'center',gap:'6px'}},
    h('h3',{className:'rw-h',style:{margin:0,flex:'1'}},t('projects')),
    h('button',{onClick:onAdd,disabled:busy===true},t('addProject'))),
   items.length===0&&h('div',{className:'rw-empty'},t('projectEmpty')),
   items.map(item=>{
    const files=Array.isArray(fileCounts[item.workspaceId])?fileCounts[item.workspaceId]:[];
    return h('div',{key:item.workspaceId,className:`rw-row${selected===item.workspaceId?' on':''}`,onClick:()=>onSelect(item.workspaceId)},
     h('div',{className:'grow'},
      h('b',{className:'rw-name'},item.title||basename(item.path)),
      h('span',{className:'rw-sub'},`${item.path} · ${item.sessionIds.length} ${t('sessionsCount')} · ${files.length} ${t('fileCount')}`)),
     h('div',{className:'rw-act'},
      h('button',{className:'ghost',onClick:event=>{event.stopPropagation();onNewSession(item.workspaceId);}},t('tabAssistants'))));
   }));
 }

 function AssistantsPanel(props){
  const {t,boot,entries,onOpen,onCreate,disabled}=props;
  return h('div',{className:'rw-panel'},
   h('div',{style:{display:'flex',alignItems:'center',gap:'6px'}},
    h('h3',{className:'rw-h',style:{margin:0,flex:'1'}},t('assistants')),
    h('button',{onClick:onCreate,disabled:disabled===true},t('newAssistant'))),
   h('div',{className:'rw-note'},t('assistantsHint')),
   entries.length===0&&h('div',{className:'rw-empty'},t('assistantsEmpty')),
   entries.map(entry=>h('div',{key:entry.botId,className:'rw-row',onClick:()=>onOpen(entry)},
    h('div',{className:'grow'},
     h('b',{className:'rw-name'},entry.name??entry.botId),
     h('span',{className:'rw-sub'},`${templateLabel(t,boot,entry.templateId)} · ${entry.model??'—'} · ${(entry.skills??[]).length} ${t('skillsCount')}`)),
    h('div',{className:'rw-act'},
     h('button',{className:'rw-primary',disabled:entry.sessionId===null,onClick:event=>{event.stopPropagation();onOpen(entry);}},t('openChat'))))));
 }

 function FilesPanel(props){
  const {t,boot,workspace,onOpenFile,onRevealFile,onToChat,onAddLiterature,onRemoveLiterature,busy}=props;
  const files=boot?.filesByWorkspace?.[workspace?.workspaceId]??[];
  const literatureDirs=Array.isArray(boot?.literatureDirs)?boot.literatureDirs:[];
  const literatureFiles=boot?.literatureFiles??{};
  return h('div',{className:'rw-panel'},
   h('div',{style:{display:'flex',alignItems:'center',gap:'6px'}},
    h('h3',{className:'rw-h',style:{margin:0,flex:'1'}},t('files')),
    h('button',{onClick:onAddLiterature,disabled:busy===true},t('litAdd'))),
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
  const {t,boot,api,askAssistant,onCreate,createDisabled}=props;
  const workspacesState=useWorkspacesState();
  const items=Array.isArray(workspacesState?.items)?workspacesState.items:[];
  const [selected,setSelected]=useState(undefined);
  const [dialog,setDialog]=useState(null);
  const workspace=items.find(item=>item.workspaceId===selected)??items[0];
  const files=workspace===undefined?[]:(boot?.filesByWorkspace?.[workspace.workspaceId]??[]);
  const entries=roleEntries(boot);

  const tasks=useMemo(()=>[
   {key:'reading',category:'reading',fallback:'mineru',extensions:['.pdf','.md'],skillLabel:'taskReading',hintLabel:'taskReadingHint',promptLabel:'promptReading'},
   {key:'writing',category:'writing',extensions:['.md','.tex'],skillLabel:'taskWriting',hintLabel:'taskWritingHint',promptLabel:'promptWriting'},
   {key:'review',category:'review',extensions:['.tex','.md','.bib'],skillLabel:'taskReview',hintLabel:'taskReviewHint',promptLabel:'promptReview'},
   {key:'figure',category:'figure',fallback:'scientific-figure-making',extensions:['.py','.csv','.png'],skillLabel:'taskFigure',hintLabel:'taskFigureHint',promptLabel:'promptFigure'},
  ],[]);

  const toChat=(rows)=>{
   if(workspace===undefined){
    api.setError('noWorkspace');
    return;
   }
   askAssistant({title:t('chooseAssistant'),entries,onPick:entry=>{
    void openAssistantChat(api,entry,buildPrompt(t,t('promptAttach'),undefined,rows));
   }});
  };

  const runTask=(task)=>{
   if(workspace===undefined){
    api.setError('noWorkspace');
    return;
   }
   const matching=assistantsWithCategory(entries,task.category,task.fallback);
   const file=pickFile(files,task.extensions);
   askAssistant({title:t('chooseAssistant'),entries:matching,onPick:entry=>{
    const skill=firstSkillFor(entry,task.category,task.fallback);
    void openAssistantChat(api,entry,buildPrompt(t,t(task.promptLabel),skill?.name,file===undefined?[]:[file]));
   }});
  };

  const addProject=async()=>{
   const uiWorkspace=svc('uiWorkspace');
   if(uiWorkspace?.pickDirectory!==undefined){
    try{
     const path=await uiWorkspace.pickDirectory();
     if(typeof path==='string'&&path!=='')await api.post('add-workspace',{path});
    }catch(cause){
     api.setError(String(cause?.message??cause));
    }
    return;
   }
   setDialog({kind:'path',title:t('addProject'),placeholder:t('fieldPath'),onSubmit:path=>api.post('add-workspace',{path})});
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

  const openFile=(file)=>api.post('open-native-path',{path:file.path,mode:'open'}).catch(()=>{});

  return h(React.Fragment,null,
   h('div',null,
    h('h3',{className:'rw-h'},t('tasksHeading')),
    h('div',{className:'rw-cards'},
     tasks.map(task=>h('button',{key:task.key,className:'rw-card',onClick:()=>runTask(task),disabled:api.busy!==null},
      h('b',null,t(task.skillLabel)),
      h('span',null,t(task.hintLabel)))),
     h('button',{className:'rw-card',onClick:props.onOpenSkills},
      h('b',null,t('taskSkillsCard')),
      h('span',null,t('taskSkillsCardHint'))))),
   h('div',{className:'rw-cols'},
    h(ProjectsPanel,{t,boot,workspaces:workspacesState,selected:workspace?.workspaceId,onSelect:setSelected,onAdd:addProject,busy:api.busy!==null,
     onNewSession:workspaceId=>{if(items.some(item=>item.workspaceId===workspaceId))props.onOpenAssistants?.();}}),
    h(AssistantsPanel,{t,boot,entries,onOpen:entry=>{void openAssistantChat(api,entry,'');},onCreate,disabled:createDisabled})),
   h(FilesPanel,{t,boot,workspace,busy:api.busy!==null,onOpenFile:openFile,
    onRevealFile:file=>api.post('open-native-path',{path:file.path,mode:'reveal'}).catch(()=>{}),
    onToChat:toChat,onAddLiterature:addLiterature,
    onRemoveLiterature:dir=>api.post('remove-literature-dir',{path:dir}).catch(()=>{})}),
   dialog!==null&&h(PathDialog,{t,dialog,onClose:()=>setDialog(null),onSubmit:async path=>{await dialog.onSubmit(path);setDialog(null);}}));
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
  return h(Modal,{title:`${detail.name}`,onClose,wide:true},
   h('dl',{className:'rw-kv'},
    h('dt',null,'Source'),h('dd',null,`${detail.sourceTitle} · ${shortSha(detail.revision)}`),
    h('dt',null,'Path'),h('dd',null,detail.skillDirPath),
    h('dt',null,t('sharedDeps')),h('dd',null,detail.sharedDeps.length===0?t('none'):detail.sharedDeps.map(dep=>`${dep.name} ${dep.exists?'✓':'✗'}`).join('  '))),
   h('h3',{className:'rw-h'},t('siblings')),
   h('div',{className:'rw-chiprow'},detail.siblings.map(entry=>h('span',{key:entry.name,className:'rw-badge'},`${entry.kind==='directory'?'▸ ':'· '}${entry.name}`))),
   h('h3',{className:'rw-h'},'SKILL.md'),
   h('pre',null,detail.content));
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

  const filtered=rows.filter(row=>{
   if(category!=='all'&&row.category!==category)return false;
   if(source!=='all'&&row.sourceId!==source)return false;
   if(query.trim()==='')return true;
   const needle=query.trim().toLowerCase();
   return row.name.toLowerCase().includes(needle)||String(row.description).toLowerCase().includes(needle);
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
   h(SourcesSection,{t,boot,api}),
   h('div',{className:'rw-panel'},
    h('div',{style:{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}},
     h('h3',{className:'rw-h',style:{margin:0,flex:'1'}},`${t('skillsList')} (${filtered.length})`),
     h('select',{value:category,onChange:event=>setCategory(event.target.value)},
      h('option',{value:'all'},t('filterAll')),
      CATEGORIES.map(key=>h('option',{key,value:key},t(`cat${key.charAt(0).toUpperCase()}${key.slice(1)}`)))),
     h('select',{value:source,onChange:event=>setSource(event.target.value)},
      h('option',{value:'all'},t('filterAll')),
      sources.map(entry=>h('option',{key:entry.id,value:entry.id},entry.title))),
     h('input',{type:'text',value:query,placeholder:t('searchSkills'),onChange:event=>setQuery(event.target.value),style:{maxWidth:'150px'}})),
    filtered.length===0&&h('div',{className:'rw-empty'},t('skillsEmpty')),
    filtered.map(row=>h('div',{key:`${row.sourceId}/${row.name}`,className:'rw-skill'},
     h('div',{className:'grow'},
      h('b',null,row.name),
      row.shadowedBy!==undefined&&h('span',{className:'rw-badge warn',style:{marginLeft:'6px'}},t('shadowedBy')),
      h('div',{className:'desc'},row.description),
      h('div',{className:'rw-chiprow'},
       h('span',{className:'rw-badge'},`${row.sourceTitle} · ${shortSha(row.revision)}`),
       h('span',{className:'rw-badge'},t(`cat${row.category.charAt(0).toUpperCase()}${row.category.slice(1)}`)),
       row.sharedDeps.map(dep=>h('span',{key:dep.name,className:`rw-badge ${dep.exists?'ok':'warn'}`},`${dep.name} ${dep.exists?'✓':'✗'}`)))),
     h('div',{className:'use'},
      h('button',{className:'ghost',onClick:()=>openDetail(row)},t('viewSkill')),
      allowUse!==false&&h('button',{className:'rw-primary',onClick:()=>onUseSkill(row)},t('useSkill')),
      h('button',{className:'ghost',disabled:api.busy!==null,onClick:()=>api.post('toggle-skill',{sourceId:row.sourceId,name:row.name,enabled:row.disabled===true}).catch(()=>{})},row.disabled===true?t('enable'):t('disable')))))),
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
   if(needle!==''&&!row.name.toLowerCase().includes(needle)&&!String(row.description).toLowerCase().includes(needle)&&!String(row.sourceTitle).toLowerCase().includes(needle))return false;
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
   h('div',{className:'rw-form'},
    h('input',{type:'text',value:query,placeholder:t('roleSkillsPlaceholder'),onChange:event=>setQuery(event.target.value)}),
    h('select',{value:source,onChange:event=>setSource(event.target.value)},
     h('option',{value:'all'},t('filterAll')),
     sources.map(entry=>h('option',{key:entry.id,value:entry.id},entry.title))),
    h('select',{value:category,onChange:event=>setCategory(event.target.value)},
     h('option',{value:'all'},t('filterAll')),
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
     return h('label',{key,className:'rw-check'},
      h('input',{type:'checkbox',checked:keys.has(key),onChange:()=>toggle(key)}),
      h('span',{className:'grow'},
       h('b',null,row.name),
       h('span',null,`${row.sourceTitle} · ${row.category}${row.disabled===true?` · ${t('skillDisabled')}`:''}${row.shadowedBy!==undefined?` · ${t('shadowedBy')}`:''}`)));
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
  const {t,boot,api,pending,onClose,onCreated}=props;
  const templates=roleTemplates(boot);
  const [activePending,setActivePending]=useState(pending??null);
  const [templateId,setTemplateId]=useState(pending?.templateId??templates[0]?.id);
  const [name,setName]=useState(pending?.name??'');
  const [selected,setSelected]=useState(()=>{
   if(Array.isArray(pending?.skills)&&pending.skills.length>0)return pending.skills.map(skill=>({sourceId:skill.sourceId,name:skill.name}));
   const template=templates[0];
   return template===undefined?[]:template.skills.map(skill=>({sourceId:skill.sourceId,name:skill.name}));
  });
  const [model,setModel]=useState('');
  const [workDir,setWorkDir]=useState('');
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
    setName(current=>current.trim()===''?t(next.labelKey):current);
   }
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

  const signature=(value)=>JSON.stringify({
   templateId:value?.templateId,
   name:value?.name,
   skills:(value?.skills??[]).map(skill=>`${skill.sourceId}/${skill.name}`).sort(),
  });
  const changed=activePending!==null&&signature({templateId,name,skills:selected})!==signature(activePending);

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
     const prepared=await api.post('prepare-role',{templateId:template.id,name:name.trim(),skills:selected});
     transactionId=prepared.transactionId;
     setActivePending(prepared.pending===undefined?{transactionId,templateId:template.id,name:name.trim(),skills:selected}:{...prepared.pending,transactionId});
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
     h('div',{className:'rw-field'},h('label',null,t('assistantName')),h('input',{type:'text',value:name,onChange:event=>setName(event.target.value),disabled:busy})),
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

 function AssistantsView(props){
  const {t,boot,api,onCreate,onOpen}=props;
  const entries=roleEntries(boot);
  const status=boot?.roleStatus;
  const [skillsFor,setSkillsFor]=useState(null);
  const [settingsFor,setSettingsFor]=useState(null);
  const [deleteFor,setDeleteFor]=useState(null);
  const disabled=status?.compatible!==true;
  return h(React.Fragment,null,
   (status?.compatible===false)&&h('div',{className:'rw-error',role:'alert'},
    h('b',null,t('dsBotUnavailable')),
    h('div',null,status.error??t('roleConfigError')),
    status?.dsBot?.supportedVersion!==undefined&&h('div',{className:'rw-note'},t('dsBotVersion',{version:status.dsBot.supportedVersion}))),
   h('div',{className:'rw-panel'},
    h('div',{style:{display:'flex',alignItems:'center',gap:'6px'}},
     h('h3',{className:'rw-h',style:{margin:0,flex:'1'}},`${t('assistants')} (${entries.length})`),
     h('button',{className:'rw-primary',onClick:onCreate,disabled:disabled},t('newAssistant'))),
    h('div',{className:'rw-note'},t('assistantsHint')),
    entries.length===0&&h('div',{className:'rw-empty'},t('assistantsEmpty')),
    entries.map(entry=>h('div',{key:entry.botId,className:'rw-assistant'},
     h('div',{className:'rw-assistant-head'},
      h('div',{className:'grow'},
       h('div',{className:'rw-assistant-name'},entry.name??entry.botId),
       h('div',{className:'rw-assistant-sub'},`${templateLabel(t,boot,entry.templateId)} · ${entry.model??'—'}${entry.workDir?` · ${entry.workDir}`:''}`)),
      h('div',{className:'rw-assistant-actions'},
       h('button',{className:'rw-primary',disabled:entry.sessionId===null,onClick:()=>onOpen(entry)},t('openChat')),
       h('button',{className:'ghost',onClick:()=>setSettingsFor(entry),disabled:disabled},t('editSettings')),
       h('button',{className:'ghost',onClick:()=>setSkillsFor(entry),disabled:disabled},t('editSkills')),
       h('button',{className:'ghost',onClick:()=>setDeleteFor(entry)},t('deleteRole')))),
     entry.missing===true&&h('span',{className:'rw-badge err'},t('roleMissingBot')),
     (entry.conflicts??[]).length>0&&h('div',{className:'rw-chiprow'},
      entry.conflicts.map(conflict=>h('span',{key:`${conflict.kind}:${conflict.name}`,className:'rw-badge warn'},`${conflict.name} · ${t('skillConflict')}`))),
     h('div',{className:'rw-chiprow'},
      (entry.skills??[]).map(skill=>{
       const reason=roleSkillReason(t,skill);
       return h('span',{key:skillKey(skill),className:`rw-badge ${reason===null?'ok':'warn'}`},
        `${skill.name}${reason===null?'':` · ${reason}`}`);
      }))))),
   skillsFor!==null&&h(RoleSkillsDialog,{t,boot,api,entry:skillsFor,onClose:()=>setSkillsFor(null)}),
   settingsFor!==null&&h(RoleSettingsDialog,{t,api,entry:settingsFor,onClose:()=>setSettingsFor(null)}),
   deleteFor!==null&&h(RoleDeleteDialog,{t,api,entry:deleteFor,onClose:()=>setDeleteFor(null)}));
 }

 const roleBootApi={post:postBoot};

 function messageText(t,code){
  if(code===null||code===undefined)return null;
  const known=['needToken','noWorkspace','draftFailed','worked','chatUnavailable','pendingCancelled','assistantRemoved','botDeleted','assistantCreated'];
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
  useRoleReconcile(boot,roleBootApi);
  const entries=roleEntries(boot);

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
  const open=entry=>{
   if(entry?.sessionId===null||entry?.sessionId===undefined){go('assistants');return;}
   try{svc('uiWorkspace')?.openSession?.(entry.sessionId);}catch{go('assistants');return;}
   try{svc('layout')?.selectPanel?.(null);}catch{}
   researchView.set({selectedBotId:entry.botId});
   collapseSidebarIfNarrow();
  };

  return h('div',{className:'rw-side'},
   h('div',{className:'rw-side-head'},
    h('span',{className:'rw-side-title',title:t('title')},t('title')),
    h('span',{className:'rw-spacer'}),
    h('button',{className:'ghost',title:t('newAssistant'),onClick:()=>{researchView.set({tab:'assistants',createRequested:state.createRequested+1});try{svc('layout')?.selectPanel?.(PANEL_ID);}catch{}}},'＋')),
   h('button',{className:`rw-side-row${state.tab==='home'?' on':''}`,onClick:()=>go('home')},
    h(ResearchNavIcon,{kind:'home'}),h('span',{className:'rw-side-label'},t('tabHome'))),
   h('button',{className:`rw-side-row${state.tab==='skills'?' on':''}`,onClick:()=>go('skills')},
    h(ResearchNavIcon,{kind:'skills'}),h('span',{className:'rw-side-label'},t('tabSkills'))),
   h('button',{className:`rw-side-row${state.tab==='assistants'?' on':''}`,onClick:()=>go('assistants')},
    h(ResearchNavIcon,{kind:'assistants'}),h('span',{className:'rw-side-label'},t('tabAssistants')),
    h('span',{className:'rw-side-count'},String(entries.length))),
   h('div',{className:'rw-side-sep'}),
   h('div',{className:'rw-side-section'},t('currentChat')),
   h('div',{className:'rw-side-list'},
    entries.length===0&&h('div',{className:'rw-empty'},t('assistantsEmpty')),
    entries.map(entry=>h('button',{key:entry.botId,className:'rw-side-assist',onClick:()=>open(entry)},
     h('b',null,entry.name??entry.botId),
     h('span',null,`${templateLabel(t,boot,entry.templateId)} · ${entry.model??'—'}`)))),
   h('div',{className:'rw-side-grow'}),
   h('button',{className:'rw-side-back',onClick:exitResearch},`← ${t('modeExit')}`));
 }

 function ResearchPanel(props){
  const {t,boot,api}=props;
  const state=useResearchView();
  const [chooser,setChooser]=useState(null);
  const [createOpen,setCreateOpen]=useState(false);
  const handledCreate=useRef(state.createRequested);
  const entries=roleEntries(boot);
  const incompatible=boot?.roleStatus?.compatible!==true;
  const incompatibleText=boot?.roleStatus?.error??t('dsBotUnavailable');
  useRoleReconcile(boot,api);

  useEffect(()=>{
   if(state.createRequested!==handledCreate.current){
    handledCreate.current=state.createRequested;
    if(incompatible){api.setError(incompatibleText);return;}
    setCreateOpen(true);
   }
  },[state.createRequested,incompatible,incompatibleText,api]);

  const page=state.tab;
  const pendingList=Array.isArray(boot?.roleStatus?.pending)?boot.roleStatus.pending:[];
  const pendingConflict=pendingList.find(item => (item.matchedBotIds?.length ?? 0) > 1);
  const orphanPending=pendingList.find(item => (item.matchedBotIds?.length ?? 0) === 0);
  const pageLabel=page==='home'?t('tabHome'):page==='skills'?t('tabSkills'):t('tabAssistants');
  const askAssistant=useCallback(request=>setChooser(request),[]);
  const openAssistant=useCallback(entry=>{void openAssistantChat(api,entry,'');},[api]);
  const create=useCallback(()=>{
   if(incompatible){api.setError(incompatibleText);return;}
   setCreateOpen(true);
  },[incompatible,incompatibleText,api]);

  const useSkill=useCallback(row=>{
   const key=`${row.sourceId}/${row.name}`;
   const matching=assistantsWithSkill(entries,key);
   setChooser({title:t('chooseAssistant'),entries:matching,onPick:entry=>{void openAssistantChat(api,entry,`/${row.name} `);}});
  },[entries,api,t]);

  const pendingForForm=Array.isArray(boot?.roleStatus?.pending)
   ?(boot.roleStatus.pending.find(item=>item.matchedBotIds?.length===0)??boot.roleStatus.pending[0]??null)
   :null;

  const body=boot===undefined
   ?h('div',{className:'rw-body'},h('div',{className:'rw-note'},api.error!==null?messageText(t,api.error):t('loading')))
   :page==='home'
    ?h('div',{className:'rw-body'},h(HomeView,{t,boot,api,askAssistant,onCreate:create,createDisabled:incompatible,onOpenAssistants:()=>researchView.set({tab:'assistants'}),onOpenSkills:()=>researchView.set({tab:'skills'})}))
    :page==='skills'
     ?h('div',{className:'rw-body'},h(SkillsView,{t,boot,api,onUseSkill:useSkill,allowUse:true}))
     :h('div',{className:'rw-body'},h(AssistantsView,{t,boot,api,onCreate:create,onOpen:openAssistant}));

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
   incompatible&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},incompatibleText)),
   pendingConflict!==undefined&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},t('pendingConflict'))),
   orphanPending!==undefined&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-pending'},
    h('b',null,t('pendingTitle')),
    h('span',{className:'rw-note'},`${orphanPending.name} · ${t('pendingRetryReady')}`),
    h('div',{className:'rw-form'},h('button',{className:'ghost',onClick:create,disabled:incompatible},t('retryCreate'))))),
   errorText!==null&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},errorText)),
   noticeText!==null&&noticeText!==undefined&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-ok',role:'status'},noticeText)),
   body,
   h(AssistantChooser,{t,boot,request:chooser,onClose:()=>setChooser(null),onCreate:create,disabled:incompatible}),
   createOpen&&h(RoleCreateDialog,{t,boot,api,pending:pendingForForm,onClose:()=>setCreateOpen(false),onCreated:()=>researchView.set({tab:'assistants'})}));
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
   ?h('div',{className:'rw-body'},h('div',{className:'rw-note'},api.error!==null?api.error:t('loading')))
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
