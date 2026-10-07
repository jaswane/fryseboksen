"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { deleteAccount } from "@/server/auth/actions";

/**
 * Deleting is permanent and there is no export yet, so it asks once and says
 * plainly what disappears. The confirmation is a typed word rather than a
 * second button, because a stray tap should not be able to do this.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = confirmation.trim().toLocaleLowerCase("nb-NO") === "slett";

  return (
    <>
      <button
        type="button"
        className="text-button danger-text"
        onClick={() => {
          setConfirmation("");
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 size={16} />
        Slett kontoen
      </button>
      {open && (
        <Dialog
          title="Slette kontoen?"
          description="Fryseren din, alle varer og alle innfrysingsdatoer blir borte. Dette kan ikke angres, og vi har ingen kopi."
          onClose={() => setOpen(false)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!ready) return;
              setError("");
              startTransition(async () => {
                const result = await deleteAccount();
                if (result?.error) setError(result.error);
              });
            }}
          >
            <label htmlFor="confirm-delete">Skriv «slett» for å bekrefte</label>
            <input
              id="confirm-delete"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              required
            />
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" className="text-button" onClick={() => setOpen(false)}>
                Avbryt
              </button>
              <button type="submit" className="button" disabled={!ready || pending}>
                {pending ? "Sletter …" : "Slett kontoen"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
