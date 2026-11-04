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
