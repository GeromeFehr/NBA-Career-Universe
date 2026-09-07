-- v2.2: per-universe language preference
alter table universes
  add column if not exists language text not null default 'de'
  check (language in ('de','en'));

update universes set language='de' where language is null;
