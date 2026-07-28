import { mindMapCard } from "../cards/MindMapCard";
import { textToDiagramCard } from "../cards/TextToDiagram";
import { drawingBoardCard } from "../cards/DrawingBoard";
import { CustomCardsConfig } from "../components/lakex/types";

const DefaultCustomCardConfig: CustomCardsConfig = {
    cards: [
        mindMapCard,
        textToDiagramCard,
        drawingBoardCard,
    ]
}

export default DefaultCustomCardConfig;