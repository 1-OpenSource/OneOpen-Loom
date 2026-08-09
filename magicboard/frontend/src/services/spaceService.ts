import { magicboardService } from "./magicboardService";
import type { SpacePageCreate, SpacePageUpdate } from "../types/magicboard";

/** @deprecated Use magicboardService directly */
export const spaceService = {
  listSpaces: magicboardService.listSpaces.bind(magicboardService),
  createSpace: magicboardService.createSpace.bind(magicboardService),
  getSpace: magicboardService.getSpace.bind(magicboardService),
  deleteSpace: magicboardService.deleteSpace.bind(magicboardService),
  listPages: magicboardService.listPagesFlat.bind(magicboardService),
  createPage: magicboardService.createPage.bind(magicboardService),
  getPage: magicboardService.getPage.bind(magicboardService),
  updatePage: (pageId: string, payload: Partial<SpacePageCreate>) =>
    magicboardService.updatePage(pageId, payload as SpacePageUpdate),
  deletePage: magicboardService.deletePage.bind(magicboardService)
};
