# US-03 — Create Job (frontend)

**Jira:** _not recorded — fill in_
**Repos touched:** `assms-frontend`, `assms-job-service`
**Backing services:** Job Service (`/api/jobs`) · Customer & Asset Service (dropdown data)
**Route:** `/jobs/new` · **Nav:** "New job"
**Service-side doc:** US-03 — Create Job · `assms-job-service/docs/job-management/US-03-create-job.md`

> As an Agent, I want to raise a job against a customer's unit from one screen, so that I
> pick the customer and their equipment without leaving the form.

---

## 1. What was built

| Layer | Files |
|---|---|
| Env | `.env`, `.env.example`, `src/vite-env.d.ts` |
| Constants | `src/constants/job.ts` |
| Types | `src/types/job.ts` |
| Service | `src/services/jobService.ts` |
| Form | `src/components/forms/JobForm.tsx` |
| Page | `src/pages/jobs/CreateJobPage.tsx` |
| Shell | `src/routes/AppRoutes.tsx`, `src/components/layout/AppLayout.tsx` |

`npm run lint` and `npm run build` both clean.

### The second backing service

`VITE_JOB_API_URL=http://localhost:5252` — the port comes from the Job Service's
`launchSettings.json`, not a guess. Declared in `vite-env.d.ts` as a required `string`,
like `VITE_CUSTOMER_API_URL`, so there is no null check at every call site and no
fallback URL to mask a missing `.env`.

`jobService.ts` creates its **own axios instance**. The existing rule is one instance per
backing service, not per resource — which is why `assetService.ts` shares the customer
instance but this one does not. Two processes, two ports, two base URLs.

**This form talks to both services.** The dropdowns are filled from the customer service;
the submit goes to the job service. That matters for the failure modes in section 5.

---

## 2. Constants and derived unions

`SERVICE_CATEGORIES`, `PRIORITIES` and `REGIONS` are `as const` arrays, and the
`ServiceCategory`, `Priority` and `Region` unions in `types/job.ts` are derived from them
with `(typeof X)[number]`. Same pattern as `asset.ts` and `customer.ts`: the array is the
single source of truth, so the select options and the union cannot drift apart.

Each array is paired with a `_LABELS` record, because the raw values are what the API
sees but `WARRANTY_CLAIM` and `NORTH_WESTERN` are not what an Agent should read.

`JobResponse.status` is a plain `string`, not a union — the same call as
`CustomerResponse.status`. The job lifecycle grows in later sprints, and a value the
frontend has not heard of should render rather than fail to type-check against a stale
union.

---

## 3. The cascading dropdowns

This is the substance of the story. Everything else is a form.

```
Customer select                 getAllCustomers('ACTIVE')          on mount
      │
      │  onChange
      ▼
  clearAssetState(newId)        assets = [], error = null, loading = (newId !== '')
      │                         values.assetId = ''
      │
      ▼
  effect on customerId          getAssetsByCustomerId(id)
      │                         .filter(a => a.status === 'ACTIVE')
      ▼
Asset select
```

**Only active customers** are offered. The job service refuses a job against an inactive
one, so listing them would be offering a guaranteed 409.

**Assets are filtered client-side.** `getAssetsByCustomerId` returns the customer's whole
equipment history, deactivated units included — that endpoint exists to show history, and
narrowing it server-side would break the asset pages that need it. The job form wants only
what a job can be raised against, so it filters here.

**The asset selection is cleared when the customer changes.** The asset that was picked
belongs to the customer that was picked; carrying it over would submit someone else's
equipment, and the server would correctly reject it with a `CustomerMismatch` 409 — after
the Agent had already filled in the rest of the form.

### Where the reset lives, and why not in the effect

The first version cleared the asset list inside the `useEffect`. ESLint rejected it:

```
react-hooks/set-state-in-effect
  Calling setState synchronously within an effect can trigger cascading renders
```

The rule is right, and the fix is not a suppression. Clearing the list belongs to
`clearAssetState`, called from the **event that invalidates it** — the customer changing,
and the form resetting after a successful create. The effect now does only the fetch, and
its `setState` calls all happen after an `await`, which is the asynchronous callback the
rule permits.

The fix is also better behaviour. `clearAssetState` sets `assetsLoading` to `true` in the
same render the customer changes, so the select reads "Loading assets…" immediately. Left
to the effect it would have shown "No active assets" for one frame — before the request
had even started.

### The cancelled-flag race guard

```ts
let cancelled = false
async function load() {
  const owned = await getAssetsByCustomerId(selectedCustomerId)
  if (cancelled) return
  setAssets(owned.filter(a => a.status === ACTIVE))
  …
}
void load()
return () => { cancelled = true }
```

An Agent changing customer twice in quick succession fires two fetches. Responses are not
guaranteed to arrive in request order, so **a slow response for customer A can land after
a fast one for customer B** and leave B selected with A's equipment in the dropdown. The
Agent then picks an asset that belongs to someone else.

The cleanup sets `cancelled` before the next effect runs, so a stale response is discarded
instead of written to state. The flag is checked in `catch` and `finally` too — a stale
*failure* must not paint an error over the current customer's perfectly good list, and a
stale `setAssetsLoading(false)` would clear the spinner for a fetch still in flight.

The server would catch the resulting mismatch anyway. The point is not to reach the server
with a request that was only ever wrong because of a rendering race.

### No active assets

If the chosen customer has no active assets, there is nothing submittable — so the form
says so rather than showing an empty dropdown the Agent would keep clicking at:

> This customer has no active assets. A job is raised against a unit, so register one for
> them — or pick a different customer — before continuing.

`noActiveAssets` also disables the submit button. The same treatment as `noActiveCustomers`,
which follows the precedent set by `AssetForm`.

The asset select is disabled whenever there is nothing to choose from — no customer yet,
a fetch in flight, a failed fetch, or no active assets — and its placeholder says which:
"Select a customer first" / "Loading assets…" / "No active assets" / "Select an asset".

---

## 4. Field defaults

| Field | Default | Why |
|---|---|---|
| `customerId` | `''` | List not known until it loads |
| `assetId` | `''` | Depends on the customer |
| `serviceCategory` | `SERVICE_CATEGORIES[0]` — `INSTALLATION` | A real value, so the state matches the union with no cast |
| `priority` | **`'MEDIUM'`, not `PRIORITIES[0]`** | See below |
| `region` | `''` | No province is a safe guess |
| `problemDescription` | `''` | |

### Priority is the one deliberate break from the pattern

Every other enum select in the codebase defaults to its array's first element. Here the
first element is `LOW`, and **priority is a triage field**. Defaulting it to the lowest
value would quietly under-prioritise every job an Agent did not think to change — a
silent, systematic bias in what Dispatch sees first.

`MEDIUM` is the neutral middle. It is a deliberate exception to a local convention, which
is exactly the kind of thing that gets "tidied" back to `PRIORITIES[0]` by someone reading
for consistency. It is commented in the source for that reason.

`region` gets no default at all, for the opposite reason: there is no province that is a
safe guess, so it carries a placeholder option and the server reports it if skipped.

### The one cast

`JobFormValues` widens `region` to `Region | ''`, and submit casts it back:

```ts
region: values.region as Region,
```

A blank is sent deliberately, so the server returns its own 400 keyed on `region` — the
same message, from the same place, as every other missing field. The alternative is the
form inventing a second validation message of its own, and then two sources of truth for
what "required" means.

---

## 5. Two failure modes that look the same and are not

The form talks to two services, so "it didn't work" has more than one meaning. Both land
in the same `catch`, and the branch is **whether the problem details carry an `errors`
object** — the convention inherited from the customer forms.

| | Refusal | Job Service says its dependency is down | Job Service itself is down |
|---|---|---|---|
| HTTP | 400 or 409 | **503** | *no response at all* |
| Body | `ValidationProblemDetails` with `errors` | `ProblemDetails`, no `errors` | none |
| Branch | `problem?.errors` → `setFieldErrors` | `else` → `setFormError` | `else` → `setFormError` |
| Shown | Against the offending input | Banner: title + detail | Banner: "Could not reach the job service. Try again." |
| Agent action | Fix the field | Wait and retry — nothing to fix | Nothing; it is an outage |

The middle column is the interesting one. A **503 is a real HTTP response from a healthy
Job Service** saying it could not reach the *customer service* to validate. Nothing about
the request was found to be wrong, so the message says to try again rather than to change
something — and the request is safe to repeat unchanged.

The third column is different: the Job Service itself is not answering, so axios throws
with no `error.response`. `problem` is `undefined`, the `join(' ')` produces `''`, and the
fallback message renders.

**CORS does not rescue the third case.** The Job Service now sends CORS headers, so the
browser can read a 503 body — that is what makes the middle column possible at all. But if
the process is not running there is no response to attach headers to, and the browser
reports an opaque network error. That is a different failure from the 503, and it is why
the two are worded differently.

The 409s need no special handling. All four — asset missing, wrong owner, inactive asset,
inactive customer — come back keyed on `assetId` or `customerId`, so the one
`setFieldErrors` branch renders each against its own select.

---

## 6. Success

The job reference is the point of the form. It is what the Agent reads back to the
customer, so on success it is the largest thing on the page:

```tsx
<p className="mb-1">Job created. Give the customer this reference:</p>
<p className="display-6 font-monospace mb-2">{created.jobReference}</p>
```

Monospace because it is read aloud character by character, and the service deliberately
drew it from an alphabet with no I, L, O or U for the same reason — see
§4 of `assms-job-service/docs/job-management/US-03-create-job.md`.

Below it, a one-line summary — category, priority, region — through the `_LABELS` records,
so it reads as prose rather than as enum values.

The form then resets, including `clearAssetState('')`. Without that the previous
customer's assets would sit behind the now-disabled select.

---

## 7. Handover to QA

1. **The race guard.** Throttle the network, switch customer rapidly, and confirm the
   asset dropdown always matches the selected customer. This is the bug the flag exists
   for and it cannot be seen on a fast local machine.
2. **All four 409s** rendered against the right input, especially inactive-customer, which
   needs a customer deactivated after their asset was registered.
3. **The 503 versus the outage.** Stop the *customer* service and confirm the banner shows
   the Job Service's 503 detail. Then stop the *job* service and confirm the generic
   "could not reach" message. They must not read the same.
4. **No-active-assets** for a customer whose every unit is deactivated: warning shown,
   submit disabled.
5. **Priority default** — confirm with the business that `MEDIUM` is the right neutral
   starting point before this ships.

---

## 8. Decisions worth carrying forward

- **One axios instance per backing service.** Second application of the rule; the first
  service to be added since it was written.
- **Derive unions from `as const` arrays**, and pair every array with a labels record.
- **Reset dependent state in the event that invalidates it, not in an effect.** It
  satisfies `react-hooks/set-state-in-effect` and produces better intermediate renders.
- **Guard every dependent fetch with a cancelled flag.** Out-of-order responses are a real
  bug, not a theoretical one, the moment a select drives a fetch.
- **Send the blank and let the server validate**, rather than duplicating the rule in the
  form.
- **A sensible default beats a consistent one** when the field carries meaning — but
  comment the exception, or it will be tidied away.
- **Distinguish "the server refused" from "the server is not there"** in what the user is
  told. Only one of them is worth retrying.

---

## TODO before merge

- [ ] Jira id and branch name for this story
- [ ] Confirm `MEDIUM` as the priority default with the business (§4)
- [ ] Job list and detail pages — `getJobById` and `getJobByReference` are both written and
      currently unused by the UI
- [ ] A "look up by reference" entry point; the service call exists, nothing calls it
- [x] Route path — **`/jobs/new`**, nav link "New job"
- [x] `VITE_JOB_API_URL` — **`http://localhost:5252`**, from the service's `launchSettings.json`
