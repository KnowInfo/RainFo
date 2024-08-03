import HighlightRange from "../model/range";
import HighlightSource from "../model/source";
import { ERROR, HookMap, PainterOptions } from "../types";
import { CAMEL_DATASET_IDENTIFIER, CAMEL_DATASET_IDENTIFIER_EXTRA, DATASET_IDENTIFIER, eventEmitter, ID_DIVISION, INTERNAL_ERROR_EVENT } from "../util/const";
import { addClass, forEach, getHighlightsByRoot, removeAllClass } from "../util/dom";
import { getSelectedNodes, wrapHighlight } from "./dom";
import { initDefaultStylesheet } from "./style";
export default class Painter {
  options: PainterOptions;
  $style: HTMLStyleElement;
  styleId: string;
  hooks: HookMap;
  constructor(options: PainterOptions, hooks: HookMap) {
    this.options = {
      $root: options.$root,
      wrapTag: options.wrapTag,
      exceptSelectors: options.exceptSelectors,
      className: options.className,
    }
    this.hooks = hooks;
    this.$style = initDefaultStylesheet();
    this.styleId = this.$style.id
  };
  highlightSource(sources: HighlightSource | HighlightSource[]): HighlightSource[] {
    const list = Array.isArray(sources) ? sources : [sources];

    const renderedSources: HighlightSource[] = [];

    list.forEach(s => {
      if (!(s instanceof HighlightSource)) {
        eventEmitter.emit(INTERNAL_ERROR_EVENT, {
          type: ERROR.SOURCE_TYPE_ERROR,
        });

        return;
      }

      const range = s.deSerialize(this.options.$root, this.hooks);
      const $nodes = this.highlightRange(range, s.className);

      if ($nodes && $nodes.length > 0) {
        renderedSources.push(s);
      } else {
        eventEmitter.emit(INTERNAL_ERROR_EVENT, {
          type: ERROR.HIGHLIGHT_SOURCE_NONE_RENDER,
          detail: s,
        });
      }
    });

    return renderedSources;
  };

  highlightRange(range: HighlightRange, className: string[] | string): HTMLElement[] | undefined {
    if (!range.frozen) {
      throw ERROR.HIGHLIGHT_RANGE_FROZEN;
    }
    const { $root, exceptSelectors } = this.options;
    const hooks = this.hooks;

    let $selectedNodes = getSelectedNodes($root, range.start, range.end, exceptSelectors);
    if (!hooks.Render.SelectedNodes.isEmpty()) {
      $selectedNodes = hooks.Render.SelectedNodes.call(range.id, $selectedNodes) || [];
    }
    return $selectedNodes?.map(n => {
      let $node = wrapHighlight(n, range, className, this.options.wrapTag);
      if (!hooks.Render.WrapNode.isEmpty()) {
        $node = hooks.Render.WrapNode.call(range.id, $node);
      }
      return $node;
    })
  };
  /* ============================================================== */

  /* =========================== clean =========================== */
  // id: target id - highlight with this id should be clean
  // if there is no highlight for this id, it will return false, vice versa
  removeHighlight(id: string): boolean {
    const reg = new RegExp(`(${id}\\${ID_DIVISION}|\\${ID_DIVISION}?${id}$)`);

    const hooks = this.hooks;
    const wrapTag = this.options.wrapTag;
    const $spans = document.querySelectorAll<HTMLElement>(`${wrapTag}[data-${DATASET_IDENTIFIER}]`);
    console.log($spans)
    // nodes to remove
    const $toRemove: HTMLElement[] = [];
    // nodes to update main id
    const $idToUpdate: HTMLElement[] = [];
    // nodes to update extra id
    const $extraToUpdate: HTMLElement[] = [];

    for (const $s of $spans) {
      const spanId = $s.dataset[CAMEL_DATASET_IDENTIFIER];
      const spanExtraIds = $s.dataset[CAMEL_DATASET_IDENTIFIER_EXTRA]
      // main id is the target id and no extra ids -> to remove
      if (spanId == id && !spanExtraIds) {
        console.log("进入 main")
        $toRemove.push($s);
      }
      // main id is the target id but there is some extra ids -> update main id & extra id
      else if (spanId == id) {
        $idToUpdate.push($s)
      }
      // main id isn't the target id but extra ids contains it -> just remote it from extra id
      else if (spanId !== id && spanExtraIds && reg.test(spanExtraIds)) {
        console.log("进入 extra")
        $extraToUpdate.push($s);
      }
    }
    console.log($idToUpdate)
    $idToUpdate.forEach($s => {
      const dataset = $s.dataset;
      const ids = dataset[CAMEL_DATASET_IDENTIFIER_EXTRA]?.split(ID_DIVISION);
      const newId = ids?.shift()
      // find overlapped wrapper associated with "extra id"
      const $overlapSpan = document.querySelector<HTMLElement>(
        `${wrapTag}[data-${DATASET_IDENTIFIER}="${newId}"]`,
      );
      if ($overlapSpan) {
        // empty the current class list
        removeAllClass($s)
        // retain the class list of the overlapped wrapper which associated with "extra id"
        addClass($s, [...$overlapSpan.classList])
      }
      dataset[CAMEL_DATASET_IDENTIFIER] = newId;
      dataset[CAMEL_DATASET_IDENTIFIER_EXTRA] = ids?.join(ID_DIVISION);

      hooks.Remove.UpdateNodes.call(id, $s, 'id-update');
    });
    $extraToUpdate.forEach($s => {
      const extraIds = $s.dataset[CAMEL_DATASET_IDENTIFIER_EXTRA];

      $s.dataset[CAMEL_DATASET_IDENTIFIER_EXTRA] = extraIds?.replace(reg, '');
      hooks.Remove.UpdateNodes.call(id, $s, 'extra-update');
    });
    // 开始清理高亮
    $toRemove.forEach($s => {
      const $parent = $s.parentNode;
      const $fr = document.createDocumentFragment();

      forEach($s.childNodes, ($c: Node) => $fr.appendChild($c.cloneNode(false)));
      $parent?.replaceChild($fr, $s);
    })
    return $toRemove.length + $idToUpdate.length + $extraToUpdate.length !== 0;
  };

  removeAllHighlight() {
    const { wrapTag, $root } = this.options;
    const $spans = getHighlightsByRoot($root, wrapTag);

    $spans.forEach($s => {
      const $parent = $s.parentNode;
      const $fr = document.createDocumentFragment();

      forEach($s.childNodes, ($c: Node) => $fr.appendChild($c.cloneNode(false)));
      $parent?.replaceChild($fr, $s);
    });
  };
}
