"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMission, isMissionId } from "@/lib/missions";
import type { MissionId } from "@/lib/schema";
import { useMissionStore } from "@/lib/stores";

/**
 * Current mission: `?mission=` in the URL (shareable) wins, otherwise the visitor's last choice, otherwise Lunar.
 * Components using this hook must render inside <Suspense> (useSearchParams).
 */
export function useMission() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const stored = useMissionStore((s) => s.mission);
  const setStored = useMissionStore((s) => s.setMission);

  useEffect(() => {
    void useMissionStore.persist.rehydrate();
  }, []);

  const fromUrl = params.get("mission");
  const id: MissionId = isMissionId(fromUrl) ? fromUrl : stored;

  const setMission = useCallback(
    (next: MissionId) => {
      setStored(next);
      const q = new URLSearchParams(params.toString());
      q.set("mission", next);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [params, pathname, router, setStored],
  );

  return { missionId: id, mission: getMission(id), setMission };
}
