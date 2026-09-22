/** On-screen rect (window coordinates, from `View.measureInWindow`). Used to morph the experience
 * hero image into the full-screen gallery (`ExperienceHero` -> `ExperienceGalleryScreen`). */
export type GalleryOpenRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
