"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PerPageFilterProps {
  value: number;
  onChange: (value: number) => void;
}

export function PerPageFilter({ value, onChange }: PerPageFilterProps) {
  return (
    <Select
      value={value.toString()}
      onValueChange={(val) => onChange(Number(val))}
    >
      <SelectTrigger className="w-[100px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="10">10</SelectItem>
        <SelectItem value="20">20</SelectItem>
        <SelectItem value="30">30</SelectItem>
      </SelectContent>
    </Select>
  );
}
