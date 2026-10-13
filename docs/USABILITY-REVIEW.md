# SentinelOps AI — usability and product review

Two independent agents reviewed the project: a usability critic and a product
designer. They inspected source, tests, screenshots and the supplied Intercom
references. The critic also exercised the safe sample workflow in the running app.
No production data was changed during their review.

## Feedback addressed

| Finding | Change |
|---|---|
| Main action below analytics | Moved next action and attention list above charts. |
| Sample decision lost on navigation | Shared preview state across dashboard routes and drawers; backend status remains separate. |
| Hardcoded checkout report title | Uses loaded service name and displays incident ID. |
| Unclear snapshot refresh | Added Refresh report for real loaded reports and explained reload behavior. |
| Short-duration chart positions inaccurate | Uses exact milliseconds with count scaling, UTC labels and readable timestamp list. |
| Empty analytics claimed loaded data | Explicit No report loaded state. |
| Empty onboarding promised sample incident | Source-specific final-step wording. |
| Dense raw evidence | Leads with observation summaries; less relevant raw entries collapse initially. |
| No proposal still displayed repair risks | Proposal-specific wording. |
| Short-screen sidebar and long buttons | Scrollable desktop navigation and wrapping action buttons. |

## Validation boundaries

Automated checks cover sample onboarding, search, navigation, evidence, decision
preview, exports, preference persistence, session denial, accessibility, dialogs,
hydration and responsive widths. The critic's sample smoke check found no runtime
errors or desktop horizontal overflow.

Live Google/email account completion, remote owner-policy enforcement, successful
real report loading and live model remediation require separate account/backend
validation. They are not established by the isolated browser suite. The existing
backend integration tests verify approval-gated recovery using a deterministic
model stand-in; this review did not rerun those tests or execute a live repair.

Use USER-MANUAL.md for the evaluator acceptance tour and record Pass, Fail or
Not tested per feature. The remaining product limits are explicit there.

After the final review fixes, the production test build and all 15 workspace
browser tests passed on desktop, tablet and mobile. This includes sample decision
persistence across navigation, hydration, dialog keyboard behavior and accessibility.
TypeScript and formatting checks passed. The preceding full suite passed 32 tests
with four intentional duplicate viewport skips before the final report/summary polish.
