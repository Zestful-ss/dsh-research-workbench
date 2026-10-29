# dsh-research-workbench

Research Workbench for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH). One top-level
navigation entry that gathers the four things a research session actually needs: the
project folders you work in, the sessions you already ran, the papers and drafts on disk,
and the upstream scientific **Skills** that do the reading, writing, reviewing, and
figure work.

The plugin does not rebuild anything DSH already owns. Workspaces come from
`workspaceRegistry`, sessions and titles from `sessionController` / `sessionTitle`, folder
picking from `directoryPicker`, native opening from the session controller, and the Skill
catalog from `ctx.skills`. The workbench adds the hub, the upstream Skill source
management, and a `ctx.skills` provider for those sources.

## What you get

**A workbench panel** (`科研工作台` in the left rail, also reachable as a settings section):

- **Task cards** — read a paper, write and polish, review and verify, make figures. Each one
  picks the best matching upstream Skill for the job, attaches the newest matching file from
  the selected project, and opens a session whose composer is already seeded with
  `/<skill> <instruction>` plus the file path. The `/skill` token is the host's own
  gesture, so DSH injects the Skill body on the next step.
- **Projects** — every registered workspace with its path, session count, and material count.
  `Add project folder` uses the host's own picker and registers the folder as a workspace.
- **Recent sessions** — live from the host's session list; click to jump back.
- **Materials and literature** — newest PDF/Markdown/TeX/Bib/image/script files per project
  plus any local literature folders you register (a Zotero `storage` directory works).
  Files can be opened natively, revealed in the file manager, or sent into a session.

**A Skills page**:

- Subscribe to a suggested upstream repository or add any GitHub repository / local folder.
- Per source: current revision, update state, `Check`, `Preview` (installed → latest, pending
  commits, diffstat), `Update`, `Remove`.
- Per skill: category, source, revision, **shared dependency status**, enable/disable,
  the complete upstream `SKILL.md`, and "use in session".

## Upstream sources are kept whole

A source is stored as the repository's complete directory tree under
`$DSH_HOME/dsh-research-workbench/sources/<id>/`. Nothing is rewritten or flattened, because
research Skill repositories ship shared sibling libraries that their skills reference by
relative path — for example `nature-skills` carries `nature-shared/journal-profiles.md` next
to `nature-writing/`. Skills are registered with their own directory as the provider
`resourceBase`, so `../nature-shared/...` resolves on disk exactly as upstream intended.

The Skills page shows that check per skill: `nature-shared ✓` means the sibling exists,
`✗` means the skill references a library that is not in the checkout.

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
```

`$DSH_HOME` follows the harness rule: an explicit `DSH_HOME` wins, a blank one counts as
unset, otherwise `~/.dsh`.

## Install

```bash
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench
# pin a revision instead of tracking the install-time snapshot of main
dsh plugin --profile <profile> add github:Zestful-ss/dsh-research-workbench#<sha>
# or, from a checkout
dsh plugin --profile <profile> add /path/to/dsh-research-workbench
```

The package is not on npm; the GitHub repository is the install source. Re-running the
command after a push is how a newer plugin version is taken.

`cordis.patch.yml` inserts one plugin row behind a guard that backs off when another enabled
entry already mounts this package, so an aggregate bundle wins without a duplicate route.

## Security

The browser half never touches the filesystem, the workspace registry, or a checkout.
Every action goes through one same-origin JSON route, `/api/dsh-research-workbench`:

- POST requires the per-boot `x-workbench-token` handed out by `bootstrap`,
- cross-site requests and the host's own request rejection are honored first,
- request bodies are capped, and every error carries a stable business code.

Host-side service access is read through `ctx.get(...)` only; nothing here reaches into
another plugin's internals.

## Development

```bash
npm install
npm run check   # node --check over every lib module
npm test        # node --test: scanning, provider contract, HTTP fence
```

`test/workbench.test.mjs` builds a `nature-skills`-shaped fixture (shared sibling plus skills
at depths 1 and 2), asserts the scan and the provider contract, and exercises the HTTP route
including token rejection, the cross-site fence, content-type enforcement, lock contention,
and directory browsing.

Host modules:

| Module | Role |
| --- | --- |
| `lib/index.js` | plugin entry: data root, `ctx.skills` provider, HTTP route |
| `lib/skill-sources.js` | state, lock, git runner, GitHub archive, atomic directory swap |
| `lib/skill-manager.js` | source install/update/remove, `SKILL.md` scan, provider catalog |
| `lib/workbench-api.js` | JSON routes: bootstrap, skills, materials, native open |
| `lib/client.js` | browser bundle: nav entry, workbench panel, Skills page |

## Known limits

- A GitHub source needs network access to install and to check for updates.
- A local folder source is read in place; it has no revision to compare, so it reports as a
  local folder instead of an update.
- Materials are listed one directory level deep — research projects keep inputs at the root
  and sections one level down.
- A session opened by a task card is a normal DSH session; stopping, archiving, and model
  choice stay with DSH.

## License

MIT
