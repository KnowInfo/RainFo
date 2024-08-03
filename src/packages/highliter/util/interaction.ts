import type { IInteraction } from "../types"
import { UserInputEvent } from "../types"
export default (): IInteraction => {
  const interaction: IInteraction = {
    PointerEnd: UserInputEvent.mouseup,
    PointerTap: UserInputEvent.click,
    PointerOver: UserInputEvent.mouseover,
  };
  return interaction;
};
