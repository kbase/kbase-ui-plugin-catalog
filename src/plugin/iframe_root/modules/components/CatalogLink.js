define([
    'preact',
    'htm',
], (
    preact,
    htm
) => {
    const {h, Component} = preact;
    const html = htm.bind(h);

    class CatalogLink extends Component {
        render() {
            const url = `${this.props.runtime.basePath()}#catalog/${this.props.path}`;
            return html`<a href=${url} target="_parent">
                ${this.props.children}
            </a>`;
        }
    }

    return CatalogLink;
});