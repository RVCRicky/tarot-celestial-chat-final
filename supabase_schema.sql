create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid default uuid_generate_v4() primary key,
  auth_user_id uuid unique,
  email text,
  display_name text,
  country text,
  credits integer default 0,
  created_at timestamp default now()
);

create table if not exists payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  stripe_session_id text,
  amount integer,
  credits integer,
  status text,
  created_at timestamp default now()
);

create table if not exists reservations (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id),
  reader_name text,
  reserved_for timestamp,
  status text default 'confirmed',
  notes text,
  created_at timestamp default now()
);
