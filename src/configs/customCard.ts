import { mindMapCard } from "../cards/MindMapCard";
import { textToDiagramCard } from "../cards/TextToDiagram";
import { CustomCardsConfig } from "../components/lakex/types";

const DefaultCustomCardConfig: CustomCardsConfig = {
    cards: [
        mindMapCard,
        textToDiagramCard,
    ]
}

export default DefaultCustomCardConfig;