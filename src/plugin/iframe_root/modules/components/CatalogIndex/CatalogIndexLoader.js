define([
    'preact',
    'htm',
    'kb_service/client/catalog',
    './CatalogIndex',
    'components/Loading',
    'components/ErrorAlert',
    'yaml!./CatalogIndex.yaml',

    // for effect
    'bootstrap'
], (
    preact,
    htm,
    Catalog,
    CatalogIndex,
    Loading,
    ErrorAlert,
    catalogIndex
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    class CatalogIndexLoader extends Component {

        constructor(props) {
            super(props);

            this.state = {
                status: 'NONE'
            };
        }

        componentDidMount() {
            this.loadData();
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
                this.setState({
                    status: 'SUCCESS',
                    isAdmin,
                    isDeveloper,
                    isAuthenticated
                });
            } catch (ex) {
                this.setState({
                    status: 'ERROR',
                    message: ex.message
                });
            }
        }

        renderLoading() {
            return html`<${Loading} message="Loading Catalog Index ..." />`;
        }

        renderError(message) {
            return html`<${ErrorAlert} message=${message} />`;
        }

        renderState() {
            switch (this.state.status) {
            case 'NONE':
            case 'PENDING':
                return this.renderLoading();
            case 'ERROR':
                return this.renderError(this.state.message);
            case 'SUCCESS':
                return html`<${CatalogIndex} 
                    runtime=${this.props.runtime}
                    index=${catalogIndex.index} 
                    isAdmin=${this.state.isAdmin} 
                    isDeveloper=${this.state.isDeveloper} 
                    isAuthenticated=${this.state.isAuthenticated} />`;
            }
        }

        render() {
            return this.renderState();
        }
    }

    return CatalogIndexLoader;
});