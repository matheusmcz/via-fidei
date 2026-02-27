import {
  formatRecurrence,
  formatTimeRange,
  getDayName,
  getEventKey,
  getOrderedDays,
  groupByDay,
} from "@/lib/utils";
import type { DayOfWeek, ScheduleEvent } from "@/types";

interface ScheduleDayListProps {
  events: ScheduleEvent[];
}

export function ScheduleDayList({ events }: ScheduleDayListProps) {
  const grouped = groupByDay(events);
  const orderedDays = getOrderedDays(grouped);

  return (
    <div className="space-y-4">
      {orderedDays.map((day) => {
        const dayEvents = grouped.get(day) || [];
        const dayLabel =
          day === -1 ? "Eventos especiais" : getDayName(day as DayOfWeek);

        return (
          <div key={day} className="space-y-1">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {dayLabel}
            </h4>
            <div className="flex flex-wrap gap-2">
              {dayEvents.map((event) => {
                const timeDisplay = formatTimeRange(event.time, event.endTime);
                const recurrenceLabel = formatRecurrence(event.recurrence);

                return (
                  <div
                    key={getEventKey(event)}
                    className="flex items-center gap-1"
                  >
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                      {timeDisplay}
                    </span>
                    {recurrenceLabel && (
                      <span className="text-xs text-muted-foreground">
                        ({recurrenceLabel})
                      </span>
                    )}
                    {event.notes && (
                      <span className="text-sm text-muted-foreground">
                        · {event.notes}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
