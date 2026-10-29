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
 .rw-root button.primary{background:var(--dsw-alias-button-primary-fill,#4d6bfe);border-color:transparent;color:var(--dsw-alias-button-primary-label,#fff)}
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
 @container (max-width:680px){.rw-cols{grid-template-columns:1fr}}
 .rw-panel{border:1px solid var(--dsw-alias-hairline,rgba(128,128,128,.24));border-radius:10px;padding:10px;min-height:80px;display:flex;flex-direction:column;gap:6px;flex:none}
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
 `;

 if(typeof document!=='undefined'&&document.querySelector('style[data-plugin-css="dsh-research-workbench"]')===null){
  const tag=document.createElement('style');
  tag.dataset.plugin='dsh-research-workbench';
  tag.dataset.pluginCss='dsh-research-workbench';
  tag.textContent=css;
  document.head.appendChild(tag);
 }

 const svc=name=>{try{return boundCtx?.get?.(name);}catch{return undefined;}};

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
    if(payload?.skillStatus)setBoot(current=>current===undefined?current:{...current,skillStatus:payload.skillStatus});
    if(payload?.literatureDirs||payload?.literatureFiles){
     setBoot(current=>current===undefined?current:{...current,literatureDirs:payload.literatureDirs??current.literatureDirs,literatureFiles:payload.literatureFiles??current.literatureFiles});
    }
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
  * Reveal one session in the main view and leave the workbench panel.
  * @param sessionId - session to open.
  */
 function openSessionWithPanelClose(sessionId){
  try{svc('uiWorkspace')?.openSession?.(sessionId);}catch{return;}
  try{svc('layout')?.selectPanel?.(null);}catch{}
 }

/**
 * Resolve a workspace item from the live client list.
 * @param workspaceId - registered workspace id.
 * @returns the workspace view, when it exists.
 */
 function findWorkspace(workspaceId){
  const items=svc('workspaces')?.list?.getSnapshot?.()?.items;
  if(!Array.isArray(items))return undefined;
  return items.find(item=>item.workspaceId===workspaceId);
 }

 /**
  * Reuse the workspace's blank session, or create one.
  *
  * The host's own workspace flow reuses a saved blank too; doing it here keeps
  * this plugin from leaving one empty session behind per opened task.
  * @param workspaceId - registered workspace id.
  * @returns the session id to reveal.
  */
 async function ensureBlankSession(workspaceId){
  const sessions=svc('sessions');
  if(sessions?.create===undefined)throw new Error('session service unavailable');
  const workspace=findWorkspace(workspaceId);
  const byId=sessions.list.getSnapshot()?.byId??{};
  if(workspace!==undefined){
   for(const summary of Object.values(byId)){
    if(summary.blank===true&&summary.cwd===workspace.path&&workspace.sessionIds.includes(summary.id))return summary.id;
   }
  }
  return await sessions.create({workspaceId});
 }

 /**
  * Write text into one session's composer.
  *
  * The composer is mounted per session scope, and a freshly created session
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
  * Open a workspace session and seed its composer.
  * @param workspaceId - registered workspace id.
  * @param text - draft text; empty just opens the session.
  * @returns `opened`, `seeded`, `unseeded`, or `failed`.
  */
 async function startSessionWithDraft(workspaceId,text){
  try{
   const sessionId=await ensureBlankSession(workspaceId);
   svc('uiWorkspace')?.openSession?.(sessionId);
   svc('layout')?.selectPanel?.(null);
   if(typeof text!=='string'||text.trim()==='')return 'opened';
   return (await seedDraft(sessionId,text))?'seeded':'unseeded';
  }catch{
   return 'failed';
  }
 }

 /**
  * Launch a session for one workbench action and report the outcome through
  * the panel's error and notice slots.
  * @param api - workbench API state handle.
  * @param workspaceId - target workspace.
  * @param text - draft placed in the composer.
  */
 function launchSession(api,workspaceId,text){
  api.setError(null);
  api.setNotice(null);
  startSessionWithDraft(workspaceId,text).then((result)=>{
   if(result==='failed')api.setError('noWorkspace');
   else if(result==='unseeded')api.setError('draftFailed');
   else if(result==='seeded')api.setNotice('worked');
  });
 }

 function skillRows(boot){
  const rows=boot?.skillStatus?.skills;
  return Array.isArray(rows)?rows:[];
 }

 function usableSkills(boot){
  return skillRows(boot).filter(row=>row.disabled!==true&&row.shadowedBy===undefined);
 }

 function pickSkill(boot,category,fallbackName){
  const rows=usableSkills(boot);
  const byCategory=rows.find(row=>row.category===category);
  if(byCategory!==undefined)return byCategory.name;
  if(fallbackName!==undefined&&rows.some(row=>row.name===fallbackName))return fallbackName;
  return undefined;
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
      h('button',{className:'ghost',onClick:event=>{event.stopPropagation();onNewSession(item.workspaceId);}},t('newSession'))));
   }));
 }

 function SessionsPanel(props){
  const {t,sessions,workspaceId,onOpen}=props;
  const [query,setQuery]=useState('');
  const byId=sessions?.byId??{};
  const ids=Array.isArray(sessions?.ids)?sessions.ids:Object.keys(byId);
  const needle=query.trim().toLowerCase();
  const rows=[];
  for(const id of ids){
   const summary=byId[id];
   if(summary===undefined)continue;
   if(summary.origin==='subagent')continue;
   if(needle!==''&&!String(summary.displayTitle??'').toLowerCase().includes(needle))continue;
   rows.push(summary);
  }
  const workspace=workspaceId===undefined?undefined:(Array.isArray(props.workspaces?.items)?props.workspaces.items.find(item=>item.workspaceId===workspaceId):undefined);
  const scoped=workspace===undefined?rows:rows.filter(summary=>workspace.sessionIds.includes(summary.id)||summary.cwd===workspace.path);
  const shown=scoped.slice(0,30);
  return h('div',{className:'rw-panel'},
   h('div',{style:{display:'flex',alignItems:'center',gap:'6px'}},
    h('h3',{className:'rw-h',style:{margin:0,flex:'1'}},t('sessions')),
    h('input',{type:'text',value:query,placeholder:t('searchSessions'),onChange:event=>setQuery(event.target.value),style:{maxWidth:'190px'}})),
   shown.length===0&&h('div',{className:'rw-empty'},t('sessionsEmpty')),
   shown.map(summary=>h('div',{key:summary.id,className:'rw-row',onClick:()=>onOpen(summary.id)},
    h('div',{className:'grow'},
     h('b',{className:'rw-name'},summary.displayTitle??summary.id),
     h('span',{className:'rw-sub'},summary.cwd??'')),
    summary.running===true&&h('span',{className:'rw-badge ok dot'},'running'))));
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
  const {t,boot,api}=props;
  const workspacesState=useWorkspacesState();
  const sessionsState=useSessionsState();
  const items=Array.isArray(workspacesState?.items)?workspacesState.items:[];
  const [selected,setSelected]=useState(undefined);
  const [dialog,setDialog]=useState(null);
  const workspace=items.find(item=>item.workspaceId===selected)??items[0];
  const files=workspace===undefined?[]:(boot?.filesByWorkspace?.[workspace.workspaceId]??[]);

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
   launchSession(api,workspace.workspaceId,buildPrompt(t,t('promptAttach'),undefined,rows));
  };

  const runTask=(task)=>{
   if(workspace===undefined){
    api.setError('noWorkspace');
    return;
   }
   const skill=pickSkill(boot,task.category,task.fallback);
   const file=pickFile(files,task.extensions);
   launchSession(api,workspace.workspaceId,buildPrompt(t,t(task.promptLabel),skill,file===undefined?[]:[file]));
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
     onNewSession:workspaceId=>{if(items.some(item=>item.workspaceId===workspaceId))launchSession(api,workspaceId,'');}}),
    h(SessionsPanel,{t,sessions:sessionsState,workspaces:workspacesState,workspaceId:workspace?.workspaceId,
     onOpen:sessionId=>{openSessionWithPanelClose(sessionId);}})),
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
     h('button',{className:'primary',disabled:path.trim()==='',onClick:()=>onSubmit(path.trim())},t('add')))));
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
    h('button',{className:'primary',disabled:busy!==null||(form.kind==='local'?form.path.trim()==='':form.url.trim()===''),onClick:addSource},t('addSource'))),
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
  const {t,boot,api,onUseSkill}=props;
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
      h('button',{className:'primary',onClick:()=>onUseSkill(row)},t('useSkill')),
      h('button',{className:'ghost',disabled:api.busy!==null,onClick:()=>api.post('toggle-skill',{sourceId:row.sourceId,name:row.name,enabled:row.disabled===true}).catch(()=>{})},row.disabled===true?t('enable'):t('disable')))))),
   detail!==null&&h(SkillDetail,{t,detail,onClose:()=>setDetail(null)}));
 }

 function WorkbenchRoot(){
  const t=useT();
  const api=useWorkbenchApi();
  const [tab,setTab]=useState('home');
  const boot=api.boot;

  const useSkill=useCallback(row=>{
   const workspacesState=svc('workspaces')?.list?.getSnapshot?.();
   const workspace=Array.isArray(workspacesState?.items)?workspacesState.items[0]:undefined;
   if(workspace===undefined){
    api.setError('noWorkspace');
    return;
   }
   launchSession(api,workspace.workspaceId,`/${row.name} `);
  },[api]);

  const body=boot===undefined
   ?h('div',{className:'rw-body'},h('div',{className:'rw-note'},api.error!==null?api.error:t('loading')))
   :tab==='home'
    ?h('div',{className:'rw-body'},h(HomeView,{t,boot,api,onOpenSkills:()=>setTab('skills')}))
    :h('div',{className:'rw-body'},h(SkillsView,{t,boot,api,onUseSkill:useSkill}));

  const messageOf=code=>{
   if(code===null||code===undefined)return null;
   if(code==='needToken'||code==='noWorkspace'||code==='draftFailed'||code==='worked')return t(code);
   return code;
  };
  const errorText=messageOf(api.error);
  const noticeText=messageOf(api.notice);

  return h('div',{className:'rw-root'},
   h('div',{className:'rw-bar'},
    h('span',{className:'rw-title'},t('title')),
    h('div',{className:'rw-tabs'},
     h('button',{className:`rw-tab${tab==='home'?' on':''}`,onClick:()=>setTab('home')},t('tabHome')),
     h('button',{className:`rw-tab${tab==='skills'?' on':''}`,onClick:()=>setTab('skills')},t('tabSkills'))),
    h('div',{className:'rw-spacer'}),
    boot!==undefined&&h('span',{className:'rw-note'},`v${boot.version}`),
    h('button',{className:'ghost',onClick:()=>api.refresh(),disabled:api.busy!==null},t('refresh'))),
   errorText!==null&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-error',role:'alert'},errorText)),
   noticeText!==null&&noticeText!==undefined&&h('div',{style:{padding:'8px 12px 0'}},h('div',{className:'rw-ok',role:'status'},noticeText)),
   body);
 }

 return {
  inject:['slots','locale','sessions','layout'],
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
   ctx.effect(()=>ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:PANEL_ID,order:35,label:()=>t('title'),locale:NS},WorkbenchRoot)),'research-workbench: settings section');
  },
 };
}});
