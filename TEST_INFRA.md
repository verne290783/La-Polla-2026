# E2E Test Infra: Flag Replacement Project

## Test Philosophy
- Opaque-box and structural-integrity driven. We ensure complete removal of native country flag emojis from key dashboard tabs and correct adoption of the `TeamFlag` component.
- Methodology: Category-Partition, Boundary Value Analysis, and Integration Verification via build/lint tests.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 (Feature Coverage) | Tier 2 (Boundary & Corner) | Tier 3 (Cross-Feature) |
|---|---------|---------------------|:------------------------:|:--------------------------:|:---------------------:|
| 1 | FixtureTab Flag Replacement | USER_REQUEST §3.1   | 6 cases                  | 2 cases                    | 1 case                |
| 2 | HomeTab Flag Replacement    | USER_REQUEST §3.1   | 5 cases                  | 2 cases                    | 1 case                |
| 3 | ProfileTab Flag Replacement | USER_REQUEST §3.1   | 5 cases                  | 2 cases                    | 1 case                |
| 4 | Flag Mappings & Fallback    | USER_REQUEST §3.2   | 5 cases                  | 3 cases                    | 1 case                |
| 5 | Build & Lint Integration    | USER_REQUEST §3.3   | 2 cases                  | 1 case                    | 1 case                |

---

## Test Architecture
- **Test Runner Location**: `scripts/run-e2e-tests.ts`
- **Invocation**: `npx tsx scripts/run-e2e-tests.ts`
- **Pass/Fail Semantics**: The script exits with status `0` if all test cases pass. If any test case fails, it outputs detailed error messages and exits with status `1`.
- **Directory Layout**:
  ```
  scripts/
  └── run-e2e-tests.ts    # Test runner script containing test cases and runner logic
  ```

---

## Detailed Test Case Inventory

### Tier 1 - Feature Coverage (Happy-Path)
- **FixtureTab Feature**:
  - `TEST_1.1`: Verify `TeamFlag` component is imported in `FixtureTab.tsx`.
  - `TEST_1.2`: Verify that no direct JSX renders exist for `{teamsFlags[...]}` in native `<span>` without `<TeamFlag>`.
  - `TEST_1.3`: Verify that no direct JSX renders exist for `.flag_emoji` inside `FixtureTab.tsx`.
  - `TEST_1.4`: Verify `TeamFlag` is used for group stage matches (home and away).
  - `TEST_1.5`: Verify `TeamFlag` is used in standings table and best thirds table.
  - `TEST_1.6`: Verify `TeamFlag` is used in podium summary (Champion, Runner-up, Third).
- **HomeTab Feature**:
  - `TEST_2.1`: Verify `TeamFlag` component is imported in `HomeTab.tsx`.
  - `TEST_2.2`: Verify no direct JSX rendering of `teamsFlags[...]` or `.flag_emoji` exists in `HomeTab.tsx`.
  - `TEST_2.3`: Verify `TeamFlag` is rendered for the home team in the matches list.
  - `TEST_2.4`: Verify `TeamFlag` is rendered for the away team in the matches list.
  - `TEST_2.5`: Verify `TeamFlag` receives `teamId` prop correctly in HomeTab.
- **ProfileTab Feature**:
  - `TEST_3.1`: Verify `TeamFlag` component is imported in `ProfileTab.tsx`.
  - `TEST_3.2`: Verify no direct rendering of `.flag_emoji` exists in `ProfileTab.tsx`.
  - `TEST_3.3`: Verify `TeamFlag` is rendered for the Champion prediction.
  - `TEST_3.4`: Verify `TeamFlag` is rendered for the Runner-up prediction.
  - `TEST_3.5`: Verify `TeamFlag` is rendered for the Third Place prediction.
- **Flag Mappings & Fallback**:
  - `TEST_4.1`: Verify all 48 seeded team IDs (e.g. `MEX`, `RSA`, `ARG`, `BRA`) are present in `FLAG_MAP` in `TeamFlag.tsx`.
  - `TEST_4.2`: Verify that `TeamFlag` uses FlagCDN URL format pointing to `https://flagcdn.com/...` for valid team IDs.
  - `TEST_4.3`: Verify that `TeamFlag` renders fallback emoji span when `teamId` is not provided.
  - `TEST_4.4`: Verify that `TeamFlag` renders fallback emoji span when `teamId` is not in the `FLAG_MAP`.
  - `TEST_4.5`: Verify custom `fallbackEmoji` prop works.
- **Build & Lint**:
  - `TEST_5.1`: Run ESLint using `npm run lint` and verify it finishes with no errors.
  - `TEST_5.2`: Run TS compiler/Next build using `npm run build` and verify it finishes with no errors.

### Tier 2 - Boundary & Corner Cases
- **Boundary/Corner Checks**:
  - `TEST_BC_1`: Verify how empty `teamId=""` is handled by `TeamFlag` (should return fallback emoji).
  - `TEST_BC_2`: Verify how lowercase `teamId` values (e.g., `mex` instead of `MEX`) are handled by `TeamFlag` (should look up case-insensitively or fall back safely).
  - `TEST_BC_3`: Verify that `TeamFlag` className prop correctly overrides or appends to default styling.

### Tier 3 - Cross-Feature Combinations
- `TEST_CF_1`: Verify that all target tabs (`FixtureTab`, `HomeTab`, `ProfileTab`) compile correctly under TypeScript while importing `TeamFlag` and passing the required props.

### Tier 4 - Real-World Application Scenarios
- `TEST_RW_1`: End-to-end production build verification. We trigger `npm run build` to ensure the final bundle includes all imports, correct assets, and compiles with zero failures.

---

## Coverage Thresholds
- **Tier 1**: 100% of the specified 23 happy-path tests must pass.
- **Tier 2**: 100% of the boundary cases must pass.
- **Tier 3**: 100% of the cross-feature component interactions must compile.
- **Tier 4**: Next.js production build must compile successfully with zero errors.
