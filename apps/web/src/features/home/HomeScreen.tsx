import markUrl from "@brand/mark-inverse.svg";

export type StatusKind = "loading" | "ok" | "unavailable";

type HomeScreenProps = {
  appName: string;
  statusLabel: string;
  statusText: string;
  statusKind: StatusKind;
  versionText: string | null;
};

export function HomeScreen({
  appName,
  statusLabel,
  statusText,
  statusKind,
  versionText,
}: HomeScreenProps) {
  return (
    <main className="home">
      <header className="home__band">
        <img className="home__mark" src={markUrl} alt="" width={48} height={48} />
        <h1 className="home__name">{appName}</h1>
      </header>
      <div className="home__rules" aria-hidden="true">
        <span className="home__rule home__rule--income" />
        <span className="home__rule home__rule--expense" />
      </div>
      <section className="home__status" aria-label={statusLabel}>
        <span className={`home__dot home__dot--${statusKind}`} aria-hidden="true" />
        <p className="home__status-text" role="status">
          {statusText}
        </p>
        {versionText ? <p className="home__version">{versionText}</p> : null}
      </section>
    </main>
  );
}
