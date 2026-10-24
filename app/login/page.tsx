"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/features/auth/actions";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";

type LoginState = { error: string } | null;

function loginAction(_prevState: LoginState, formData: FormData) {
  return login(formData);
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6">
            <Image
              src="/images/via-fidei-logo.png"
              alt="Via Fidei"
              width={64}
              height={64}
              className="rounded-lg"
            />

            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Via Fidei</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Acesso restrito
              </p>
            </div>

            <form action={formAction} className="w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-destructive text-center">
                  {state.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
