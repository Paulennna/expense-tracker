-- script.sql
SELECT 
    trigger_name, 
    event_object_table, 
    action_timing, 
    event_manipulation, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND event_object_schema = 'auth';
