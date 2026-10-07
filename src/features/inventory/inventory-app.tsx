"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  PackageOpen,
  Pencil,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { Brand } from "@/components/site/chrome";
import { Dialog } from "@/components/ui/dialog";
import type { InventoryAdapter } from "./adapter";
import { browserDemoStorage, LocalInventoryAdapter } from "./local-adapter";
import { DEMO_FREEZER_ID, EMPTY_FREEZER_ID } from "./demo-seed";
import { formatDate, selectItems, type InventoryItem, type SortOrder } from "./domain";
import { useInventory } from "./use-inventory";
import { AddItemForm } from "./components/add-item-form";
import { ItemRow } from "./components/item-row";
import { EditItem } from "./components/edit-item";

/** The only composition root that imports a concrete inventory adapter. */
export function DemoApp() {
  const [adapter] = useState(() => new LocalInventoryAdapter(browserDemoStorage()));
  return (
    <InventoryApp
      adapter={adapter}
      initialFreezerId={DEMO_FREEZER_ID}
      demo={{
        choices: [
          { id: DEMO_FREEZER_ID, label: "Eksempelvarer" },
          { id: EMPTY_FREEZER_ID, label: "Tom fryser" },
        ],
        reset: () => adapter.resetDemo(),
      }}
    />
  );
}

export function InventoryApp({
  adapter,
  initialFreezerId,
  demo,
  account,
}: {
  adapter: InventoryAdapter;
  initialFreezerId: string;
  demo?: { choices: { id: string; label: string }[]; reset: () => Promise<void> };
  /**
   * Replaces the header link for a signed-in app, where reaching the account
   * matters more than reaching the front page. The brand still links home, so
   * the header keeps one link either way.
   */
  account?: React.ReactNode;
}) {
  const inventory = useInventory(adapter, initialFreezerId);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("oldest");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [freezerName, setFreezerName] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const snapshot = inventory.snapshot;
  const items = snapshot ? selectItems(snapshot.entries, query, sort) : [];
  const allItems = snapshot ? selectItems(snapshot.entries) : [];
  const total = snapshot?.entries.reduce((sum, entry) => sum + entry.quantity, 0) ?? 0;
  const freezerId = snapshot?.freezer.id ?? initialFreezerId;
  const choose = (id: string) => {
    setQuery("");
    setEditing(null);
    setSort("oldest");
    void inventory.load(id);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        {account ?? (
          <Link href="/" className="text-button app-home-link">
            Til forsiden <ArrowUpRight size={16} />
          </Link>
        )}
      </header>
      {demo && (
        <div className="demo-bar">
          <div>
            <span className="demo-label">DEMO</span>
            <span>Din egen prøve. Lagres bare i denne nettleseren.</span>
          </div>
          <div className="demo-switch" aria-label="Velg demo">
            {demo.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-pressed={freezerId === choice.id}
                disabled={inventory.busy || inventory.loading}
                onClick={() => choose(choice.id)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <main id="main" tabIndex={-1} className="app-main">
        <div className="app-title-row">
          <div>
            <p className="eyebrow">DIN OVERSIKT</p>
            <div className="freezer-title">
              <h1 id="inventory-title" tabIndex={-1}>
                {snapshot?.freezer.name ?? "Fryseren din"}
              </h1>
              {snapshot && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Endre frysernavn"
                  disabled={inventory.busy}
                  onClick={() => {
                    setFreezerName(snapshot.freezer.name);
                    inventory.clearError();
                    setRenameOpen(true);
                  }}
                >
                  <Pencil size={18} />
                </button>
              )}
            </div>
            <p className="inventory-summary">
              {allItems.length
                ? allItems.length + " varer · " + total + " enheter · litt mindre å huske"
                : "Plass til en litt enklere hverdag."}
            </p>
          </div>
          {demo && (
            <span className="local-note">
              <Check size={15} />
              Kun på din enhet
            </span>
          )}
        </div>
        {inventory.error && !editing && !renameOpen && (
          <div className="error-banner" role="alert">
            <span>{inventory.error}</span>
            <button type="button" className="text-button" onClick={() => void inventory.reload()}>
              Prøv igjen
            </button>
          </div>
        )}
        {inventory.loading ? (
          <div className="app-loading" role="status">
            Åpner fryseren …
          </div>
        ) : (
          snapshot && (
            <div className="app-grid">
              <aside>
                <AddItemForm
                  key={freezerId}
                  busy={inventory.busy}
                  onAdd={(input) => inventory.execute({ type: "add", freezerId, ...input })}
                />
                <p className="aside-note">
                  Oversikten blir til underveis.
                  <br />
                  Det trenger ikke være perfekt.
                </p>
              </aside>
              <div className="inventory-content">
                {allItems.length > 0 && !query && (
                  <section className="use-first" aria-labelledby="use-first-heading">
                    <div className="use-first-heading">
                      <Clock3 size={17} />
                      <h2 id="use-first-heading">Bruk dette først</h2>
                    </div>
                    <p>Varene med eldste registrerte innfrysingsdato.</p>
                    <div className="priority-items">
                      {allItems.slice(0, 2).map((item) => (
                        <button
                          type="button"
                          disabled={inventory.busy}
                          key={item.key}
                          onClick={() => {
                            inventory.clearError();
                            setEditing(item);
                          }}
                          aria-label={"Se innlegginger for " + item.name}
                        >
                          <span>
                            <strong>{item.name}</strong>
                            <small>{formatDate(item.oldestDate, true)}</small>
                          </span>
                          <ArrowUpRight size={19} />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {allItems.length > 0 ? (
                  <section className="inventory-list-section" aria-labelledby="content-heading">
                    <div className="list-title">
                      <h2 id="content-heading">I fryseren</h2>
                      <span>{allItems.length} varer</span>
                    </div>
                    <div className="inventory-toolbar">
                      <div className="search-field">
                        <Search size={18} aria-hidden="true" />
                        <label className="sr-only" htmlFor="inventory-search">
                          Søk i fryseren
                        </label>
                        <input
                          id="inventory-search"
                          type="search"
                          placeholder="Finn en vare"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </div>
                      <label className="sort-control">
                        <span className="sr-only">Sorter varer</span>
                        <select
                          value={sort}
                          onChange={(event) => setSort(event.target.value as SortOrder)}
                        >
                          <option value="oldest">Eldste først</option>
                          <option value="newest">Nylig lagt til</option>
                        </select>
                      </label>
                    </div>
                    {items.length ? (
                      <ul className="inventory-list" aria-label="Fryserinnhold">
                        {items.map((item) => (
                          <ItemRow
                            key={item.key}
                            item={item}
                            busy={inventory.busy}
                            onAdd={() =>
                              void inventory.execute({
                                type: "add-one",
                                freezerId,
                                itemKey: item.key,
                              })
                            }
                            onTake={() =>
                              void inventory.execute({
                                type: "take-one",
                                freezerId,
                                itemKey: item.key,
                              })
                            }
                            onEdit={() => {
                              inventory.clearError();
                              setEditing(item);
                            }}
                          />
                        ))}
                      </ul>
                    ) : (
                      <div className="search-empty">
                        <Search size={25} />
                        <h3>Ingen varer med dette navnet</h3>
                        <p>Prøv et annet ord, eller legg til varen.</p>
                        <button className="text-button" onClick={() => setQuery("")}>
                          Vis alle varer <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                    <p className="list-help">
                      − tar fra eldste innlegging. + legger inn én til i dag.
                    </p>
                  </section>
                ) : (
                  <section className="empty-state" aria-labelledby="empty-heading">
                    <div className="empty-icon">
                      <PackageOpen size={54} strokeWidth={1} />
                    </div>
                    <p className="eyebrow">ET LITE STED Å BEGYNNE</p>
                    <h2 id="empty-heading">
                      Fryseren din.
                      <br />
                      En ny oversikt.
                    </h2>
                    <p>
                      Begynn med neste vare du legger i fryseren. Du trenger ikke registrere alt nå.
                    </p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => document.getElementById("item-name")?.focus()}
                    >
                      Legg inn din første vare <ArrowRight size={17} />
                    </button>
                  </section>
                )}
              </div>
            </div>
          )
        )}
        <div className="app-bottom">
          <p>Datoene er din oversikt, ikke en vurdering av holdbarhet.</p>
          {demo && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setResetError("");
                setResetOpen(true);
              }}
              disabled={inventory.busy}
            >
              Tilbakestill demo
            </button>
          )}
        </div>
      </main>
      {inventory.notice && (
        <div className="toast">
          <span role="status">{inventory.notice.message}</span>
          {inventory.notice.undo && (
            <button
              type="button"
              className="toast-undo"
              disabled={inventory.busy}
              onClick={() => void inventory.undo()}
            >
              <Undo2 size={16} />
              Angre
            </button>
          )}
          <button
            type="button"
            className="toast-dismiss"
            aria-label="Lukk melding"
            onClick={inventory.clearNotice}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {editing && (
        <EditItem
          item={editing}
          busy={inventory.busy}
          error={inventory.error}
          onClose={() => {
            setEditing(null);
            inventory.clearError();
          }}
          onSave={(name, unit, entries) =>
            inventory.execute({
              type: "edit",
              freezerId,
              itemKey: editing.key,
              name,
              unit,
              entries,
            })
          }
          onDelete={() => inventory.execute({ type: "delete", freezerId, itemKey: editing.key })}
        />
      )}
      {renameOpen && (
        <Dialog
          title="Hva heter fryseren?"
          description="Velg et navn som er lett å kjenne igjen."
          onClose={() => setRenameOpen(false)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (await inventory.execute({ type: "rename-freezer", freezerId, name: freezerName }))
                setRenameOpen(false);
            }}
          >
            <label htmlFor="freezer-name">Frysernavn</label>
            <input
              id="freezer-name"
              required
              maxLength={60}
              value={freezerName}
              onChange={(event) => setFreezerName(event.target.value)}
            />
            {inventory.error && (
              <p role="alert" className="inline-error">
                {inventory.error}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" className="text-button" onClick={() => setRenameOpen(false)}>
                Avbryt
              </button>
              <button type="submit" disabled={inventory.busy} className="button">
                Lagre navn
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {resetOpen && (
        <Dialog
          title="Begynne på nytt?"
          description="Dette fjerner dine lokale endringer i begge demofryserne. Eksempelvarene kommer tilbake, og den tomme fryseren blir tom igjen."
          onClose={() => setResetOpen(false)}
        >
          {resetError && (
            <p className="inline-error" role="alert">
              {resetError}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="text-button" onClick={() => setResetOpen(false)}>
              Avbryt
            </button>
            <button
              type="button"
              className="button"
              disabled={resetBusy}
              onClick={async () => {
                setResetBusy(true);
                try {
                  await demo?.reset();
                  setResetOpen(false);
                  setQuery("");
                  await inventory.reload();
                } catch (e) {
                  setResetError(
                    e instanceof Error ? e.message : "Demoen kunne ikke tilbakestilles.",
                  );
                } finally {
                  setResetBusy(false);
                }
              }}
            >
              Tilbakestill
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
