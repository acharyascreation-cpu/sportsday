-- Run in Supabase Dashboard > SQL Editor if registration reports that
-- public.register_student_with_phone is missing from the schema cache.
-- Requires supabase-schema.sql to have been run in this project first.

do $$
begin
    if to_regprocedure('public.register_student(text,text,text,text,text,text,text[])') is null then
        raise exception 'Run supabase-schema.sql first; the base register_student function is missing.';
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'students'
          and column_name = 'phone_number'
    ) then
        raise exception 'Run supabase-schema.sql first; public.students.phone_number is missing.';
    end if;
end;
$$;

create or replace function public.register_student_with_phone(
    p_name text,
    p_usn text,
    p_course text,
    p_year text,
    p_gender text,
    p_phone_number text,
    p_events text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_phone_number text;
    v_result jsonb;
    v_updated integer;
begin
    v_phone_number := regexp_replace(
        coalesce(btrim(p_phone_number), ''),
        '[[:space:]().-]',
        '',
        'g'
    );

    if v_phone_number !~ '^\+?[0-9]{7,15}$' then
        raise exception using
            errcode = '22023',
            message = 'Enter a valid contact number.';
    end if;

    v_result := public.register_student(
        p_name, p_usn, p_course, p_year, p_gender, v_phone_number, p_events
    );

    update public.students
    set phone_number = v_phone_number
    where id = (v_result ->> 'registrationId')::bigint;

    get diagnostics v_updated = row_count;

    if v_updated <> 1 then
        raise exception using
            errcode = '22023',
            message = 'Could not save the contact number.';
    end if;

    return v_result;
end;
$$;

revoke execute on function public.register_student_with_phone(text, text, text, text, text, text, text[])
    from public, anon, authenticated;
grant execute on function public.register_student_with_phone(text, text, text, text, text, text, text[])
    to anon, authenticated;

notify pgrst, 'reload schema';
