import type { ComponentType } from "react";
import type { MegaMenuGroupTitleIcon } from "../../config/megaMenu";
import {
  IconMenuMegaCpu,
  IconMenuMegaGamepad,
  IconMenuMegaMonitor,
  IconMenuMegaPlug,
  IconSpark
} from "./headerIcons";

const MAP: Record<MegaMenuGroupTitleIcon, ComponentType<{ className?: string }>> = {
  components: IconMenuMegaCpu,
  gaming: IconMenuMegaGamepad,
  display: IconMenuMegaMonitor,
  accessories: IconMenuMegaPlug,
  spark: IconSpark
};

export function MegaMenuGroupTitleIcon({ name }: { name?: MegaMenuGroupTitleIcon }) {
  if (!name) return null;
  const Cmp = MAP[name];
  return <Cmp className="sp-mega-col-title-icon" />;
}
