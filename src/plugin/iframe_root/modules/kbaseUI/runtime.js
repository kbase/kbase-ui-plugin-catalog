define([
    'bluebird',
    'jquery',
    'kb_lib/props',
    'kb_lib/messenger',
    './widget/manager',
    './services/session',
    './services/widget',
    'europaSupport'
], (Promise, $, props, Messenger, WidgetManager, SessionService, WidgetService, {europaURL, otherUIURL, kbaseUIURL}) => {
    class Runtime {
        constructor({authorization, token, username, config, pluginConfig}) {
            this.token = token;
            this.username = username;
            this.widgetManager = new WidgetManager({
                baseWidgetConfig: {
                    runtime: this
                }
            });
            this.authorization = authorization;

            this.configDb = new props.Props({data: config});

            this.pluginPath = `/modules/plugins/${pluginConfig.package.name}/iframe_root`;
            this.pluginResourcePath = `${this.pluginPath}/resources`;

            this.messenger = new Messenger();

            this.heartbeatTimer = null;

            this.services = {
                session: new SessionService({runtime: this}),
                widget: new WidgetService({runtime: this})
            };
        }

        config(path, defaultValue) {
            return this.configDb.getItem(path, defaultValue);
        }

        getConfig(path, defaultValue) {
            return this.config(path, defaultValue);
        }

        basePath() {
            return this.configDb.getItem('deploy.basePath', '/');
        }

        catalogPath(path) {
            return `${this.basePath()}#catalog/${path}`;
        }

        catalogNavigate(path) {
            window.parent.location.href = this.catalogPath(path);
        }

        kbaseUINavigate(path) {
            window.parent.location.href = this.$makeCatalogURL(path);
        }

        $catalogLink(path, label, options = {}) {
            const $link = $(document.createElement('a'))
                .attr('href', `${this.basePath()}#catalog/${path}`)
                .attr('target', '_parent');

            if (options.icon) {
                $link.append($('<span>')
                    .addClass(`fa fa-${options.icon}`));
            }

            $link.append($('<span> </span>'));
            $link.append($('<span>').text(label));

            if (options.stopPropagation) {
                $link.on('click', (e) => {e.stopPropagation();});
            }

            return $link;
        }

        /**
         * Dedicated to producing an anchor link directly to a non-kbase-ui kbase ui -
         * Europa, narrative, etc.
         *
         * @param {*} path
         * @param {*} label
         * @param {*} options
         * @returns
         */
        $europaUILink(path, label, options={}) {
            const url = otherUIURL({path});
            const $link = $(document.createElement('a'))
                .attr('href', url.toString())
                .text(label);

            if (typeof options.newWindow === 'undefined' || options.newWindow) {
                $link.attr('target', '_blank');
            } else {
                $link.attr('target', '_top');
            }

            if (options.stopPropagation) {
                $link.on('click', (e) => {e.stopPropagation();});
            }

            return $link;
        }

        /**
         * Dedicated to links within kbase-ui, including self-links within the catalog plugin.
         *
         * @param {*} path
         * @param {*} label
         * @param {*} options
         * @returns A jquery object wrapping an anchor link to a kbase-ui endpoint.
         */
        $kbaseUILink(hash, label, options={}) {
            const url = kbaseUIURL(hash);
            const $link = $(document.createElement('a'))
                .attr('href', url.toString())
                .attr('target', '_parent');

            if (options.icon) {
                $link.append($('<span>')
                    .addClass(`fa fa-${options.icon}`));
            }

            $link.append($('<span> </span>'));
            $link.append($('<span>').text(label));

            if (options.stopPropagation) {
                $link.on('click', (e) => {e.stopPropagation();});
            }

            return $link;
        }

        /**
         * Creates a jQuery HTML anchor link with for a kbase-ui endpoint, via the
         * Europa top level ui. The only useful such use-case is opening such a
         * link in a new window. See $kbaseUILink above for the case of opening a plugin
         * or other kbase-ui link via kbase-ui itself.
         *
         * @param {*} hash
         * @param {*} label
         * @param {*} options
         * @returns
         */
        $europaKBaseUILink(hash, label, options={}) {
            const url = europaURL({hash}, true);
            const $link = $(document.createElement('a'))
                .attr('href', url.toString())
                .attr('target', '_blank');

            if (options.icon) {
                $link.append($('<span>')
                    .addClass(`fa fa-${options.icon}`));
            }

            $link.append($('<span> </span>'));
            $link.append($('<span>').text(label));

            if (options.stopPropagation) {
                $link.on('click', (e) => {e.stopPropagation();});
            }

            return $link;
        }

        $backTo(path, label) {
            const $path = path === null ? 'catalog' : `catalog/${path}`;
            const $link = this.$kbaseUILink(
                $path,
                `back to the ${label}`,
                {icon: 'chevron-left'});
            return $('<div>')
                .addClass('kbcb-back-link')
                .append($link);
        }

        $backToAppCatalog() {
            return this.$backTo('apps', 'App Catalog');
        }

        $backToModuleCatalog() {
            return this.$backTo('modules', 'Module Catalog');
        }

        $backToCatalogIndex() {
            return this.$backTo(null, 'Catalog Index');
        }

        $backToFunctionCatalog() {
            return this.$backTo('functions', 'Function Catalog');
        }

        service(name) {
            switch (name) {
            case 'session':
                return this.services.session;
            case 'widget':
                return this.services.widget;
            }
        }

        getService(name) {
            return this.service(name);
        }

        send(channel, message, data) {
            this.messenger.send({channel, message, data});
        }

        receive(channel, message, handler) {
            return this.messenger.receive({channel, message, handler});
        }

        recv(channel, message, handler) {
            return this.receive(channel, message, handler);
        }

        drop(subscription) {
            this.messenger.unreceive(subscription);
        }

        start() {
            return Promise.try(() => {
                this.heartbeatTimer = window.setInterval(() => {
                    this.send('app', 'heartbeat', {time: new Date().getTime()});
                }, 1000);
                return this.services.session.start();
            });
        }

        stop() {
            return Promise.try(() => {
                window.clearInterval(this.heartbeatTimer);

                return this.services.session.stop();
            });
        }
    }

    return Runtime;
});
