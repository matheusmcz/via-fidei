interface ScheduleEmptyProps {
  type: "mass" | "adoration" | "confession" | "activities";
}

const EMPTY_MESSAGES: Record<ScheduleEmptyProps["type"], string> = {
  mass: "Sem informações de horários de missa disponíveis.",
  adoration: "Sem informações de adoração disponíveis.",
  confession: "Sem informações de confissão disponíveis.",
  activities: "Sem atividades cadastradas.",
};

export function ScheduleEmpty({ type }: ScheduleEmptyProps) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <p>{EMPTY_MESSAGES[type]}</p>
      <p className="text-sm mt-2">
        Conhece os horários?{" "}
        <a
          href="mailto:contato@viafidei.com.br"
          className="text-primary hover:underline"
        >
          Contribua com dados
        </a>
      </p>
    </div>
  );
}
