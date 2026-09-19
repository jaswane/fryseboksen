"use client";
import { useRef, useState } from "react";
import { CalendarDays, ChevronDown, Plus } from "lucide-react";
import { formatDate, osloToday, type Unit } from "../domain";

export function AddItemForm({
  onAdd,
  busy,
}: {
  busy: boolean;
  onAdd: (input: {
    name: string;
    quantity: number;
    frozenOn: string;
    unit: Unit;
  }) => Promise<boolean>;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [unit, setUnit] = useState<Unit>("stk");
  const today = osloToday();
  const frozenOn = customDate ?? today;
  return (
    <section className="add-panel" aria-labelledby="add-heading">
      <div className="section-heading">
        <h2 id="add-heading">Legg til vare</h2>
        <Plus size={21} aria-hidden="true" />
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const success = await onAdd({
            name,
            quantity: Number(quantity),
            frozenOn: customDate ?? osloToday(),
            unit,
          });
          if (success) {
            setName("");
            setQuantity("1");
            setCustomDate(null);
            setDateOpen(false);
            nameRef.current?.focus();
          }
        }}
      >
        <div className="add-basics">
          <div>
            <label htmlFor="item-name">Varenavn</label>
            <input
              id="item-name"
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
              placeholder="For eksempel kjøttdeig"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="item-quantity">Antall</label>
            <input
              id="item-quantity"
              type="number"
              inputMode="numeric"
              min="1"
              max="999"
              step="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
        </div>
        <details className="unit-options">
          <summary>
            Enhet: {unit} <ChevronDown size={13} />
          </summary>
          <label htmlFor="item-unit">Enhet</label>
          <select
            id="item-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value as Unit)}
          >
            <option value="stk">stk</option>
            <option value="pakker">pakker</option>
            <option value="porsjoner">porsjoner</option>
          </select>
        </details>
        <button
          type="button"
          className="date-toggle"
          aria-expanded={dateOpen}
          aria-controls="date-field"
          onClick={() => setDateOpen(!dateOpen)}
        >
          <CalendarDays size={16} />
          <span>
            {frozenOn === today
              ? "Innfrysingsdato: i dag"
              : frozenOn
                ? "Fryst " + formatDate(frozenOn, true)
                : "Velg innfrysingsdato"}
          </span>
          <span className="underlined">Endre</span>
        </button>
        {dateOpen && (
          <div id="date-field" className="date-field">
            <label htmlFor="item-date">Innfrysingsdato</label>
            <input
              id="item-date"
              type="date"
              required
              min="1900-01-01"
              max={today}
              value={frozenOn}
              onChange={(event) => setCustomDate(event.target.value)}
            />
            <p>Bruk datoen du frøs varen, så godt du husker.</p>
          </div>
        )}
        <button type="submit" disabled={busy} className="button add-submit">
          <Plus size={19} />
          Legg til
        </button>
      </form>
      <details className="how-to">
        <summary>
          Et lite tips <ChevronDown size={15} />
        </summary>
        <p>
          Pluss legger inn én til med dagens dato. Minus tar fra den eldste innleggingen. Bruk
          Rediger for å rette antall eller dato.
        </p>
      </details>
    </section>
  );
}
