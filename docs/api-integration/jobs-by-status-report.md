# Jobs by Status Report (frontend)

**Jira:** _not recorded — fill in_
**Repos touched:** `assms-frontend`, `assms-reporting-service`
**Backing service:** Reporting Service (`/api/reports/jobs-by-status`)
**Route:** `/reports/jobs-by-status` · **Nav:** "Jobs by status"
**Service-side doc:** The `job_projection` read model ·
`assms-reporting-service/docs/read-model/job-projection.md`

> As a Manager, I want to see how many jobs sit at each stage, so that I can tell at a
> glance where work is piling up.

---

## 1. What was built

| Layer | Files |
|---|---|
| Env | `.env`, `.env.example`, `src/vite-env.d.ts` |
| Types | `src/types/report.ts` |
| Service | `src/services/reportService.ts` |
| Page | `src/pages/reports/JobsByStatusPage.tsx` |
| Shell | `src/routes/AppRoutes.tsx`, `src/components/layout/AppLayout.tsx` |

`npm run lint` and `npm run build` both clean.

No form component. Unlike US-03 the whole screen is two inputs and a table, so splitting a
`ReportFilters` component out would have moved state across a boundary for no gain.

### The third backing service

`VITE_API_BASE_URL=https://<assms-apim>.azure-api.net` is the APIM origin.
The report client appends `/reports` and APIM forwards its existing `/api/...`
path to Reporting Service. It is declared in `vite-env.d.ts` as a required
`string`, so there is no null check at every call site and no fallback URL to
mask a missing `.env`.

`reportService.ts` creates its **own axios instance**. Third application of the rule: one
instance per backing service, not per resource.

**This page reads a different database from every other page in the app.** The customer and
job pages read the system of record; this one reads a projection the Reporting Service
built from Kafka events. That has one visible consequence — see §6.

---

## 2. Types

```ts
export interface StatusCount {
  status: string
  count: number
}

export interface JobsByStatusReport {
  statuses: StatusCount[]
  total: number
}
```

`status` is a plain `string`, not a union — the same call as `CustomerResponse.status` and
`JobResponse.status`. Here the reason is stronger than precedent: the reporting service
**deliberately holds no list of what the statuses are**, and its table carries no `CHECK`
constraint on the column, precisely so a value added to the job lifecycle upstream is
absorbed rather than rejected. A union here would undo that at the last step, failing to
type-check against a value the whole backend was designed to let through.

`total` is the API's own number, and the table renders it rather than summing the rows.
The rows are what the server grouped; re-adding them in the client would be a second
answer to the same question, and the two would disagree the moment the API pages or caps
the rows.

---

## 3. The rule: a parameter that is absent must be absent, not empty

This is the substance of the service layer.

```ts
const params: Record<string, string> = {}

if (from) {
  params.from = from
}

if (to) {
  params.to = to
}
```

Built up key by key rather than passed as `{ from, to }`.

**Sending `?from=` is not the same as sending nothing.** The API reads an empty query value
as a caller who *cleared the field* and returns the **unfiltered** report. So an empty
string does not narrow the range — it silently widens it to everything, and the screen
fills with numbers that do not match the dates above them. That failure is invisible: it
is a 200 with plausible data.

Second application of a rule already in the codebase — `getAllCustomers` appends `status`
the same way, and its comment gives the same reasoning. Worth stating as a general rule for
this app: **an optional query parameter is either present with a value or not in the URL.**

Both bounds are independent. Supplying one must not invent the other, so the two `if`s are
separate rather than an all-or-nothing branch.

---

## 4. Two pieces of filter state, not one

```ts
const [from, setFrom] = useState('')       // what is typed
const [to, setTo] = useState('')
const [applied, setApplied] = useState<AppliedFilters>(NO_FILTERS)  // what was run
```

Typing a date must **not** change the table underneath. If the inputs drove the fetch
directly, the numbers on screen would stop matching the range that produced them the moment
someone started editing — and a half-typed date (`2026-08-0`) would fire a request of its
own.

`applied` is an object, and Apply always sets a **new** one. That is deliberate: pressing
Apply twice with the same dates re-runs the report rather than doing nothing, which is what
a person expects from a refresh button on a screen whose data changes underneath them.

### Where the pending reset lives, and why not in the effect

`react-hooks/set-state-in-effect` again — third time in this codebase, and the first time it
rejected a shape that looked correct.

The fetch was first written as a `useCallback` the effect called on mount. The rule flagged
it, and **kept flagging it after the synchronous `setState`s were moved past the first
`await`**: it does not trace through a `useCallback` identifier, so any call to one from an
effect body reads as a violation.

What passes is the shape the other pages already use — the async function declared *inside*
the effect, with the effect keyed on `applied`:

```
Apply pressed  ──→  setLoading(true), clear errors      (event handler — allowed)
                    setApplied({ from, to })
                          │
                          ▼
                    effect on [applied]  ──→  load()  ──→  getJobsByStatus(...)
```

The first run needs no reset at all: `loading` starts `true`, `error` starts `null`,
`fieldErrors` starts `{}`. So the effect's `load()` does nothing before its first `await`,
and the "we are now loading" state belongs to whichever event caused it — the initial state
for the mount, the submit handler for Apply.

This is the same conclusion US-03 reached for `clearAssetState`, arrived at from the
opposite direction: there the reset was moved *out* of an effect, here it was never allowed
in.

### The cancelled-flag race guard

Second application. Apply can be pressed again while a request is in flight, and without the
flag a slow response for the previous range can land after the new one's — leaving the wrong
numbers under the new dates. Same guard, same reason, as the asset fetch in `JobForm`.

---

## 5. Four render states

| State | Condition | What is shown |
|---|---|---|
| Loading | `loading` | Spinner, "Loading report..." |
| Invalid filter | `fieldErrors` non-empty | Messages against the inputs; card says the report was not run |
| Empty | `report.statuses.length === 0` | `0` mark, "No jobs match these filters" |
| Data | otherwise | Table of status/count, total in a `tfoot` |

Plus a fifth the story did not name but the code needs: a **network/5xx banner**, for the
reporting service being unreachable. Without it a failed request would leave the page
spinning forever. It reads differently from the invalid-filter state on purpose — one is
the caller's to fix, the other is not.

**Empty is not an error and not a 404.** The API answers a range nothing falls into with
`200 {"statuses":[],"total":0}`, so the page renders the same kind of block the customer
list uses for "no customers yet". A 404 would have meant the report does not exist; what
happened is that the report ran and the answer was none, and a person reading a chart has
to be able to tell those apart.

`report` is cleared on any failure, so a refused filter cannot leave the previous range's
table on screen next to the new range's dates.

### Statuses render as plain text, not `StatusBadge`

`StatusBadge` is green for `ACTIVE` and grey for everything else — it encodes the
customer/asset lifecycle. Every job status would come out grey, which is a badge that
carries no information while looking like it does.

---

## 6. Invalid filters, straight onto the inputs

The 400 body:

```json
{
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "from": ["from must not be after to."] }
}
```

The API keys its errors `from` and `to`, which are **already the names of the inputs**, so
they render against the matching field with no translation table — `errorsFor(field)` is the
same helper `JobForm` uses, and the `is-invalid` / `invalid-feedback` pairing is the same
Bootstrap idiom.

Two behaviours inherited from the service that the UI does not re-implement:

- **Both bounds are reported at once.** They are parsed before either is judged, so a caller
  who got both wrong is told about both rather than fixing one and being sent back for the
  other.
- **A backwards range is keyed on `from` alone.** It is one fact; keying it against both
  fields would render it as two separate problems.

The page adds **no client-side date validation**. Same call as US-03's "send the blank and
let the server validate": duplicating the rule here would mean two places to change it, and
the two would disagree.

### The one consequence of reading a projection

The counts are of jobs the Reporting Service has **absorbed**, and the date filters apply to
when each job was *raised upstream* — not to when the projection saw it. A job created
seconds ago may not be counted yet if the consumer is behind or the broker was down. The
page sub-heading says so ("Counted from when each job was raised, not from when this report
last updated") because a Manager comparing this screen against the job list otherwise has no
explanation for a discrepancy.

---

## 7. Handover to QA

Verified at the API level against the running service, with two `CREATED` jobs projected:

| Case | Result |
|---|---|
| Default, no filters | `{"statuses":[{"status":"CREATED","count":2}],"total":2}` — 200 |
| `from=1990-01-01&to=1990-12-31` | `{"statuses":[],"total":0}` — 200 |
| `from=2026-08-31&to=2026-08-01` | 400, `errors.from` |
| CORS preflight from `http://localhost:5173` | 204, `Access-Control-Allow-Origin` set |

The preflight matters: the axios instance sets `Content-Type`, so the browser sends an
`OPTIONS` before every GET. `curl` alone would not have caught a policy that failed it.

**Still to confirm in a browser** — these are the rendered states, which were not observed:

1. Default view shows one row, `CREATED` / `2`, and a total of `2`.
2. A range excluding both jobs shows "No jobs match these filters", not an empty table and
   not an error.
3. `from` after `to` shows the message under the **From** input, with the field outlined,
   and the table replaced by "The report was not run".
4. The race guard: throttle the network, press Apply repeatedly with different ranges, and
   confirm the table always matches the dates that produced it.
5. Stop the reporting service and confirm the banner, not a permanent spinner.

---

## 8. Decisions worth carrying forward

- **An optional query parameter is either present with a value or absent from the URL.**
  Never an empty string — the server may read that as "no filter" and answer a wider
  question than the one asked, with a 200 and no sign anything went wrong.
- **Keep "what is typed" separate from "what was run"** on any screen with an Apply button.
  Data on screen must always match the filters that produced it.
- **`react-hooks/set-state-in-effect` does not see through `useCallback`.** Declare the
  async function inside the effect and key the effect on a state object; put the pending
  reset in the event handler.
- **Render the server's total, not a client-side sum** of rows the server chose.
- **An empty result is a state, not an error** — and the API returning 200 rather than 404
  is what makes that renderable.
- **Do not reuse a badge component across lifecycles.** `StatusBadge` encodes ACTIVE /
  INACTIVE; a job status through it is grey and meaningless.
- **Say when data is derived rather than live.** A projection can lag, and the screen should
  admit it before a user finds the discrepancy themselves.

---

## TODO before merge

- [ ] Jira id and branch name for this story
- [ ] Browser confirmation of the five items in §7
- [ ] Decide whether the report belongs behind a Manager role once authentication exists —
      it is a management view, currently reachable by anyone
- [ ] A clear-filters button; today the dates are cleared by emptying both inputs and
      pressing Apply
- [x] Route path — **`/reports/jobs-by-status`**, nav link "Jobs by status"
- [x] `VITE_API_BASE_URL` — **the deployed Azure API Management gateway origin**
      `launchSettings.json`
