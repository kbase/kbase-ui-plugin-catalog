define([
    'bluebird',
    'jquery',
    'kb_lib/props',
    'kb_lib/messenger',
    './widget/manager',
    './services/session',
    './services/widget'
], (Promise, $, props, Messenger, WidgetManager, SessionService, WidgetService) => {
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

        $makeKBaseUILink(path, label, options = {}) {
            const $link = $(document.createElement('a'))
                .attr('href', `${this.basePath()}#${path}`)
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

        $europaUILink(path, label, options={}) {
            const $link = $(document.createElement('a'))
                .attr('href', `/#${path}`)
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

        $backTo(path, label) {
            const $path = path === null ? 'catalog' : `catalog/${path}`;
            const $link = this.$makeKBaseUILink(
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
