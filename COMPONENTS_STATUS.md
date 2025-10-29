# Components Status Documentation

## 🟢 Active Components (Do Not Remove)

### Core Rendering Components
- **`MermaidDiagram.tsx`** - Renders Mermaid diagrams with error handling
- **`MermaidErrorBoundary.tsx`** - Error boundary for Mermaid rendering failures
- **`TwoPhaseRenderer.tsx`** - Two-phase rendering strategy for educational materials
- **`RichMaterialRenderer.tsx`** - Main markdown material renderer (current standard)
- **`MarkdownReferencesRenderer.tsx`** - Renders academic references section

### Lecture Transcription Components
- **`FormattedTranscriptViewer.tsx`** - Display formatted lecture transcripts
- **`LiveTranscriptViewer.tsx`** - Real-time lecture transcription display

### Material Generation Components
- **`MaterialGenerationModal.tsx`** - UI for generating educational materials
- **`MaterialGenerationProgress.tsx`** - Progress tracking for generation jobs

---

## 🟡 Legacy Components (Keep for Backward Compatibility)

### Deprecated but Required
- **`StructuredContentRenderer.tsx`** - Old JSON format renderer
  - **Why kept**: Used by TeacherAnnotationPage for old annotations
  - **Migration status**: All new content uses markdown
  - **DO NOT REMOVE**: Required for existing content

- **`HTMLContentRenderer.tsx`** - Old HTML material renderer
  - **Why kept**: Some old lectures stored as raw HTML
  - **Migration status**: All new content uses markdown
  - **DO NOT REMOVE**: Required for backward compatibility

---

## 🔵 Edge Functions Status

### Active Functions
- ✅ **`fix-mermaid-diagram`** - AI-powered Mermaid syntax fixing (NOW INTEGRATED in Phase 1)
- ✅ **`format-lecture-content`** - Post-processing validation and formatting
- ✅ **`generate-lecture-material`** - Main material generation with research
- ✅ **`teacher-job-runner`** - Background job orchestration
- ✅ **`process-lecture-transcript`** - Transcript processing pipeline

### Function Configuration
All edge functions are configured in `supabase/config.toml`:
```toml
[functions.fix-mermaid-diagram]
verify_jwt = false

[functions.format-lecture-content]
verify_jwt = false

[functions.generate-lecture-material]
verify_jwt = true
```

---

## 📊 Material Generation Workflow

### Current Flow (Post Phase 1-4 Implementation)
```
1. User triggers generation
   ↓
2. generate-lecture-material (Brave Search → AI generation)
   ↓
3. cleanMermaidBlocks (basic fixes)
   ↓
4. validateMermaidDiagrams (syntax check)
   ↓
5. IF invalid → fixMermaidBlocksWithAI (AI-powered fixing) ← NEW
   ↓
6. validateReferences (academic quality check)
   ↓
7. Save to database
   ↓
8. format-lecture-content (post-processing)
```

### Legacy Flow (Pre Phase 1)
```
1. User triggers generation
   ↓
2. generate-lecture-material
   ↓
3. Basic validation only (regex checks)
   ↓
4. Save to database (with potential errors)
```

---

## 🧪 Testing Status

### Integration Tests Added (Phase 4)
- ✅ AI agent invocation logging in `generate-lecture-material`
- ✅ Success rate tracking in `mermaid-fix-service`
- ✅ Edge function call monitoring in deep-search workflow

### Test Coverage
- Mermaid rendering: Monitor via console logs
- AI fix success rate: Track in edge function logs
- Reference validation: Check database flags

---

## 📝 Maintenance Notes

### When to Update This Document
- New components added/removed
- Edge functions created/deprecated
- Workflow changes
- Migration progress updates

### Migration Strategy
1. **Never remove** legacy components until:
   - All old content migrated to new format
   - Database cleanup confirmed
   - User-facing features work without legacy code

2. **Always test backward compatibility** when:
   - Modifying rendering pipeline
   - Updating validation logic
   - Changing database schema

---

**Last Updated**: Phase 1-4 Implementation
**Status**: All critical workflows now use AI-powered Mermaid fixing
