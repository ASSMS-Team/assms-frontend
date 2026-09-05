# ASSMS Sprint 2 Wireframes

This folder is the agreed repository location for the ASSMS-28 wireframe deliverable. `index.html` is an interactive, browser-based prototype with sample data and no API calls.

## Review the prototype

Open `index.html` directly in a browser. Use the sidebar and buttons to inspect:

1. Technician list and filters.
2. Technician create form and inline required-field validation.
3. Technician detail, current assignments, and blocked-deactivation feedback.
4. Dispatcher job board with status and assigned-technician filters.
5. Successful automatic-assignment feedback and selection audit.
6. Jobs-by-technician report with UTC date boundaries and region.
7. Loading, empty, service-error, and invalid-filter reference states via **Review states**.

## Design direction

The interface uses a field-service operations direction: dense enough for daily dispatch work, calm neutral surfaces, a dark evergreen navigation rail, and lime reserved for live/positive operational signals. Sprint 1 customer, asset, job-create, and jobs-by-status pages should inherit the same shell and tokens during React implementation.

The new shell replaces the current flat top navigation with grouped navigation, persistent role/environment context, a wider working area, clearer filters, visible workload cues, and page-level status feedback. The prototype is responsive and retains visible keyboard focus.

## Contract mapping

| Wireframe | Jira source | Required information and states |
| --- | --- | --- |
| Technician form | ASSMS-21 / US-05A | Unique name/reference, valid region, one or more skills, active status, optional phone/email, identity-boundary note, validation messages |
| Technician list/detail | ASSMS-81 / US-05B | Name/reference, region, skills, active state, loading, empty, service-error, and not-found guidance |
| Technician edit/deactivate | ASSMS-82 and ASSMS-83 | Existing fields remain editable; deactivation is blocked when open jobs exist and explains the required recovery action |
| Job board | ASSMS-23 / US-07 | Reference, status, priority, current assignment, exact status and assigned-technician filters, AND behavior, empty/invalid-filter guidance |
| Assignment feedback | ASSMS-22 and ASSMS-84 | Matching skill/region, no-candidate attention state, selected technician, lowest workload and tie-rule audit, durable-event status |
| Jobs-by-technician report | ASSMS-24 / US-08 | Grouped counts, total, optional UTC `from` inclusive and `to` exclusive, exact region, AND behavior, freshness, empty total `0` guidance |

## React implementation notes

- Implement the shell once in `src/components/layout/AppLayout.tsx` and expose navigation items by authenticated role.
- Move the visual values into reusable CSS custom properties; avoid page-specific copies of the palette and spacing.
- Keep filters in the URL query string so refresh, back navigation, and shared links preserve the current view.
- Render backend validation against the named control. Use a page banner only for service or unexpected errors.
- Keep assignment feedback derived from server state. The UI must not calculate or claim a technician selection itself.
- Use actual API enums for status, region, priority, and skill options when contracts are finalized.
- Preserve Sprint 1 routes and behavior while applying the upgraded shell and components.

## BA and QA review checklist

- [ ] Every required technician field and optional contact field is correctly labelled.
- [ ] At least one skill and a valid region are visibly required.
- [ ] The list exposes name/reference, region, skills, workload, and active state.
- [ ] Deactivation with open jobs gives a clear blocked state and recovery instruction.
- [ ] Job status and assigned-technician filters are exact and combine with AND behavior.
- [ ] No-candidate jobs remain visible and clearly require dispatcher attention.
- [ ] Assignment feedback explains why the technician was selected without exposing internal database details.
- [ ] Report `from` is UTC inclusive; `to` is UTC exclusive; region is an exact normalized match.
- [ ] Loading, empty, invalid, not-found, and service-error states are agreed.
- [ ] Desktop and mobile layout order remains usable.

Once BA and QA approve this checklist, attach the repository path and approval evidence to ASSMS-28 before moving the task to Done.
