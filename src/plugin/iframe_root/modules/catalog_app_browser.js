define(['bluebird', 'kb_common/dom', 'kb_common/html', 'kbaseUI/widget/widgetSet'], (
    Promise,
    DOM,
    html,
    WidgetSet
) => {
    const t = html.tag,
        div = t('div');

    function make(config) {
        let mount,
            container;

        const  runtime = config.runtime;
        const widgetSet = new WidgetSet({
            runtime,
            widgetManager: runtime.service('widget').widgetManager
        });

        // Mini widget manager
        // TODO: the jquery name should be stored in the widget definition not here.
        function render() {
            // the catalog home page is simple the catalog browser
            return div({
                id: widgetSet.addWidget('catalog_browser', {
                    jqueryName: 'KBaseCatalogBrowser',
                    jquery_name: 'KBaseCatalogBrowser'
                }),
                dataKBTesthookPlugin: 'catalog'
            });
        }

        const layout = render();

        // Widget Interface Implementation

        function init(config) {
            return Promise.try(() => {
                return widgetSet.init(config);
            });
        }
        function attach(node) {
            runtime.send('ui', 'setTitle', 'App Catalog');
            mount = node;
            container = mount.appendChild(DOM.createElement('div'));
            container.innerHTML = layout;
            // mount.appendChild(container);
            return widgetSet.attach();
        }
        function start(params) {
            return Promise.try(() => {
                return widgetSet.start(params);
            });
        }

        function stop() {
            return widgetSet.stop();
        }

        function detach() {
            runtime.send('ui', 'setTitle', '');
            return widgetSet.detach()
                .then(() => {
                    if (container) {
                        container.innerHTML = '';
                    }
                });
        }

        function destroy() {
            return widgetSet.destroy();
        }

        // Widget Interface
        return {
            init,
            attach,
            start,
            stop,
            detach,
            destroy
        };
    }

    return {
        make
    };
});
