import type { ScheduleEvent } from "@/types";
import { describe, expect, it } from "vitest";
import {
  canGroupWeekdays,
  formatRecurrence,
  formatTime,
  formatTimeRange,
  getDayName,
  getDayNameShort,
  getEventKey,
  getOrderedDays,
  groupByDay,
  isValidTime,
} from "./schedule";

describe("getDayName / getDayNameShort", () => {
  it("usa 0 para domingo e 6 para sábado", () => {
    expect(getDayName(0)).toBe("Domingo");
    expect(getDayName(3)).toBe("Quarta-feira");
    expect(getDayName(6)).toBe("Sábado");
  });

  it("tem abreviações de três letras", () => {
    expect(getDayNameShort(0)).toBe("Dom");
    expect(getDayNameShort(6)).toBe("Sáb");
  });
});

// Mesma regra do CHECK `is_valid_schedule_time()` da migration 016. Os casos de
// borda abaixo se repetem em `supabase/tests/016_integridade_formatos_verificacao.sql`.
describe("isValidTime", () => {
  it.each(["00:00", "07:00", "09:59", "18:30", "19:05", "23:59"])(
    "aceita %s",
    (time) => {
      expect(isValidTime(time)).toBe(true);
    },
  );

  it.each([
    "",
    " ",
    "24:00",
    "23:60",
    "12:60",
    "7:30",
    "7:00",
    "07:0",
    "7h",
    "07h00",
    "07.00",
    "0700",
    "07:00:00",
    " 07:00",
    "07:00 ",
    "07:00\n",
    "ab:cd",
    "٠٧:٠٠",
  ])("rejeita %j", (time) => {
    expect(isValidTime(time)).toBe(false);
  });
});

describe("formatTime", () => {
  it("omite os minutos na hora cheia e tira o zero à esquerda", () => {
    expect(formatTime("07:00")).toBe("7h");
    expect(formatTime("00:00")).toBe("0h");
  });

  it("mantém os minutos quando não é hora cheia", () => {
    expect(formatTime("18:30")).toBe("18h30");
    expect(formatTime("06:05")).toBe("6h05");
  });

  it("devolve o texto original quando o horário é inválido", () => {
    expect(formatTime("25:00")).toBe("25:00");
    expect(formatTime("à tarde")).toBe("à tarde");
    expect(formatTime("7:30")).toBe("7:30");
  });
});

describe("formatTimeRange", () => {
  it("mostra só o início sem horário de término", () => {
    expect(formatTimeRange("08:00")).toBe("8h");
  });

  it("une início e término com 'às'", () => {
    expect(formatTimeRange("06:30", "17:30")).toBe("6h30 às 17h30");
  });
});

describe("formatRecurrence", () => {
  it("não mostra rótulo para semanal ou ausente", () => {
    expect(formatRecurrence()).toBeNull();
    expect(formatRecurrence("weekly")).toBeNull();
  });

  it.each([
    ["first-friday", "1ª Sexta-feira do mês"],
    ["first-saturday", "1º Sábado do mês"],
    ["first-thursday", "1ª Quinta-feira do mês"],
    ["monthly", "Mensal"],
    ["monthly-20", "Todo dia 20 do mês"],
    ["biweekly", "Quinzenal"],
  ])("traduz %s", (recurrence, label) => {
    expect(formatRecurrence(recurrence)).toBe(label);
  });

  it("devolve a recorrência desconhecida como veio", () => {
    expect(formatRecurrence("last-sunday")).toBe("last-sunday");
  });
});

describe("getEventKey", () => {
  it("gera chaves diferentes para eventos diferentes no mesmo dia", () => {
    const a: ScheduleEvent = { dayOfWeek: 0, time: "07:00" };
    const b: ScheduleEvent = { dayOfWeek: 0, time: "07:00", notes: "Cantada" };
    expect(getEventKey(a)).not.toBe(getEventKey(b));
  });

  it("usa 'special' sem dia da semana e troca espaços por '_'", () => {
    const event: ScheduleEvent = {
      time: "19:00",
      recurrence: "first-friday",
      notes: "Missa do Sagrado Coração",
    };
    expect(getEventKey(event)).toBe(
      "special-19:00--first-friday-Missa_do_Sagrado_Coração",
    );
  });

  it("assume 'weekly' quando a recorrência não é informada", () => {
    expect(getEventKey({ dayOfWeek: 2, time: "18:00" })).toBe(
      "2-18:00--weekly-",
    );
  });
});

describe("groupByDay", () => {
  it("agrupa por dia e ordena os horários dentro do dia", () => {
    const events: ScheduleEvent[] = [
      { dayOfWeek: 0, time: "18:00" },
      { dayOfWeek: 1, time: "07:00" },
      { dayOfWeek: 0, time: "07:00" },
      { dayOfWeek: 0, time: "09:30" },
    ];

    const grouped = groupByDay(events);

    expect(grouped.get(0)?.map((e) => e.time)).toEqual([
      "07:00",
      "09:30",
      "18:00",
    ]);
    expect(grouped.get(1)?.map((e) => e.time)).toEqual(["07:00"]);
  });

  it("coloca eventos sem dia da semana na chave -1", () => {
    const grouped = groupByDay([
      { time: "19:00", recurrence: "first-friday" },
    ]);
    expect([...grouped.keys()]).toEqual([-1]);
  });

  it("devolve mapa vazio para lista vazia", () => {
    expect(groupByDay([]).size).toBe(0);
  });

  it("não altera a lista recebida", () => {
    const events: ScheduleEvent[] = [
      { dayOfWeek: 0, time: "18:00" },
      { dayOfWeek: 0, time: "07:00" },
    ];
    groupByDay(events);
    expect(events.map((e) => e.time)).toEqual(["18:00", "07:00"]);
  });
});

describe("canGroupWeekdays", () => {
  const weekdays = (times: Record<number, string[]>): ScheduleEvent[] =>
    Object.entries(times).flatMap(([day, list]) =>
      list.map((time) => ({
        dayOfWeek: Number(day) as ScheduleEvent["dayOfWeek"],
        time,
      })),
    );

  it("agrupa quando segunda a sexta têm os mesmos horários", () => {
    const grouped = groupByDay(
      weekdays({
        1: ["07:00", "19:00"],
        2: ["19:00", "07:00"],
        3: ["07:00", "19:00"],
        4: ["07:00", "19:00"],
        5: ["07:00", "19:00"],
      }),
    );
    expect(canGroupWeekdays(grouped)).toBe(true);
  });

  it("ignora sábado e domingo na comparação", () => {
    const grouped = groupByDay(
      weekdays({
        0: ["08:00"],
        1: ["07:00"],
        2: ["07:00"],
        3: ["07:00"],
        4: ["07:00"],
        5: ["07:00"],
        6: ["17:00"],
      }),
    );
    expect(canGroupWeekdays(grouped)).toBe(true);
  });

  it("não agrupa quando falta um dia útil", () => {
    const grouped = groupByDay(
      weekdays({ 1: ["07:00"], 2: ["07:00"], 3: ["07:00"], 4: ["07:00"] }),
    );
    expect(canGroupWeekdays(grouped)).toBe(false);
  });

  it("não agrupa quando um dia útil tem horário diferente", () => {
    const grouped = groupByDay(
      weekdays({
        1: ["07:00"],
        2: ["07:00"],
        3: ["07:00", "19:00"],
        4: ["07:00"],
        5: ["07:00"],
      }),
    );
    expect(canGroupWeekdays(grouped)).toBe(false);
  });
});

describe("getOrderedDays", () => {
  it("ordena de domingo a sábado e deixa os especiais (-1) por último", () => {
    const grouped = groupByDay([
      { time: "19:00", recurrence: "first-friday" },
      { dayOfWeek: 6, time: "17:00" },
      { dayOfWeek: 0, time: "08:00" },
      { dayOfWeek: 3, time: "19:00" },
    ]);
    expect(getOrderedDays(grouped)).toEqual([0, 3, 6, -1]);
  });

  it("devolve lista vazia sem eventos", () => {
    expect(getOrderedDays(new Map())).toEqual([]);
  });
});
