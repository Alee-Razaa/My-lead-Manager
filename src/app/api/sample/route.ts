export function GET() {
  return new Response(
    "Company,Role,Location,URL,Notes\nDEMO Example Company,DEMO Analyst,Remote,https://example.com/demo-analyst,Sample only - replace with real research\nDEMO Example Studio,DEMO Coordinator,Pakistan,https://example.com/demo-coordinator,Sample only - not a real vacancy\n",
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="DEMO-leads.csv"',
      },
    },
  );
}
