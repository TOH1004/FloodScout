const { spawn } = require('child_process');

async function testPage() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5173/');
    const page = await listRes.json();
    console.log('Page target:', page.webSocketDebuggerUrl);

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    
    await new Promise((resolve) => {
      ws.onopen = () => resolve();
    });

    let id = 1;
    function send(method, params = {}) {
      const msgId = id++;
      return new Promise((resolve) => {
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === msgId) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
      } else if (data.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    
    console.log('Waiting 3 seconds for page to settle...');
    await new Promise(r => setTimeout(r, 3000));

    // Test clicking buttons
    const evalResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          return buttons.map(b => ({
            tag: b.tagName,
            text: b.innerText.trim(),
            href: b.getAttribute('href'),
            disabled: b.disabled,
            rect: b.getBoundingClientRect(),
            pointerEvents: window.getComputedStyle(b).pointerEvents,
            zIndex: window.getComputedStyle(b).zIndex
          }));
        })()
      `,
      returnByValue: true
    });

    console.log('Found buttons/links:', JSON.stringify(evalResult?.result?.value, null, 2));

    // Test clicking "Launch Dashboard"
    const clickTest = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const links = Array.from(document.querySelectorAll('a, button'));
          const launchBtn = links.find(l => l.innerText.includes('Launch Dashboard'));
          if (!launchBtn) return 'Launch Dashboard button NOT FOUND';
          const rect = launchBtn.getBoundingClientRect();
          const elemAtPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          const isCovered = elemAtPoint !== launchBtn && !launchBtn.contains(elemAtPoint);
          return {
            found: true,
            tag: launchBtn.tagName,
            href: launchBtn.getAttribute('href'),
            isCovered,
            elementCovering: isCovered ? (elemAtPoint?.tagName + '.' + elemAtPoint?.className) : null,
            canClick: true
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Launch button clickability test:', clickTest?.result?.value);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    chrome.kill();
  }
}

testPage();
