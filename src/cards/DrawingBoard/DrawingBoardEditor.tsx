import React from 'react';
import CardResizer from '../../components/CardResizer';
import findCardId from '../utils';
import Doc from '../../components/lakex/lakex';
import type { ICardProps } from '../types';
import DrawnixBoardCore from './DrawnixBoardCore';
import type { IDrawingBoardCardValue } from './types';

class DrawingBoardEditor extends React.Component<
  ICardProps<IDrawingBoardCardValue>
> {
  private handleChange = (value: Partial<IDrawingBoardCardValue>) => {
    const { cardValue, updateCardValue } = this.props;
    updateCardValue({
      ...cardValue,
      ...value,
      version: 2,
      engine: 'drawnix',
    });
  };

  render() {
    const { cardValue, editor } = this.props;
    const locale =
      Doc.FrameworkInfra.Locale.getLanguage() === 'zhCN' ? 'zh-CN' : 'en-US';
    // Theme/language are owned by Lakex. The board intentionally reads the
    // current project value on every render instead of persisting a local mode.
    const hostTheme = editor?.theme?.currentThemeSchema?.colorScheme === 'dark' ? 'dark' : 'light';
    const theme = hostTheme;

    return (
      <CardResizer
        className="drawing-board-resizer"
        height={cardValue?.cardHeight || 560}
        min={320}
        onResize={(cardHeight) => this.handleChange({ cardHeight })}
        onDelete={(target) => {
          const cardId = findCardId(target);
          if (cardId && editor?.execCommand) {
            editor.execCommand('deleteCard', cardId);
          }
        }}
      >
        <DrawnixBoardCore
          value={cardValue}
          locale={locale}
          theme={theme}
          onChange={this.handleChange}
        />
      </CardResizer>
    );
  }
}

export default DrawingBoardEditor;
