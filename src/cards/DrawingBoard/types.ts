export interface IDrawingBoardCardValue {
  /** Drawnix / Plait scene format used by all newly saved drawing cards. */
  version?: 2;
  engine?: 'drawnix';
  cardHeight?: number;
  /** Engine-owned serializable scene data. */
  plaitValue?: unknown[];
  plaitViewport?: unknown;
}
