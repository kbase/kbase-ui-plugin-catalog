define([
    'preact',
    'htm',

    'css!./BackToCatalogLink.css'
], (
    preact,
    htm
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    class BackToCatalogLink extends Component {
        render() {
            const url = `${this.props.runtime.basePath()}#catalog/apps`;
            return html`<div className="BackToCatalogLink">
                <a href=${url} target="_parent">
                    <i class="fa fa-chevron-left" /> back to the App Catalog
                </a>
            </div>`;
        }
    }

    return BackToCatalogLink;
});