import { DomNode, HookMap } from "../../types";
import Hook from "../../util/hook";
import uuid from "../../util/uuid";
import HighlightSource from "../source";
import { formatDomNode, getDomMeta } from "./dom";
import { getDomRange, removeSelection } from "./selection";
class HighlightRange {
  static removeDomRange = removeSelection
  start: DomNode;
  end: DomNode;
  text: string;
  id: string;
  frozen: boolean;
  constructor(start: DomNode, end: DomNode, text: string, id: string, frozen = false) {
    this.start = formatDomNode(start);
    this.end = formatDomNode(end);
    this.text = text;
    this.frozen = frozen;
    this.id = id;
  }

  static fromSelection() {
    const range = getDomRange()
    if (!range) {
      return null;
    }
    const start: DomNode = {
      $node: range.startContainer,
      offset: range.startOffset,
    }
    const end: DomNode = {
      $node: range.endContainer,
      offset: range.endOffset,
    }
    const text = range.toString();
    let id = uuid();
    return new HighlightRange(start, end, text, id);
  };

  // serialize the HRange instance
  // so that you can save the returned object (e.g. use JSON.stringify on it and send to backend)
  serialize($root: Document | HTMLElement, hooks: HookMap, className: string[] | string): HighlightSource {
    const startMeta = getDomMeta(this.start.$node as Text, this.start.offset, $root);
    const endMeta = getDomMeta(this.end.$node as Text, this.end.offset, $root);
    let extra;
    if (!hooks.Serialize.RecordInfo.isEmpty()) {
      extra = hooks.Serialize.Restore.call(this.start, this.end, $root);
    }
    this.frozen = true;
    return new HighlightSource(startMeta, endMeta, this.text, this.id, className, extra);
  }
}

export default HighlightRange;
