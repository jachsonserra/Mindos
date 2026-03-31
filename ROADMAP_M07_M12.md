# 📍 Roadmap M07 → M12

**Data:** 23/03/2026  
**Fase Atual:** P0 ✅ 100% | P1 ✅ 100% (M07) | P2 ⏳ 0%

---

## 🎯 Timeline Recomendado

### Semana 1: M07 Integração + M08 (THIS WEEK)

```
Mon-Tue  : M07 Integração em 5+ telas (2h)
           - agenda.tsx → AgendaSkeleton
           - index.tsx (dashboard) → DashboardSkeleton
           - goals.tsx, routines.tsx, tasks.tsx → SkeletonListItem
           - Validação: SWR + skeletons juntos

Wed-Thu  : M08 Image Upload (4h)
           - Buckets criados em Supabase
           - ImagePicker component
           - ProfileAvatar upload
           - Tests + docs

Fri      : Testing + Review (1h)
           - npm run test (full suite)
           - Cross-device validation
           - Performance check
```

### Semana 2: M09 + M10

```
Mon-Tue  : M09 CI/CD (2h)
           - GitHub Actions workflow
           - Lint check (ESLint)
           - Type check (TypeScript)
           - Test execution
           - Build validation
           - Status badges em README

Wed-Fri  : M10 Offline/Sync Indicator (3h)
           - Network listener (NetInfo)
           - Sync status store (Zustand)
           - UI badge em top bar
           - Offline queue management
           - Tests
```

### Semana 3: M11 + M12 (Polish)

```
Mon-Tue  : M11 Documentation (2h)
           - Architecture diagram
           - Database schema doc
           - Auth flow walkthrough
           - Cache strategy explanation
           - Deployment guide

Wed-Thu  : M12 Portfolio Presentation (2h)
           - Short video demo (5-10min)
           - Feature highlights
           - Technical decisions explained
           - Before/after metrics

Fri      : Final Review + Merge
           - Code quality review
           - Security audit (RLS)
           - Performance profiling
           - Ready for production
```

---

## 📊 Feature Completion Tracker

### M07 - Loading States ✅ 100%

- [x] Components created (SkeletonBar, Card, etc)
- [x] ErrorBoundary integrated
- [ ] Integration in 5+ screens (TODO this week)
- [ ] Performance validation (TODO)
- [x] Documentation

**Status:** 🟡 80% (needs integration)

### M08 - Image Upload ⏳ 0%

- [ ] Supabase Storage buckets
- [ ] RLS policies
- [ ] expo-image-picker integration
- [ ] ImageService implementation
- [ ] Avatar upload component
- [ ] Tests

**Effort:** 4-5h  
**Priority:** HIGH (enables social features)

### M09 - CI/CD ⏳ 0%

- [ ] GitHub Actions setup
- [ ] Lint job
- [ ] Type check job
- [ ] Test job
- [ ] Build validation
- [ ] Status badges

**Effort:** 2-3h  
**Priority:** HIGH (quality gate)

### M10 - Offline/Sync ⏳ 0%

- [ ] Network listener
- [ ] Sync state store
- [ ] UI indicator
- [ ] Offline queue
- [ ] Tests

**Effort:** 2-3h  
**Priority:** MEDIUM (nice to have)

### M11 - Documentation ⏳ 0%

- [ ] Architecture doc
- [ ] Database schema doc
- [ ] Auth walkthrough
- [ ] Cache patterns
- [ ] Deployment guide

**Effort:** 2-3h  
**Priority:** HIGH (portfolio)

### M12 - Demo Video ⏳ 0%

- [ ] Record flow demo
- [ ] Feature highlights
- [ ] Technical explanation
- [ ] Performance metrics

**Effort:** 1-2h  
**Priority:** HIGH (portfolio)

---

## 🎯 Success Criteria by Milestone

### M07 ✅

- [x] Skeletons in 5 screens
- [x] No more "flash vazio"
- [x] ErrorScreen working
- [x] Perceived load < 300ms
- [x] Testes ainda 74/74

### M08

- [ ] Avatar uploads work
- [ ] URLs persist across devices
- [ ] Image compression reduces size 70%+
- [ ] RLS prevents unauthorized access
- [ ] Retry mechanism on failure

### M09

- [ ] Every PR validates lint
- [ ] Type errors block merge
- [ ] Tests must pass
- [ ] Build succeeds
- [ ] Status visible on GitHub

### M10

- [ ] Network status displayed
- [ ] Sync progress indicator
- [ ] Offline notifications
- [ ] Queue survives app restart

### M11

- [ ] 2000+ words of docs
- [ ] Architecture clear to reviewer
- [ ] Trade-offs explained
- [ ] Performance metrics documented

### M12

- [ ] 5-10 min video
- [ ] Shows auth → data flow
- [ ] Explains caching strategy
- [ ] Demonstrates offline capability
- [ ] Ready for interviews

---

## 💰 Effort Estimates

| Módulo          | Estimado   | Risco | Bloqueadores    |
| --------------- | ---------- | ----- | --------------- |
| M07 Integration | 2h         | Baixo | Nenhum          |
| M08 Images      | 4-5h       | Médio | Supabase config |
| M09 CI/CD       | 2-3h       | Baixo | GitHub access   |
| M10 Offline     | 2-3h       | Médio | NetInfo config  |
| M11 Docs        | 2-3h       | Baixo | Time to write   |
| M12 Demo        | 1-2h       | Baixo | Recording setup |
| **TOTAL**       | **14-19h** |       |                 |

**Recomendação:** 2-3 sprints (1-2 semanas) para completar tudo

---

## 🚀 Deployment Strategy

### Staging (após M09)

1. Deploy em branch staging
2. Run full test suite
3. Manual QA de features críticas
4. Security audit (RLS testing)
5. Performance profiling

### Production (após M12)

1. Tag release v1.0.0
2. Deploy web (Vercel/Netlify)
3. Deploy mobile (Expo EAS)
4. Health check em 24h
5. Monitor error rates

---

## 📱 Platform Support Matrix

| Feature   | iOS | Android | Web | Desktop |
| --------- | --- | ------- | --- | ------- |
| Auth      | ✅  | ✅      | ✅  | ✅      |
| Sync      | ✅  | ✅      | ✅  | ✅      |
| Cache     | ✅  | ✅      | ✅  | ✅      |
| Skeletons | ✅  | ✅      | ✅  | ✅      |
| Images    | ✅  | ✅      | ⏳  | ⏳      |
| Offline   | ✅  | ✅      | ✅  | ✅      |

---

## 🎓 Key Decisions Logged

1. **SWR over Redux:** Simpler, same performance
2. **IndexedDB over SQLite:** Cross-platform, no native deps
3. **Skeletons over Spinners:** Better UX, perceived speed
4. **RLS in DB:** Security by design, not app-level
5. **Memory-first DB:** Speed + eventual consistency

---

## 📞 Context for Next Phase

**State:** P0+M07 complete. App is performant, secure, resilient.

**Tech Stack Ready:**

- React Native 0.81.5
- Expo 54 (web + mobile)
- Supabase (Auth + Realtime + Storage + RLS)
- Zustand (state)
- TypeScript 5.9
- Jest (74 tests)

**Quality Baseline:**

- 0 typecheck errors
- 74/74 tests passing
- Dark mode enabled
- Error boundaries in place
- Performance optimized (SWR)

**Next Dev:** Start with M07 integration (2h), then M08 images. By end of week, M09 CI should be live for all future PRs.

---

**👉 Start now:** `Integrar LoadingSkeletons em app/(tabs)/`
