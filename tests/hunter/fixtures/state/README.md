# Hunter state fixtures

All committed fixtures use generic, non-user-specific data. Their ownership is
kept with the test that exercises them:

| Category | Files | Owning test |
| --- | --- | --- |
| Valid state | `valid/*.yaml` | `tests/hunter/state/schema.test.mjs`, `tests/hunter/state/semantics.test.mjs`, `tests/hunter/state/repair.test.mjs` |
| Invalid state | `invalid/*.yaml` | `tests/hunter/state/semantics.test.mjs`; `dangling-pursuit.yaml` is also used by `tests/hunter/state/repair.test.mjs` |
| Repair input | `repair/*.yaml` | `tests/hunter/state/repair.test.mjs`, `tests/hunter/state/cli.test.mjs` |
| Merge copies | `merge/*.yaml` | `tests/hunter/state/merge.test.mjs` |
| State transitions | `transition/*.yaml` | `tests/hunter/state/transition.test.mjs` |
| Generated scale matrix | created by `helpers/make-state-fixture.mjs` | `tests/hunter/state/fixture-matrix.test.mjs` |

`makeStateFixture(counts)` derives all values from integer indexes. Omitted
collection counts are zero; existing owners are selected round-robin by index.
Pursuits need both a profile and an opportunity under the state contract, so a
request for pursuits with either parent count at zero throws instead of
silently changing the requested counts.
