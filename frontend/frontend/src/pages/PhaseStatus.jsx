const rows = [
  ['Project foundation', 'DONE'],
  ['Authentication', 'DONE'],
  ['JWT access/refresh', 'DONE'],
  ['Role system', 'DONE'],
  ['Validation & errors', 'DONE'],
  ['Security middleware', 'DONE'],
  ['Health/readiness', 'DONE'],
  ['Food management', 'DONE'],
  ['Staff management', 'DONE'],
  ['Inventory', 'DONE'],
  ['Purchases', 'DONE'],
  ['Orders', 'DONE'],
  ['Billing & payments', 'DONE'],
  ['Reports', 'DONE'],
  ['In-app notifications', 'DONE']
];

export default function PhaseStatus() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Roadmap</p>
          <h1>Phase status</h1>
        </div>
      </div>
      <section className="panel">
        <div className="status-list">
          {rows.map(([name, status]) => (
            <div className="status-row" key={name}>
              <span>{name}</span>
              <b className={status === 'DONE' ? 'badge done' : 'badge next'}>{status}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
