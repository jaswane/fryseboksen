"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { EntryCorrection } from "../adapter";
import { formatDate, osloToday, type InventoryItem, type Unit } from "../domain";
import { Dialog } from "@/components/ui/dialog";

export function EditItem({
  item,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  item: InventoryItem;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (name: string, unit: Unit, entries: EntryCorrection[]) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState(item.unit);
  const [entries, setEntries] = useState(
    item.entries.map((entry) => ({ ...entry, quantityInput: String(entry.quantity) })),
  );
  return (
    <Dialog
      title={"Rediger " + item.name}
      description="Rett navn, antall eller dato. En korreksjon regnes ikke som en ny innlegging."
      onClose={onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            await onSave(
              name,
              unit,
              entries.map((entry) => ({
                id: entry.id,
                quantity: Number(entry.quantityInput),
                frozenOn: entry.frozenOn,
                expectedVersion: entry.version,
              })),
            )
          )
            onClose();
        }}
      >
        <label htmlFor="edit-name">Varenavn</label>
        <input
          id="edit-name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label htmlFor="edit-unit">Enhet</label>
        <select
          id="edit-unit"
          value={unit}
          onChange={(event) => setUnit(event.target.value as Unit)}
        >
          <option value="stk">stk</option>
          <option value="pakker">pakker</option>
          <option value="porsjoner">porsjoner</option>
        </select>
        <div className="edit-entries">
          <h3>Innlegginger</h3>
          <p>Hver innlegging beholder sin egen dato. Antall 0 fjerner innleggingen.</p>
          {entries.map((entry, index) => (
            <fieldset className="edit-entry" key={entry.id}>
              <legend>
                Innlegging {index + 1} · {formatDate(item.entries[index].frozenOn, true)}
              </legend>
              <div>
                <label htmlFor={"edit-quantity-" + entry.id}>Antall</label>
                <input
                  id={"edit-quantity-" + entry.id}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="999"
                  step="1"
                  required
                  value={entry.quantityInput}
                  onChange={(event) =>
                    setEntries((values) =>
                      values.map((value) =>
                        value.id === entry.id
                          ? { ...value, quantityInput: event.target.value }
                          : value,
                      ),
                    )
                  }
                />
              </div>
              <div>
                <label htmlFor={"edit-date-" + entry.id}>Innfrysingsdato</label>
                <input
                  id={"edit-date-" + entry.id}
                  type="date"
                  min="1900-01-01"
                  max={osloToday()}
                  required
                  value={entry.frozenOn}
                  onChange={(event) =>
                    setEntries((values) =>
                      values.map((value) =>
                        value.id === entry.id ? { ...value, frozenOn: event.target.value } : value,
                      ),
                    )
                  }
                />
              </div>
            </fieldset>
          ))}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="text-button danger-text"
            disabled={busy}
            onClick={async () => {
              if (await onDelete()) onClose();
            }}
          >
            <Trash2 size={16} />
            Slett vare
          </button>
          <button type="submit" disabled={busy} className="button">
            Lagre endringer
          </button>
        </div>
      </form>
    </Dialog>
  );
}
