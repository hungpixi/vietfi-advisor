# Morning Brief Editorial Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Morning Brief summary and takeaway copy significantly easier to read in Vietnamese by replacing poster-style typography with editorial typography.

**Architecture:** Keep the existing Morning Brief layout and data flow unchanged. Only adjust the typography classes inside `BriefCard` in `src/app/dashboard/page.tsx`, and verify the behavior with focused component-level tests in `src/app/dashboard/page.test.tsx` so the change is locked to the intended rendering.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, Tailwind utility classes, Framer Motion.

---

## Implementation Notes

- Work in a dedicated git worktree before starting implementation.
- Do not change API payloads, fetch logic, card structure, or global typography.
- Keep the change scoped to Morning Brief presentation only.
- Follow TDD: write/adjust the failing test first, make it pass with the smallest class changes, then run focused verification.
- Commit after the task is complete.

## File Structure

### Files To Modify

- `src/app/dashboard/page.tsx`
  Update the `BriefCard` typography classes for summary text, takeaway asset labels, and takeaway body text.
- `src/app/dashboard/page.test.tsx`
  Add a focused render test that asserts the new readable class combinations appear in Morning Brief content.

### Existing Files To Read Before Coding

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/page.test.tsx`
- `docs/superpowers/specs/2026-04-16-morning-brief-editorial-design.md`

## Test Strategy

- Add a focused dashboard test that waits for Morning Brief content and asserts the new typography classes are present.
- Run the focused dashboard Vitest file first.
- Run full `npm run test:run` only after the targeted change passes if broader verification is desired.

## Task 1: Update Morning Brief typography to editorial styling

**Files:**
- Modify: `src/app/dashboard/page.tsx:217-236`
- Test: `src/app/dashboard/page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test to `src/app/dashboard/page.test.tsx` after the existing tests:

```ts
  it('renders Morning Brief with editorial typography classes', async () => {
    mockFetchData
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(successJson),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          date: 'Hôm nay, 16/04/2026',
          title: 'Morning Brief AI',
          summary: 'Thị trường đang phản ứng thận trọng sau nhịp tăng mạnh đầu tuần.',
          takeaways: [
            {
              emoji: '📈',
              asset: 'VN-Index',
              text: 'Dòng tiền đang phân hóa và ưu tiên nhóm vốn hóa lớn.',
            },
          ],
        }),
      } as unknown as Response);

    await act(async () => {
      render(<DashboardOverview />);
    });

    const summary = await screen.findByText(
      'Thị trường đang phản ứng thận trọng sau nhịp tăng mạnh đầu tuần.'
    );
    const asset = await screen.findByText('VN-Index');
    const takeaway = await screen.findByText(
      'Dòng tiền đang phân hóa và ưu tiên nhóm vốn hóa lớn.'
    );

    expect(summary.className).toContain('text-lg');
    expect(summary.className).toContain('font-medium');
    expect(summary.className).toContain('leading-relaxed');
    expect(summary.className).not.toContain('uppercase');
    expect(summary.className).not.toContain('tracking-tight');

    expect(asset.className).toContain('font-semibold');
    expect(asset.className).not.toContain('font-mono');
    expect(asset.className).toContain('uppercase');

    expect(takeaway.className).toContain('font-medium');
    expect(takeaway.className).toContain('leading-relaxed');
    expect(takeaway.className).not.toContain('uppercase');
    expect(takeaway.className).not.toContain('tracking-tight');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test:run -- src/app/dashboard/page.test.tsx
```

Expected: FAIL because the current `BriefCard` still uses `font-black`, `uppercase`, `tracking-tight`, and `font-mono` in the Morning Brief text.

- [ ] **Step 3: Write the minimal implementation**

Update the relevant JSX in `src/app/dashboard/page.tsx` to this:

```tsx
        <p className="text-lg text-white/90 leading-relaxed mb-10 font-medium w-full">
          {brief.summary}
        </p>
```

```tsx
                <span className="text-sm font-semibold uppercase tracking-[0.12em] text-[#E6B84F]">
                  {t.asset}
                </span>
```

```tsx
                <p className="text-[16px] text-white/75 leading-relaxed font-medium">
                  {t.text}
                </p>
```

These replacements must remove the old combinations below:

```tsx
className="text-[16px] text-white/80 leading-relaxed mb-10 font-black uppercase tracking-tight w-full opacity-90"
```

```tsx
className="text-[16px] font-mono uppercase tracking-widest text-[#E6B84F] font-black"
```

```tsx
className="text-[16px] text-white/60 leading-relaxed font-black uppercase tracking-tight"
```

- [ ] **Step 4: Run the test again to verify it passes**

Run:

```bash
npm run test:run -- src/app/dashboard/page.test.tsx
```

Expected: PASS with the new Morning Brief typography assertions green.

- [ ] **Step 5: Run one broader verification pass**

Run:

```bash
npm run lint src/app/dashboard/page.tsx src/app/dashboard/page.test.tsx
```

Expected: PASS with no lint issues in the changed dashboard files.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/dashboard/page.tsx src/app/dashboard/page.test.tsx docs/superpowers/specs/2026-04-16-morning-brief-editorial-design.md docs/superpowers/plans/2026-04-16-morning-brief-editorial.md
git commit -m "fix: improve morning brief readability"
```

Expected: A new commit containing the editorial Morning Brief typography update, the design doc, and this plan.
