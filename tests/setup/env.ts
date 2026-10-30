// Testes unitários e de integração nunca acessam o Supabase real: sem estas
// variáveis, um teste que esquecer o `vi.mock` do cliente falha na hora, igual
// na máquina local e no CI.
for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  delete process.env[name];
}
