"use client";

import type { Clergy } from "@/types";
import { useState } from "react";
import { ClergyCard } from "./clergy-card";
import { ClergyDetailModal } from "./clergy-detail-modal";

interface ClergyCardWithModalProps {
  clergy: Clergy;
  showTenure?: boolean;
}

export function ClergyCardWithModal({
  clergy,
  showTenure = true,
}: ClergyCardWithModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      >
        <ClergyCard clergy={clergy} showTenure={showTenure} />
      </button>
      <ClergyDetailModal
        clergy={clergy}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}
