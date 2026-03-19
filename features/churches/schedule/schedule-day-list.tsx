import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const firstDay = orderedDays.length > 0 ? String(orderedDays[0]) : undefined;

  return (
    <Accordion type="single" collapsible defaultValue={firstDay}>
      {orderedDays.map((day) => {
        const dayEvents = grouped.get(day) || [];
        const dayLabel =
          day === -1 ? "Eventos especiais" : getDayName(day as DayOfWeek);

        return (
          <AccordionItem key={day} value={String(day)}>
            <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <span>{dayLabel}</span>
                <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground/60">
                  ({dayEvents.length}{" "}
                  {dayEvents.length === 1 ? "horário" : "horários"})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {dayEvents.map((event) => {
                  const timeDisplay = formatTimeRange(
                    event.time,
                    event.endTime,
                  );
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
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
