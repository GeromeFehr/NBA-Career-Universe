-- Richer press-conference metadata for varied postgame interviews.
alter table interviews add column if not exists reporter_name text;
alter table interviews add column if not exists outlet text;
alter table interviews add column if not exists topic text;
alter table interviews add column if not exists tone text;
alter table interviews add column if not exists context text;
alter table interviews add column if not exists importance int not null default 50
  check (importance between 0 and 100);

create index if not exists interviews_career_status_importance_idx
  on interviews(career_id,status,importance desc,created_at desc);
create index if not exists interviews_career_topic_idx
  on interviews(career_id,topic,created_at desc);
