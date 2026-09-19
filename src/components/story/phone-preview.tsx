import { Minus, Plus, Search } from "lucide-react";
export function PhonePreview() {
  return (
    <div
      className="phone-preview"
      role="img"
      aria-label="Eksempel på Fryseboksen på mobil: registrering av kjøttdeig, og en oversikt med mengder og innfrysingsdatoer."
    >
      <div className="phone-camera" />
      <div className="phone-status">
        <span>09:41</span>
        <span>▰</span>
      </div>
      <div className="phone-screen" aria-hidden="true">
        <span className="phone-brand">Fryseboksen.no</span>
        <h3>Fryseren hjemme</h3>
        <p className="phone-subtitle">Litt mindre å huske.</p>
        <div className="phone-add">
          <span>Kjøttdeig</span>
          <span>2</span>
          <span className="phone-add-button">
            <Plus size={15} />
          </span>
        </div>
        <div className="phone-priority">
          <span>BRUK DETTE FØRST</span>
          <strong>
            Kjøttdeig <span>↗</span>
          </strong>
          <small>12. januar</small>
        </div>
        <div className="phone-list-title">
          <span>I fryseren</span>
          <Search size={15} />
        </div>
        {[
          ["Kjøttdeig", "12. januar", "3"],
          ["Laks", "22. mai", "2"],
          ["Blåbær", "16. juli", "3"],
          ["Lasagne", "26. august", "2"],
        ].map(([name, date, quantity]) => (
          <div className="phone-item" key={name}>
            <div>
              <strong>{name}</strong>
              <small>{date}</small>
            </div>
            <div className="phone-stepper">
              <Minus size={13} />
              <span>{quantity}</span>
              <Plus size={13} />
            </div>
          </div>
        ))}
      </div>
      <div className="phone-bottom" />
    </div>
  );
}
