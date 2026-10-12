/**
 * zen-foil showcase — registers the twenty alexleschik.com portfolio plates.
 * Load after (and from the same place as) zen-foil.js:
 *
 *   <script type="module" src=".../zen-foil-showcase.js"></script>
 *   <zen-foil scene="pioneer"></zen-foil>
 */
import { defineScene } from "zen-foil";
import { SHOWCASE } from "./scenes/showcase";

SHOWCASE.forEach((scene) => defineScene(scene));

export { SHOWCASE };
