-- v3.1 strict language separation for generated trade/award content
alter table trade_offers add column if not exists language text not null default 'de'
  check(language in ('de','en'));
alter table trade_interest add column if not exists language text not null default 'de'
  check(language in ('de','en'));
alter table award_snapshots add column if not exists language text not null default 'de'
  check(language in ('de','en'));

alter table trade_interest drop constraint if exists trade_interest_career_id_team_id_key;
create unique index if not exists trade_interest_lang_unique
  on trade_interest(career_id,team_id,language);
