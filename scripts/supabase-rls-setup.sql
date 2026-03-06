-- =============================================================
-- supabase-rls-setup.sql
-- 在 Supabase SQL Editor 執行此腳本，完成 RLS 設定與驗證。
-- 建議分段執行（各 SECTION 之間有明顯分隔）。
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 1：診斷查詢（先執行這段，確認現況）
-- ─────────────────────────────────────────────────────────────

-- 1-A：確認哪些表格存在、RLS 是否已啟用
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 1-B：列出所有現有 policy
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


-- ─────────────────────────────────────────────────────────────
-- SECTION 2：建立表格（若尚未建立）
-- 若表格已存在此段會報錯，可直接跳過。
-- ─────────────────────────────────────────────────────────────

-- patterns 表（句型資料，唯讀）
CREATE TABLE IF NOT EXISTS public.patterns (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  chapter     INT  NOT NULL,
  title       TEXT NOT NULL,
  data        JSONB NOT NULL,   -- 完整的 JSON 內容
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- progress 表（使用者填空練習記錄）
CREATE TABLE IF NOT EXISTS public.progress (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_code TEXT NOT NULL,
  exercise_id  INT  NOT NULL,
  is_correct   BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- pattern_completion 表（使用者句型完成紀錄）
CREATE TABLE IF NOT EXISTS public.pattern_completion (
  id           SERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_code TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pattern_code)
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 3：啟用 RLS（冪等，重複執行無害）
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.patterns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_completion ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
-- SECTION 4：清除舊 policies（避免重複定義衝突）
-- ─────────────────────────────────────────────────────────────

-- patterns
DROP POLICY IF EXISTS "patterns_public_read"  ON public.patterns;

-- progress
DROP POLICY IF EXISTS "progress_owner_read"   ON public.progress;
DROP POLICY IF EXISTS "progress_owner_insert" ON public.progress;
DROP POLICY IF EXISTS "progress_owner_update" ON public.progress;
DROP POLICY IF EXISTS "progress_owner_delete" ON public.progress;

-- pattern_completion
DROP POLICY IF EXISTS "completion_owner_read"   ON public.pattern_completion;
DROP POLICY IF EXISTS "completion_owner_insert" ON public.pattern_completion;
DROP POLICY IF EXISTS "completion_owner_update" ON public.pattern_completion;
DROP POLICY IF EXISTS "completion_owner_delete" ON public.pattern_completion;


-- ─────────────────────────────────────────────────────────────
-- SECTION 5：建立正確的 Policies
-- ─────────────────────────────────────────────────────────────

-- ── patterns：所有人可讀，任何人（含 anon）不可寫 ────────────
-- SELECT：anon + authenticated 皆可
CREATE POLICY "patterns_public_read"
  ON public.patterns
  FOR SELECT
  TO anon, authenticated
  USING (true);
-- 注意：沒有 INSERT / UPDATE / DELETE policy，
-- 只有 service_role（繞過 RLS）才能寫入。

-- ── progress：只有本人可讀寫 ──────────────────────────────────
CREATE POLICY "progress_owner_read"
  ON public.progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "progress_owner_insert"
  ON public.progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_owner_update"
  ON public.progress
  FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_owner_delete"
  ON public.progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── pattern_completion：只有本人可讀寫 ───────────────────────
CREATE POLICY "completion_owner_read"
  ON public.pattern_completion
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "completion_owner_insert"
  ON public.pattern_completion
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "completion_owner_update"
  ON public.pattern_completion
  FOR UPDATE
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "completion_owner_delete"
  ON public.pattern_completion
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 6：驗證查詢（執行後對照預期結果）
-- ─────────────────────────────────────────────────────────────

-- 6-A：確認 RLS 全部啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('patterns', 'progress', 'pattern_completion')
ORDER BY tablename;
-- 預期：三張表的 rowsecurity 均為 true

-- 6-B：確認 policies 數量正確
SELECT
  tablename,
  COUNT(*) AS policy_count,
  STRING_AGG(cmd, ', ' ORDER BY cmd) AS commands
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('patterns', 'progress', 'pattern_completion')
GROUP BY tablename
ORDER BY tablename;
-- 預期：
--   pattern_completion | 4 | DELETE, INSERT, SELECT, UPDATE
--   patterns           | 1 | SELECT
--   progress           | 4 | DELETE, INSERT, SELECT, UPDATE

-- 6-C：詳細列出所有 policies
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;


-- ─────────────────────────────────────────────────────────────
-- SECTION 7：功能測試（選擇性執行）
-- 以下測試需在 Supabase SQL Editor 手動設定 JWT role 後執行，
-- 或改用 Supabase Dashboard > Table Editor 用 anon key 嘗試。
-- ─────────────────────────────────────────────────────────────

-- 測試 1：anon 可讀 patterns（預期成功）
SET LOCAL role = anon;
SELECT code, title FROM public.patterns LIMIT 3;
RESET role;

-- 測試 2：anon 不可寫 patterns（預期失敗 / 0 rows affected）
SET LOCAL role = anon;
UPDATE public.patterns SET title = 'HACK' WHERE code = '1-1';
RESET role;
-- 若上方 UPDATE 影響 0 rows → ✅ 正確（RLS 阻擋）
-- 若影響 > 0 rows → ❌ 需重新檢查 policy

-- 測試 3：anon 不可讀 progress（預期 0 rows 或 permission denied）
SET LOCAL role = anon;
SELECT * FROM public.progress LIMIT 1;
RESET role;
