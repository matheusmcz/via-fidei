"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Church } from "@/types";
import { ActivityList } from "./activity-list";
import { ScheduleDayList } from "./schedule-day-list";
import { ScheduleEmpty } from "./schedule-empty";

interface ScheduleTabsProps {
  church: Church;
}

export function ScheduleTabs({ church }: ScheduleTabsProps) {
  const { masses, adorations, confessions, activities } = church;

  return (
    <Tabs defaultValue="mass" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="mass">Missas</TabsTrigger>
        <TabsTrigger value="adoration">Adoração</TabsTrigger>
        <TabsTrigger value="confession">Confissão</TabsTrigger>
        <TabsTrigger value="other">Outros</TabsTrigger>
      </TabsList>

      <TabsContent value="mass" className="mt-4">
        {masses && masses.length > 0 ? (
          <ScheduleDayList events={masses} />
        ) : (
          <ScheduleEmpty type="mass" />
        )}
      </TabsContent>

      <TabsContent value="adoration" className="mt-4">
        {adorations && adorations.length > 0 ? (
          <ScheduleDayList events={adorations} />
        ) : (
          <ScheduleEmpty type="adoration" />
        )}
      </TabsContent>

      <TabsContent value="confession" className="mt-4">
        {confessions && confessions.length > 0 ? (
          <ScheduleDayList events={confessions} />
        ) : (
          <ScheduleEmpty type="confession" />
        )}
      </TabsContent>

      <TabsContent value="other" className="mt-4">
        {activities && activities.length > 0 ? (
          <ActivityList activities={activities} />
        ) : (
          <ScheduleEmpty type="activities" />
        )}
      </TabsContent>
    </Tabs>
  );
}
