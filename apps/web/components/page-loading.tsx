export default function Loading() {
  return (
    <main className="cc-container py-12" aria-busy="true" aria-label="Loading page">
      <span role="status" className="sr-only">
        Loading your circle…
      </span>
      <div className="cc-skeleton h-4 w-36 mb-5" />
      <div className="cc-skeleton h-10 w-2/3 max-w-lg mb-10" />
      <div className="grid md:grid-cols-3 gap-5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="cc-panel p-5">
            <div className="cc-skeleton h-36 mb-5" />
            <div className="cc-skeleton h-5 w-2/3 mb-4" />
            <div className="cc-skeleton h-3 mb-2" />
            <div className="cc-skeleton h-3 w-4/5" />
          </div>
        ))}
      </div>
    </main>
  );
}
