define([
    'preact',
    'htm',
    'components/KBaseUILink',

    // for effect
    'css!./CatalogIndex.css',
    'bootstrap'
], (
    preact,
    htm,
    KBaseUILink
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    class CatalogIndex extends Component {
        renderDeveloperRow({developer}) {
            if (developer) {
                return html`
                <div className="-developer">For Developers</div>
                `;
            }
        }

        renderAdminRow({admin}) {
            if (admin) {
                return html`
                <div className="-admin">For Admins</div>
                `;
            }
        }

        renderIndexURL({url, path, title}) {
            if (path) {
                return html`<${KBaseUILink} runtime=${this.props.runtime} path=${`catalog/${path}`}>${title}</>`;
            }
            return html`<a href="${url}" target="_blank">${title} <span className="fa fa-link" /></a>`;
        }

        renderIndexItem(indexSpec) {
            return html`
                <div className="-row">
                    <h4>${this.renderIndexURL(indexSpec)}</h4>
                    ${this.renderDeveloperRow(indexSpec)}
                    ${this.renderAdminRow(indexSpec)}
                    <p>${indexSpec.description}</p>
                </div>
            `;
        }
        renderIndex() {
            return this.props.index
                .filter((indexSpec) => {
                    if (indexSpec.admin) {
                        if (!this.props.isAdmin) {
                            return false;
                        }
                    }
                    if (indexSpec.developer) {
                        if (!this.props.isDeveloper) {
                            return false;
                        }
                    }
                    if (indexSpec.authenticationRequired) {
                        if (!this.props.isAuthenticated) {
                            return false;
                        }
                    }
                    return true;
                })
                .map((indexSpec) => {
                    return this.renderIndexItem(indexSpec);
                });
        }
        render() {
            return html`
            <div className="CatalogIndex">
               ${this.renderIndex()}
            </div>
            `;
        }
    }

    return CatalogIndex;
});