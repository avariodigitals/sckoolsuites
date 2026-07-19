type TimetablePeriod = {
  day: string;
  period: number;
  subject: string;
  startTime?: string;
  endTime?: string;
};

type TimetableTemplate = {
  name: string;
  level?: string;
  periods: TimetablePeriod[];
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function normalizeDay(day: string): string {
  const d = day.trim().toLowerCase();
  const found = DAYS.find((D) => D.toLowerCase().startsWith(d));
  return found ?? day;
}

export function TimetableView({
  templates,
  filterSubject,
}: {
  templates: TimetableTemplate[];
  filterSubject?: (subjectName: string) => boolean;
}) {
  if (!templates.length) {
    return (
      <p className="text-sm text-slate-500">
        No timetable has been configured yet. An admin needs to set up period scheduling in the school settings.
      </p>
    );
  }

  const template = templates[0];
  const allPeriods = template.periods || [];

  const filtered = filterSubject
    ? allPeriods.filter((p) => filterSubject(p.subject))
    : allPeriods;

  if (!filtered.length) {
    return (
      <p className="text-sm text-slate-500">
        No timetable entries match your assigned subjects. Your schedule will appear here once the admin assigns periods to your subjects.
      </p>
    );
  }

  const usedDays = Array.from(new Set(filtered.map((p) => normalizeDay(p.day))))
    .sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
  const maxPeriod = Math.max(...filtered.map((p) => p.period), 0);
  const periodNumbers = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const grid: Record<string, Record<number, TimetablePeriod | undefined>> = {};
  for (const day of usedDays) {
    grid[day] = {};
    for (const pn of periodNumbers) {
      grid[day][pn] = filtered.find((p) => normalizeDay(p.day) === day && p.period === pn);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{template.name}</p>
        {template.level && <span className="text-xs text-slate-500">{template.level}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Period
              </th>
              {usedDays.map((day) => (
                <th key={day} className="border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodNumbers.map((pn) => (
              <tr key={pn}>
                <td className="border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                  {pn}
                </td>
                {usedDays.map((day) => {
                  const cell = grid[day][pn];
                  if (!cell) {
                    return <td key={day} className="border border-slate-200 px-3 py-2 text-center text-xs text-slate-300">—</td>;
                  }
                  return (
                    <td key={day} className="border border-slate-200 px-2 py-1.5 text-center">
                      <div className="rounded-md bg-indigo-50 px-2 py-1">
                        <p className="text-xs font-medium text-indigo-900">{cell.subject}</p>
                        {(cell.startTime || cell.endTime) && (
                          <p className="text-[10px] text-indigo-500">
                            {cell.startTime || ""}{cell.startTime && cell.endTime ? "–" : ""}{cell.endTime || ""}
                          </p>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
