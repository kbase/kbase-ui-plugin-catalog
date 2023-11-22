define([
    'bluebird',
    'kb_common/dom',
    'kb_common/html',
    'kb_widget/widgetSet'
], (Promise, DOM, html, WidgetSet) => {

    function widget(config) {
        var mount, container, runtime = config.runtime,
            widgetSet = WidgetSet.make({runtime: runtime}),
            layout;

        // Mini widget manager
        // TODO: the jquery name should be stored in the widget definition not here.
        function render() {
            // the catalog home page is simple the catalog browser
            const div=html.tag('div');
            return div({
                id: widgetSet.addWidget('catalog_stats_widget',
                    {
                        jqueryName: 'KBaseCatalogStats',
                        jquery_name:'KBaseCatalogStats'
                    })
            });
        }

        layout = render();

        // Widget Interface Implementation

        function init(config) {
            return Promise.try(function () {
                return widgetSet.init(config);
            });
        }
        function attach(node) {
            runtime.send('ui', 'setTitle', 'Job Run Statistics');
            return Promise.try(function () {
                mount = node;
                container = mount.appendChild(DOM.createElement('div'));
                container.innerHTML = layout;
                // mount.appendChild(container);
                return widgetSet.attach();
            });
        }
        function start(params) {
            return Promise.try(function () {
                return widgetSet.start(params);
            });
        }
        function run(params) {
            return Promise.try(function () {
                return widgetSet.run(params);
            });
        }
        function stop() {
            return Promise.try(function () {
                return widgetSet.stop();
            });
        }
        function detach() {
            runtime.send('ui', 'setTitle', '');
            return Promise.try(function () {
                return widgetSet.detach();
            });
        }
        function destroy() {
            return Promise.try(function () {
                return widgetSet.destroy();
            });
        }

        // Widget Interface
        return {
            init: init,
            attach: attach,
            start: start,
            run: run,
            stop: stop,
            detach: detach,
            destroy: destroy
        };
    }

    return {
        make: function (config) {
            return widget(config);
        }
    };

});