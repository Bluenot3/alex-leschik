/**
 * The image archive shared by the Visual Arsenal theater, the scroll gallery
 * and the Arsenal showcase.
 *
 * Every image has pre-sized copies (scripts/gallery-variants.py): `thumb` for
 * the thumbnail strip, `md` for cards and phone-sized stages, and `src` (the
 * original) for large stages and the lightbox. A 66-pixel thumbnail never
 * decodes a 1600-pixel photo.
 */
export interface ArchiveImage {
  src: string;
  md: string;
  thumb: string;
  /** Natural size of the original. */
  w: number;
  h: number;
}

const image = (file: string, w: number, h: number): ArchiveImage => {
  const stem = file.replace(/\.\w+$/, "");
  return { src: `/gallery/${file}`, md: `/gallery/md/${stem}.webp`, thumb: `/gallery/thumb/${stem}.webp`, w, h };
};

export const ARCHIVE = {
  infrastructure: image("zen-infrastructure.jpg", 1600, 873),
  ledger: image("zen-ledger.jpg", 1600, 873),
  overview: image("zen-overview.jpg", 1236, 1600),
  partnership: image("zen-partnership.jpg", 1600, 1575),
  pioneer: image("zen-pioneer.jpg", 1236, 1600),
  certificate: image("zen-certificate.jpg", 1536, 1024),
  arsenal: image("arsenal.jpg", 1024, 1024),
  worldTunnel: image("zenai-world-tunnel.jpg", 1024, 1024),
  worldSphere: image("zenai-world-sphere.jpg", 682, 1024),
  weeklyFresco: image("zen-weekly-fresco.jpg", 1024, 1024),
  weeklyCity: image("zen-weekly-city.jpg", 1024, 1024),
  weeklyMosaic: image("zen-weekly-mosaic.jpg", 1200, 1200),
  weeklyWorld: image("zen-weekly-world.jpg", 1200, 1200),
  researchMarket: image("zen-research-market.jpg", 1500, 1500),
  researchBiofix: image("zen-research-biofix.jpg", 1500, 1500),
  researchMetamaterial: image("zen-research-metamaterial.jpg", 1500, 1500),
  researchSelfheal: image("zen-research-selfheal.jpg", 1500, 1500),
  zengenCrystal: image("zengen-crystal.webp", 1024, 1024),
} as const;
