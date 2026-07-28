import React from 'react';
import Doc from '../../components/lakex/lakex';
import type { ICardProps } from '../types';
import DrawnixBoardCore from './DrawnixBoardCore';
import type { IDrawingBoardCardValue } from './types';

class DrawingBoardViewer extends React.Component<
  ICardProps<IDrawingBoardCardValue>
> {
  render() {
    const { cardValue, editor } = this.props;
    const locale =
      Doc.FrameworkInfra.Locale.getLanguage() === 'zhCN' ? 'zh-CN' : 'en-US';
    const hostTheme = editor?.theme?.currentThemeSchema?.colorScheme === 'dark' ? 'dark' : 'light';
    const theme = hostTheme;

    return (
      <div style={{ width: '100%', height: cardValue?.cardHeight || 560 }}>
        <DrawnixBoardCore value={cardValue} locale={locale} theme={theme} readOnly />
      </div>
    );
  }
}

export default DrawingBoardViewer;
