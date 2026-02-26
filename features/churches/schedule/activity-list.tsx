import type { Activity } from "@/types";
import { ScheduleDayList } from "./schedule-day-list";

interface ActivityListProps {
  activities: Activity[];
}

export function ActivityList({ activities }: ActivityListProps) {
  return (
    <div className="space-y-6">
      {activities.map((activity, idx) => (
        <div key={idx} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{activity.name}</h4>
          </div>
          {activity.description && (
            <p className="text-sm text-muted-foreground">
              {activity.description}
            </p>
          )}
          <ScheduleDayList events={activity.schedule} />
        </div>
      ))}
    </div>
  );
}
