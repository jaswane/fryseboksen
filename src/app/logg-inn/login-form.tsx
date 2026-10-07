"use client";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { sendMagicLink, type LoginState } from "@/server/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});
  return (
    <form action={action} className="auth-form">
      <label htmlFor="email">E-postadresse</label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
        required
      />
      {state.error && (
        <p className="inline-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Sender …" : "Send innloggingslenke"}
        {!pending && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
