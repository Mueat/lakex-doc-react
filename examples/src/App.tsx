import { useState } from 'react';
import { LakexEditor } from '@dlient/lakex-doc-react';
// @ts-ignore
import '@dlient/lakex-doc-react/style.css';
// @ts-ignore
import './App.css';

function App() {
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState<'zh-cn' | 'en-us'>('zh-cn');
  const [content, setContent] = useState("{}")

  const handleContentChange = (contents: any[]) => {
    setContent(contents.find((c) => c.type === 'json').text)
    console.log('Content changed:', contents.find((c) => c.type === 'json').text);
  };

  return (
    <div style={{display: 'flex', height:'100vh', width: '100%'}}>
      <div className={`app-container ${isDark ? 'dark' : ''}`}>
        <div className="floating-controls">
          <button
            className="control-button"
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <select
            className="control-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'zh-cn' | 'en-us')}
          >
            <option value="zh-cn">中文</option>
            <option value="en-us">English</option>
          </select>
        </div>
        <div className="editor-container">
          <LakexEditor
            dark={isDark}
            language={language}
            onContentChange={handleContentChange}
          />
        </div>
      </div>
      <div style={{width: 500, height: '100vh'}}>
            <pre lang='json' style={{height: '100%', overflowY: 'scroll'}} dangerouslySetInnerHTML={{__html: JSON.stringify(content, null, 2)}}></pre>
      </div>
    </div>
  );
}

export default App;