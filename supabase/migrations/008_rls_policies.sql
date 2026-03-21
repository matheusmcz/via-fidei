-- ============================================
-- Helper: verifica se o usuario atual eh admin
-- ============================================
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer stable;

-- Helper: verifica se o usuario atual eh editor vinculado a uma igreja
create or replace function is_editor_of(target_church_id uuid)
returns boolean as $$
  select exists (
    select 1 from editor_churches ec
    join profiles p on p.id = ec.editor_id
    where ec.editor_id = auth.uid()
      and ec.church_id = target_church_id
      and p.is_active = true
      and p.role = 'editor'
  );
$$ language sql security definer stable;

-- ============================================
-- RLS: profiles
-- ============================================
create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin"
  on profiles for select
  to authenticated
  using (is_admin());

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_update_admin"
  on profiles for update
  to authenticated
  using (is_admin());

create policy "profiles_insert_admin"
  on profiles for insert
  to authenticated
  with check (is_admin());

create policy "profiles_delete_admin"
  on profiles for delete
  to authenticated
  using (is_admin());

-- ============================================
-- RLS: editor_churches
-- ============================================
create policy "editor_churches_select_admin"
  on editor_churches for select
  to authenticated
  using (is_admin());

create policy "editor_churches_select_own"
  on editor_churches for select
  to authenticated
  using (editor_id = auth.uid());

create policy "editor_churches_insert_admin"
  on editor_churches for insert
  to authenticated
  with check (is_admin());

create policy "editor_churches_delete_admin"
  on editor_churches for delete
  to authenticated
  using (is_admin());

-- ============================================
-- RLS: churches
-- ============================================
create policy "churches_select_public"
  on churches for select
  to anon, authenticated
  using (true);

create policy "churches_insert_admin"
  on churches for insert
  to authenticated
  with check (is_admin());

create policy "churches_update_admin"
  on churches for update
  to authenticated
  using (is_admin());

create policy "churches_update_editor"
  on churches for update
  to authenticated
  using (is_editor_of(id));

create policy "churches_delete_admin"
  on churches for delete
  to authenticated
  using (is_admin());

-- ============================================
-- RLS: schedule_events
-- ============================================
create policy "schedule_events_select_public"
  on schedule_events for select
  to anon, authenticated
  using (true);

create policy "schedule_events_insert_admin"
  on schedule_events for insert
  to authenticated
  with check (is_admin());

create policy "schedule_events_insert_editor"
  on schedule_events for insert
  to authenticated
  with check (is_editor_of(church_id));

create policy "schedule_events_update_admin"
  on schedule_events for update
  to authenticated
  using (is_admin());

create policy "schedule_events_update_editor"
  on schedule_events for update
  to authenticated
  using (is_editor_of(church_id));

create policy "schedule_events_delete_admin"
  on schedule_events for delete
  to authenticated
  using (is_admin());

create policy "schedule_events_delete_editor"
  on schedule_events for delete
  to authenticated
  using (is_editor_of(church_id));

-- ============================================
-- RLS: activities
-- ============================================
create policy "activities_select_public"
  on activities for select
  to anon, authenticated
  using (true);

create policy "activities_insert_admin"
  on activities for insert
  to authenticated
  with check (is_admin());

create policy "activities_insert_editor"
  on activities for insert
  to authenticated
  with check (is_editor_of(church_id));

create policy "activities_update_admin"
  on activities for update
  to authenticated
  using (is_admin());

create policy "activities_update_editor"
  on activities for update
  to authenticated
  using (is_editor_of(church_id));

create policy "activities_delete_admin"
  on activities for delete
  to authenticated
  using (is_admin());

create policy "activities_delete_editor"
  on activities for delete
  to authenticated
  using (is_editor_of(church_id));

-- ============================================
-- RLS: activity_schedules
-- ============================================
create policy "activity_schedules_select_public"
  on activity_schedules for select
  to anon, authenticated
  using (true);

create policy "activity_schedules_insert_admin"
  on activity_schedules for insert
  to authenticated
  with check (
    is_admin() or exists (
      select 1 from activities a
      where a.id = activity_id and is_editor_of(a.church_id)
    )
  );

create policy "activity_schedules_update_admin"
  on activity_schedules for update
  to authenticated
  using (
    is_admin() or exists (
      select 1 from activities a
      where a.id = activity_id and is_editor_of(a.church_id)
    )
  );

create policy "activity_schedules_delete_admin"
  on activity_schedules for delete
  to authenticated
  using (
    is_admin() or exists (
      select 1 from activities a
      where a.id = activity_id and is_editor_of(a.church_id)
    )
  );

-- ============================================
-- RLS: clergy
-- ============================================
create policy "clergy_select_public"
  on clergy for select
  to anon, authenticated
  using (true);

create policy "clergy_insert_admin"
  on clergy for insert
  to authenticated
  with check (is_admin());

create policy "clergy_update_admin"
  on clergy for update
  to authenticated
  using (is_admin());

create policy "clergy_delete_admin"
  on clergy for delete
  to authenticated
  using (is_admin());

-- ============================================
-- RLS: church_clergy
-- ============================================
create policy "church_clergy_select_public"
  on church_clergy for select
  to anon, authenticated
  using (true);

create policy "church_clergy_insert_admin"
  on church_clergy for insert
  to authenticated
  with check (is_admin());

create policy "church_clergy_insert_editor"
  on church_clergy for insert
  to authenticated
  with check (is_editor_of(church_id));

create policy "church_clergy_update_admin"
  on church_clergy for update
  to authenticated
  using (is_admin());

create policy "church_clergy_update_editor"
  on church_clergy for update
  to authenticated
  using (is_editor_of(church_id));

create policy "church_clergy_delete_admin"
  on church_clergy for delete
  to authenticated
  using (is_admin());

create policy "church_clergy_delete_editor"
  on church_clergy for delete
  to authenticated
  using (is_editor_of(church_id));

-- ============================================
-- RLS: ministries
-- ============================================
create policy "ministries_select_public"
  on ministries for select
  to anon, authenticated
  using (true);

create policy "ministries_insert_admin"
  on ministries for insert
  to authenticated
  with check (is_admin());

create policy "ministries_update_admin"
  on ministries for update
  to authenticated
  using (is_admin());

create policy "ministries_delete_admin"
  on ministries for delete
  to authenticated
  using (is_admin());

-- ============================================
-- RLS: church_ministries
-- ============================================
create policy "church_ministries_select_public"
  on church_ministries for select
  to anon, authenticated
  using (true);

create policy "church_ministries_insert_admin"
  on church_ministries for insert
  to authenticated
  with check (is_admin());

create policy "church_ministries_insert_editor"
  on church_ministries for insert
  to authenticated
  with check (is_editor_of(church_id));

create policy "church_ministries_update_admin"
  on church_ministries for update
  to authenticated
  using (is_admin());

create policy "church_ministries_update_editor"
  on church_ministries for update
  to authenticated
  using (is_editor_of(church_id));

create policy "church_ministries_delete_admin"
  on church_ministries for delete
  to authenticated
  using (is_admin());

create policy "church_ministries_delete_editor"
  on church_ministries for delete
  to authenticated
  using (is_editor_of(church_id));
