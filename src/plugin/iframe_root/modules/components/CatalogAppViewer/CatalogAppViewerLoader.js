define([
    'preact',
    'htm',
    'kb_service/client/narrativeMethodStore',
    'kb_service/client/catalog',
    'components/Loading',
    'components/ErrorAlert',
    './CatalogAppViewer',

    // for effect
    'bootstrap'
], (
    preact,
    htm,
    NarrativeMethodStore,
    Catalog,
    Loading,
    ErrorAlert,
    CatalogAppViewer
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    const GITHUB = 'https://github.com/';

    class CatalogAppViewerLoader extends Component {

        constructor(props) {
            super(props);

            this.isLegacyMethod = false;
            this.isLegacyApp = false;
            if (props.namespace) {
                if (props.namespace === 'l.m') {
                    this.isLegacyMethod = true;
                } else if (props.namespace === 'l.a') {
                    // for now, forward to old style page
                    this.isLegacyApp = true;

                    // TODO: what is "narrativestore"???
                    // TODO: enable warnings; may not be applicable any longer
                    // this.$elem.append(
                    //     `&nbsp Legacy apps not supported on this page yet. Go here for now:<a href="/#narrativestore/app/${props.id}" target="_parent">${props.id}</a>`
                    // );
                    // return this;
                }
            } else {
                // assume legacy method if no namespace given
                this.isLegacyMethod = true;
                props.namespace = 'l.m';
            }

            this.state = {
                status: 'NONE'
            };
        }

        componentDidMount() {
            this.loadData();
        }

        async getAppFullInfo(module_name, id, tag) {
            const params = {};
            if (this.isLegacyMethod) {
                params.ids = [id];
            } else if (this.isLegacyApp) {
                return;
            } else {
                // new sdk method
                params.ids = [`${module_name}/${id}`];
                params.tag = tag;
            }

            const nms = new NarrativeMethodStore(this.props.runtime.getConfig('services.narrative_method_store.url'), {
                token: this.props.runtime.service('session').getAuthToken()
            });

            return nms.get_method_full_info(params).then((info_list) => {
                return info_list[0];
            });
        }

        async getAppSpec(module_name, id, tag) {
            const params = {};
            if (this.isLegacyMethod) {
                params.ids = [id];
            } else if (this.isLegacyApp) {
                return;
            } else {
                // new sdk method
                params.ids = [`${module_name}/${id}`];
                params.tag = tag;
            }

            const nms = new NarrativeMethodStore(this.props.runtime.getConfig('services.narrative_method_store.url'), {
                token: this.props.runtime.service('session').getAuthToken()
            });

            return nms.get_method_spec(params).then((specs) => {
                // A bit of a hack to bury setting the page title here.
                if (specs[0]) {
                    this.props.runtime.send('ui', 'setTitle', [specs[0].info.name, 'App Catalog'].join(' | '));
                }
                return specs[0];
            });
        }

        async getFavorites(module_name, id, username) {
            const catalog = new Catalog(this.props.runtime.getConfig('services.catalog.url'), {
                token: this.props.runtime.service('session').getAuthToken()
            });
            if (this.isLegacyApp) {
                return null;
            }
            // const params = {};
            // if (this.isLegacyMethod) {
            //     params.id = id;
            // } else {
            //     params.id = id;
            //     params.
            // }

            const params = {
                module_name, id
            };

            const users = await catalog.list_app_favorites(params);

            return {
                count: users.length,
                isFavorite: username in users
            };

        }

        async getRunStats(id) {
            const catalog = new Catalog(this.props.runtime.getConfig('services.catalog.url'), {
                token: this.props.runtime.service('session').getAuthToken()
            });
            const [stats] = await catalog.get_exec_aggr_stats({
                full_app_ids: [id]
            });
            return stats;
        }

        async getModuleInfo() {
            if (this.isLegacyMethod)
                throw new Error('Legacy method unsupported');

            if (this.isLegacyApp)
                return;

            const moduleSelection = {
                module_name: this.props.namespace
            };
            if (this.props.tag) {
                moduleSelection.version = this.props.tag;
            }
            const catalog = new Catalog(this.props.runtime.getConfig('services.catalog.url'), {
                token: this.props.runtime.service('session').getAuthToken()
            });

            const info = await catalog.get_module_version(moduleSelection);
            let tag = this.props.tag;
            if (!tag) {
                tag = info['git_commit_hash'];
            }

            const stateValue = {
                tag
            };

            // make sure the ID and module name case is correct
            const idTokens = this.props.id.split('/');
            if (idTokens.length == 2) {
                stateValue.id = `${info.module_name}/${idTokens[1]}`;
            } else {
                stateValue.id = this.props.id;
            }
            const module_name = info.module_name;

            // TODO: Answer this: Is all this munging of the git url necessary?
            const git_url = info.git_url;

            // TODO: yuck! should be separate property.
            info['original_git_url'] = info.git_url;

            let isGithub = false;
            if (git_url.substring(0, GITHUB.length) === GITHUB) {
                isGithub = true;
                // if it ends with .git and is github, truncate so we get the basic url
                if (git_url.indexOf('.git', git_url.length - '.git'.length) !== -1) {
                    info.git_url = git_url.substring(0, git_url.length - '.git'.length);
                }
            }

            // Get app full info
            const appFullInfo = await this.getAppFullInfo(module_name, stateValue.id, tag);

            const appSpec = await this.getAppSpec(module_name, stateValue.id, tag);

            const favorites = await this.getFavorites(module_name, stateValue.id, this.props.runtime.service('session').getUsername());

            const runStats = await this.getRunStats(appFullInfo.id);

            return {
                ...stateValue,
                module_name,
                isGithub,
                moduleDetails: {
                    info,
                    versions: null
                },
                appFullInfo,
                appSpec,
                favorites,
                runStats
            };
        }

        async loadData() {
            this.setState({
                status: 'PENDING'
            });
            try {
                const username = this.props.runtime.service('session').getUsername();
                const isAuthenticated = !!username;
                const roles = this.props.runtime.service('session').getRoles();
                const isDeveloper = (roles !== null && roles.includes('DevToken'));
                const catalog = new Catalog(this.props.runtime.getConfig('services.catalog.url'), {
                    token: this.props.runtime.service('session').getAuthToken()
                });
                const isAdmin = (await catalog.is_admin(username)) === 1;

                const appState = await this.getModuleInfo();

                this.setState({
                    status: 'SUCCESS',
                    value: {
                        isAdmin,
                        isDeveloper,
                        isAuthenticated,
                        appState
                    }
                });
            } catch (ex) {
                console.error(ex);
                this.setState({
                    status: 'ERROR',
                    message: ex.message
                });
            }
        }

        async toggleFavorite() {
            const params = (() => {
                if (this.state.status !== 'SUCCESS') {
                    return;
                }
                const {appFullInfo, moduleDetails} = this.state.value.appState;
                if (this.isLegacyMethod) {
                    return {
                        id: appFullInfo.id
                    };
                } else if (this.isLegacyApp) {
                    return;
                }
                return {
                    id: appFullInfo.id.split('/')[1],
                    module_name: moduleDetails.info.module_name
                };
            })();
            if (!params) {
                return;
            }
            try {
                const catalog = new Catalog(this.props.runtime.getConfig('services.catalog.url'), {
                    token: this.props.runtime.service('session').getAuthToken()
                });
                const favorites = this.state.value.appState.favorites;
                const newFavorites = await (async () => {
                    if (favorites.isFavorite) {
                        await catalog.remove_favorite(params);
                        return {
                            count: favorites.count - 1,
                            isFavorite: false
                        };
                    }
                    await catalog.add_favorite(params);
                    return {
                        count: favorites.count + 1,
                        isFavorite: true
                    };
                })();

                this.setState({
                    ...this.state,
                    value: {
                        ...this.state.value,
                        appState: {
                            ...this.state.value.appState,
                            favorites: newFavorites
                        }
                    }
                });
            } catch (ex) {
                console.error(ex);
            }
        }

        renderLoading() {
            return html`<${Loading} message="Loading..." />`;
        }

        renderError(message) {
            return html`<${ErrorAlert} message=${message} />`;
        }

        renderSuccess(value) {
            const nms_url = this.props.runtime.config('services.narrative_method_store.url');
            const nms_image_url = this.props.runtime.config('services.narrative_method_store.image_url');
            return html`<${CatalogAppViewer} ...${value} nms_url=${nms_url} nms_image_url=${nms_image_url} toggleFavorite=${this.toggleFavorite.bind(this)}/>`;
        }

        renderState() {
            switch (this.state.status) {
            case 'NONE':
            case 'PENDING':
                return this.renderLoading();
            case 'ERROR':
                return this.renderError(this.state.message);
            case 'SUCCESS':
                return this.renderSuccess(this.state.value);
            }
        }

        render() {
            return this.renderState();
        }
    }

    return CatalogAppViewerLoader;
});