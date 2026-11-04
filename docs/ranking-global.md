# Ranking global (opcional)

Por defecto los rankings del **Reto de Ritmo** se guardan solo en el navegador de cada persona.
Para un ranking compartido entre todos los fans, sin cuentas, puedes usar Supabase (plan gratuito).

## 1. Crea la tabla

En Supabase → SQL Editor:

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  handle text not null check (handle ~ '^[A-Za-z0-9._]{2,30}$'),
  network text not null check (network in ('x','instagram','tiktok','weverse','youtube')),
  song_id text not null check (char_length(song_id) <= 60),
  album_id text not null check (char_length(album_id) <= 60),
  score integer not null check (score between 0 and 200000),
  accuracy integer not null check (accuracy between 0 and 100),
  max_combo integer not null check (max_combo between 0 and 2000),
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- Cualquiera puede leer y añadir puntuaciones, nadie puede editarlas ni borrarlas.
create policy "leer" on public.scores for select using (true);
create policy "insertar" on public.scores for insert with check (true);

create index scores_song_score on public.scores (song_id, score desc);
```

## 2. Configura la app

En `src/config.js` rellena `supabaseUrl` y `supabaseAnonKey` (Project Settings → API → *anon public*).
La clave *anon* es pública por diseño; **nunca** pongas la clave *service_role*.

## Límites honestos

- Los nicknames **no se verifican**: cualquiera puede escribir cualquier nombre. La app lo indica en pantalla.
- Las puntuaciones se calculan en el navegador, así que alguien con conocimientos podría enviar valores falsos.
  Los `check` de la tabla ponen topes razonables; para más protección añade un límite de envíos por IP
  (por ejemplo con una Edge Function) y modera desde el panel de Supabase.

## Opiniones (opcional)

La sección **Opinar** guarda opiniones anónimas en una tabla de **solo escritura**: la web puede añadir filas,
pero nadie puede leerlas con la clave pública. Tú las ves desde el panel de Supabase.

```sql
create table public.feedback (
  id bigint generated always as identity primary key,
  rating smallint check (rating between 1 and 5),
  ease smallint check (ease between 0 and 5),
  would_use text check (would_use in ('yes','maybe','no')),
  comment text check (char_length(comment) <= 1000),
  song_id text check (char_length(song_id) <= 60),
  os text check (char_length(os) <= 20),
  browser text check (char_length(browser) <= 20),
  bluetooth boolean,
  app_version text check (char_length(app_version) <= 20),
  created_at timestamptz not null default now(),
  check (rating is not null or comment is not null)
);

alter table public.feedback enable row level security;
-- Solo insertar. Sin política de lectura: las opiniones no son públicas.
create policy "insertar opinion" on public.feedback for insert with check (true);
```

Consultas útiles para medir si la experiencia gusta y escala:

```sql
-- Promedio de satisfacción y facilidad de conexión por plataforma
select os, browser, count(*) as respuestas, round(avg(rating), 2) as satisfaccion, round(avg(ease) filter (where ease > 0), 2) as facilidad
from feedback group by os, browser order by respuestas desc;

-- ¿Cuánta gente la usaría en un concierto?
select would_use, count(*) from feedback where would_use is not null group by would_use;
```

## Límite de envíos en el servidor

La app ya espera 30 s entre envíos de puntaje y 60 s entre opiniones, pero eso se puede saltar.
Para limitar de verdad, añade este disparador (máximo 30 filas por minuto en toda la tabla; ajústalo a tu tráfico):

```sql
create or replace function public.limitar_envios() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.scores where created_at > now() - interval '1 minute') > 30 then
    raise exception 'Demasiados envíos, intenta más tarde';
  end if;
  return new;
end $$;

create trigger scores_limite before insert on public.scores for each row execute function public.limitar_envios();
```
