import type { DomMeta, HookMap, DomNode } from "../../types";
import HighlightRange from "../range";
import { queryElementNode, getTextChildByOffset } from "./dom";
class HighlightSource {
  startMeta: DomMeta;
  endMeta: DomMeta;
  text: string;
  id: string;
  className: string[] | string;
  extra?: unknown;

  __isHighlightSource: unknown;
  constructor(startMeta: DomMeta, endMeta: DomMeta, text: string, id: string, className: string[] | string, extra?: unknown) {
    this.startMeta = startMeta;
    this.endMeta = endMeta;
    this.text = text;
    this.id = id;
    this.className = className;
    this.__isHighlightSource = {};
    if (extra) {
      this.extra = extra;
    }
  }

  deSerialize($root: Document | HTMLElement, hooks: HookMap): HighlightRange {
    const { start, end } = queryElementNode(this, $root);
    let startInfo = getTextChildByOffset(start, this.startMeta.textOffset)
    let endInfo = getTextChildByOffset(end, this.endMeta.textOffset)
    if (!hooks.Serialize.Restore.isEmpty()) {
      const res: DomNode[] = hooks.Serialize.Restore.call(this, startInfo, endInfo) || [];
      startInfo = res[0] || startInfo;
      endInfo = res[1] || endInfo;
    }
    const range = new HighlightRange(startInfo, endInfo, this.text, this.id, true);
    return range
  }
}


export default HighlightSource;
