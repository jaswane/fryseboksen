"use client";
import { Minus, Pencil, Plus } from "lucide-react";
import { formatDate, formatQuantity, type InventoryItem } from "../domain";

export function ItemRow({
  item,
  busy,
  onAdd,
  onTake,
  onEdit,
}: {
  item: InventoryItem;
  busy: boolean;
  onAdd: () => void;
  onTake: () => void;
  onEdit: () => void;
}) {
  const dates = new Set(item.entries.map((entry) => entry.frozenOn)).size;
  return (
    <li className="inventory-row" data-item-name={item.name}>
      <div className="item-description">
        <h3>{item.name}</h3>
        <p>
          {dates > 1 ? "Eldste: " : "Fryst "}
          {formatDate(item.oldestDate, true)}
          {dates > 1 && <span className="date-count"> · {dates} datoer</span>}
        </p>
      </div>
      <div className="item-controls">
        <div className="stepper">
          <button
            type="button"
            disabled={busy}
            className="stepper-button"
            aria-label={"Ta ut én " + item.name + " – eldste først"}
            title="Ta ut én – eldste først"
            onClick={onTake}
          >
            <Minus size={18} />
          </button>
          <span className="quantity" aria-label={formatQuantity(item.quantity, item.unit)}>
            <strong>{item.quantity}</strong>
            <small>
              {formatQuantity(item.quantity, item.unit).replace(item.quantity + " ", "")}
            </small>
          </span>
          <button
            type="button"
            disabled={busy}
            className="stepper-button"
            aria-label={"Legg inn én " + item.name + " i dag"}
            title="Legg inn én til i dag"
            onClick={onAdd}
          >
            <Plus size={18} />
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          className="icon-button edit-item"
          aria-label={"Rediger " + item.name}
          onClick={onEdit}
        >
          <Pencil size={17} />
        </button>
      </div>
    </li>
  );
}
