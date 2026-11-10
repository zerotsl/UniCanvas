/**
 * Standalone renderer bootstrap.
 *
 * The canvas UI is the very same `client.js` panel the plugin mounts inside the
 * DeepSeek Harness GUI. Here it is given a minimal host context (locale stub +
 * slot registry) and mounted full-window with the standalone JSON API as its
 * backend.
 */
(function bootstrap() {
  const rootElement = document.getElementById('app-root');
  const errorElement = document.getElementById('app-error');

  const showError = (error) => {
    errorElement.hidden = false;
    errorElement.textContent = `通用画布启动失败：\n\n${error && error.stack ? error.stack : String(error)}`;
  };

  window.addEventListener('error', (event) => showError(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => showError(event.reason));

  const definition = window.__DSIC_DEF__;
  if (!definition || typeof definition.factory !== 'function') {
    showError(new Error('client.js 没有注册画板模块（window.__DSIC_DEF__ 为空）'));
    return;
  }

  const React = window.React;
  const ReactDOM = window.ReactDOM;
  if (!React || !ReactDOM) {
    showError(new Error('React / ReactDOM 未加载'));
    return;
  }

  Promise.resolve(definition.factory((name) => {
    if (name === 'react') return React;
    throw new Error(`unexpected require(${JSON.stringify(name)})`);
  }))
    .then((plugin) => {
      if (!plugin || typeof plugin.apply !== 'function') throw new Error('画板插件没有 apply()');

      let Panel = null;
      const localeStub = {
        getSnapshot: () => ({ active: 'zh-CN', current: 'zh-CN' }),
        getLocale: () => 'zh-CN',
        subscribe: () => () => {},
      };
      const ctx = {
        get(name) {
          if (name === 'locale') return localeStub;
          return undefined;
        },
        slots: {
          inject(_key, callback) {
            if (typeof callback !== 'function') return () => {};
            const disposer = callback();
            return typeof disposer === 'function' ? disposer : () => {};
          },
          register(options, component) {
            if (options && options.name === 'main' && typeof component === 'function') Panel = component;
            return () => {};
          },
        },
      };

      plugin.apply(ctx);
      if (!Panel) throw new Error('画板主面板没有注册（slots.register name=main）');
      const ReactRoot = ReactDOM.createRoot(rootElement);
      ReactRoot.render(React.createElement(Panel, {}));

      // Standalone chrome: data-file hint + one-click import of the DSH library.
      const banner = document.getElementById('app-banner');
      const pathElement = document.getElementById('app-banner-path');
      const importButton = document.getElementById('app-import');
      if (banner) banner.hidden = false;

      const api = (action, payload) =>
        fetch('api/canvas.doc', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, payload: payload ?? {} }),
        })
          .then((response) => response.json())
          .then((body) => {
            if (!body || body.ok !== true) throw new Error(body?.error?.message ?? '调用失败');
            return body.value;
          });

      api('data-info', {})
        .then((info) => {
          if (pathElement) {
            pathElement.textContent = info.file;
            pathElement.title = `数据：${info.file}\n画板：${info.dshFile}`;
          }
          if (importButton) {
            importButton.disabled = !info.dshExists;
            importButton.title = info.dshExists ? `从 ${info.dshFile} 导入` : '没有找到可导入的画板数据';
          }
        })
        .catch(() => {});

      if (importButton) {
        importButton.addEventListener('click', async () => {
          importButton.disabled = true;
          importButton.textContent = '导入中…';
          try {
            await api('import-dsh', {});
            window.location.reload();
          } catch (error) {
            errorElement.hidden = false;
            errorElement.textContent = `导入失败：${error && error.message ? error.message : String(error)}`;
            importButton.disabled = false;
            importButton.textContent = '导入画板';
          }
        });
      }
    })
    .catch(showError);
})();
