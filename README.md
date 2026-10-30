# dsh-research-workbench

Research Workbench for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH).
It has two surfaces:

- a **Research mode** — its own sidebar, home, Skills page, and research assistants, with
  the classic session list and ordinary conversations out of the way;
- the **classic workbench panel** — the same project, literature, and upstream Skill
  management reachable from the ordinary Agent sidebar.

Research assistants are ordinary long-lived **DS-Bot** Bots. The workbench adds a role to a
Bot without owning its name, model, chat history, or group chats: those stay in DS-Bot. What
the workbench owns is which research Skills that Bot may see. A normal Agent, a non-research
Bot, and a research Bot without a role never receive the workbench catalog.

DS-Bot **0.2.3** is the supported release. The host half only reads its atomically written
`state.json`; every change to the team goes through DS-Bot's own same-origin `POST /api/bot`.
The workbench never rewrites `$DSH_HOME/bot/state.json`.

## What you get

### Research mode

Enter it from the classic workbench panel (`科研工作台` → `进入科研模式`). The classic
sidebar, new-session control, brand, and footer are hidden; the research sidebar shows:

- **Home** — task cards, project folders, research assistants, materials, and literature.
- **Research Skills** — upstream source management and the full Skill catalog.
- **Research assistants** — role cards with the Bot's name, model, working folder, and
  selected Skills.
- **Back to classic Agent** — removes the research overrides and restores the classic shell.

Task cards and “use this Skill” first ask which research assistant should receive the task,
then open that Bot's current DS-Bot chat and seed the composer. A task never creates a blank
workspace session. When no assistant has the needed Skill, the same dialog offers to create
one.

At narrow widths the shell collapses to a sidebar rail; a floating **Research navigation**
button opens it, and choosing a destination closes it again.

### Research assistants and Skills

- Six read-only templates: literature search and reading; research questions and design;
  data and results analysis; paper writing and submission; review and quality checks;
  figures and research presentation. Together they cover the currently registrable
  `nature-skills` entries plus `scientific-figure-making` from `figures4papers`. The design
  template starts with literature search, proposal writing and social-science topic skills;
  the analysis template starts with statistical reporting review, data availability and
  experiment logs. Further analysis depends on the Skills and tools the user adds. A
  template only seeds the initial selection; every assistant can add or remove Skills.
  Earlier template IDs are read as their current successors without changing existing Skills.
- Name, `provider/model`, optional working folder, and Skill selection are chosen when the
  assistant is created. The Skill list shows each name, source, and category, with search,
  filters, and checkboxes. The model comes from DSH's served models through DS-Bot.
- A creation is transactional: the workbench first records a pending selection, creates the
  Bot in DS-Bot with an invisible transaction marker, then attaches the role. If the response
  is lost, reopening the workbench finds the matching Bot by that marker and completes the
  role once; it never creates a second Bot.
- A Skill is exposed to a Bot only when it is selected on that Bot's role, enabled globally,
  present in its source, and not involved in a duplicate-name conflict. Duplicate names are
  reported, not silently resolved: two selected sources cannot offer the same Skill name, and
  two same-name paths inside one source are also a conflict.
- Removing a role deletes only the workbench assignment. Deleting the Bot itself is a
  separate, explicit choice.
- Role Skills are delivered to the Bot's own chat, earlier chat segments, group-member
  sessions, and group-member segments. The provider follows DS-Bot's saved ownership before
  each turn, so a new group session or a chat segment added by DS-Bot still sees the right
  catalog on its first request.
- If DS-Bot is missing, the wrong version, or its state is unreadable, the role surface names
  the reason and disables creation and Skill editing. Ordinary Agents keep working.

### Classic workbench panel

- **Projects** — every registered workspace with its path, session count, and material count.
  `Add project folder` uses the host's own picker and registers the folder as a workspace.
- **Materials and literature** — newest PDF/Markdown/TeX/Bib/image/script files per project
  plus any local literature folders you register (a Zotero `storage` directory works). Files
  can be opened natively, revealed in the file manager, or sent to a research assistant.
- **Skills page** — subscribe to a suggested upstream repository or add any GitHub repository /
  local folder. Suggested collections cover NatureSkills, figures4papers, Academic Research Skills
  (CC BY-NC 4.0), Science Superpowers (computational-science methodology), Scientific
  Writer, Bioinformatics Skills, Drug Discovery Skills, and book-to-skill. Per source: current revision, update state, `Check`,
  `Preview` (installed → latest, pending commits, diffstat), `Update`, `Remove`. Per Skill:
  category, source, revision, shared-dependency status, enable/disable, the complete upstream
  `SKILL.md`, and “use in session” (available in research mode). The full 177-skill K-Dense
  library is usable from a local clone, but its ~470 MB repository is too large for a
  one-click preset.

## Upstream sources are kept whole

A source is stored as the repository's complete directory tree under
`$DSH_HOME/dsh-research-workbench/sources/<id>/`. Nothing is rewritten or flattened, because
research Skill repositories ship shared sibling libraries that their skills reference by
relative path — for example `nature-skills` carries `nature-shared/core/...` next to
`nature-writing/`. Skills are registered with their own directory as the provider
`resourceBase`, so `../nature-shared/...` resolves on disk exactly as upstream intended.

The Skills page shows that check per Skill: `nature-shared ✓` means the sibling exists,
`✗` means the Skill references a library that is not in the checkout.

### Install and update

- A shallow `git clone --filter=blob:none --depth=50` when git can reach GitHub. Updates stay
  incremental: `git fetch`, commit list, `git diff --stat`, fast-forward merge (hard reset when
  upstream rewrote history).
- When git cannot reach the network, the same revision is installed from the GitHub archive and
  updates replace the whole tree. Both paths keep the complete directory tree.
- An archive download gets a ten-minute budget and a 100 MB cap. A download that fails changes
  nothing: the installed tree is only replaced after the new one is complete.
- One install runs at a time (`install.lock`, with stale-lock recovery); a second request gets
  `423`.

## Data layout

```
$DSH_HOME/dsh-research-workbench/
  state.json          sources, disabled skills, literature folders
  sources/<id>/       complete upstream repository trees
  install.lock        single-writer guard for sync work
  roles.json          { version, pending, roles } — Bot id → template + selected Skills
  roles.lock          single-writer guard for role edits
```

DS-Bot data stays where DS-Bot keeps it: `$DSH_HOME/bot/state.json` by default, or the
`home` configured on the enabled `ds-bot` plugin row. `$DSH_HOME` follows the harness rule: an
explicit `DSH_HOME` wins, a blank one counts as unset, otherwise `~/.dsh`.

A corrupt or unknown `roles.json` is reported and left untouched; the provider returns an
empty catalog rather than falling back to the whole source tree.

## Install

```bash
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench
# pin a revision instead of tracking the install-time snapshot of main
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench#<sha>
# or, from a checkout
dsh plugin --profile <profile> add /path/to/dsh-research-workbench
```

Research assistants additionally need DS-Bot 0.2.3 in the same profile:

```bash
dsh plugin --profile <profile> add ds-bot
```

The package is not on npm; the GitHub repository is the install source. Re-running the
command after a push is how a newer plugin version is taken.

`cordis.patch.yml` inserts one plugin row behind a guard that backs off when another enabled
entry already mounts this package, so an aggregate bundle wins without a duplicate route.

## Security

The browser half never touches the filesystem, the workspace registry, or a checkout.
Every workbench action goes through one same-origin JSON route,
`/api/dsh-research-workbench`:

- POST requires the per-boot `x-workbench-token` handed out by `bootstrap`,
- cross-site requests and the host's own request rejection are honored first,
- request bodies are capped, and every error carries a stable business code.

The DS-Bot adapter is read-only on the host side. Creation, model/name/folder changes,
deletion, and group actions use DS-Bot's own `POST /api/bot` from the page, so DS-Bot's lock,
migrations, and archive behavior remain authoritative. The workbench does not simulate DS-Bot
UI clicks or write its localStorage.

Skill isolation is a catalog boundary, not a filesystem sandbox. A Bot that can already read
a path can still read it; the provider only controls which `SKILL.md` documents DSH offers as
Skills.

## Development

```bash
npm install
npm run check   # node --check over every lib module
npm test        # node --test: scanning, roles, provider isolation, HTTP fence, git update
```

`test/workbench.test.mjs` builds a `nature-skills`-shaped fixture (shared sibling plus skills
at depths 1 and 2), asserts the scan and the provider contract, and exercises the HTTP route
including token rejection, the cross-site fence, content-type enforcement, lock contention,
and directory browsing.

`test/roles.test.mjs` builds a DS-Bot-shaped state file and covers role transactions and
marker recovery, per-Agent isolation across own chats, earlier segments and group sessions,
pending markers, duplicate-name conflicts, disabled/removed sources, restart persistence,
corrupt `roles.json`, the role HTTP actions and the `roles.lock` 423, plus a real local Git
source whose `applyUpdate` invalidates the selected Skill directory.

Host modules:

| Module | Role |
| --- | --- |
| `lib/index.js` | plugin entry: data root, per-Agent Skill provider, HTTP route |
| `lib/ds-bot.js` | DS-Bot version/home discovery, state read, Session → Bot index |
| `lib/research-roles.js` | `roles.json`, templates, selection evaluation, Session → role |
| `lib/skill-sources.js` | state, lock, git runner, GitHub archive, atomic directory swap |
| `lib/skill-manager.js` | source install/update/remove, `SKILL.md` scan, management catalog |
| `lib/workbench-api.js` | JSON routes: bootstrap, roles, skills, materials, native open |
| `lib/client.js` | browser bundle: research mode, assistants, workbench panel, Skills page |

## Known limits

- DS-Bot is pinned to 0.2.3; another version disables the role surface until it is updated.
- A GitHub source needs network access to install and to check for updates.
- A local folder source is read in place; it has no revision to compare, so it reports as a
  local folder instead of an update.
- Materials are listed one directory level deep — research projects keep inputs at the root
  and sections one level down.
- Upstream renames are not followed silently. A selected Skill whose directory disappeared
  stays in the role as unavailable until the operator selects its new name.
- Skill isolation covers the catalog offered to a model, not filesystem permissions.

## License

MIT
